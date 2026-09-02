import { useThree } from '@react-three/fiber'
import { RigidBody, useAfterPhysicsStep } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box3, Quaternion, Sphere } from 'three'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import {
  ACCESSORY_SETTLE_TIMEOUT_MS,
  isAccessoryTransformWithinPhysicsBounds,
  parseAccessoryPhysics,
} from '../features/accessories/accessoryPhysics'
import type { AccessoryTransform, EquippedAccessoryInstance } from '../features/accessories/accessoryTypes'
import { accessoryBoundsFromDimensions, clampWorldPositionAboveGround } from '../features/placement/placementRules'
import {
  PEDESTAL_GROUND_Y,
  ROCK_SETTLE_TIMEOUT_MS,
  accessoryLocalToWorld,
  accessoryWorldToLocal,
} from '../features/rockMovement/rockMovementRules'
import type { RockPose, WorldAccessoryTransform } from '../features/rockMovement/rockMovementTypes'
import { disposeRockObject } from './rockResources'
import type { DisposalReport } from './rockResources'

interface AccessoryModelProps {
  instance: EquippedAccessoryInstance
  selected: boolean
  /** Legacy 10C prop kept for call-site compatibility. Gestures are no longer handled by this component. */
  editing: boolean
  rockPose: RockPose
  /** Legacy 10C prop kept for call-site compatibility. */
  rockObject?: Object3D | null
  compositionFrozen?: boolean
  globalSettling?: boolean
  /** Legacy 10C callback kept for call-site compatibility. */
  onSelect: (instanceId: string) => void
  /** Legacy 10C callback kept for call-site compatibility. */
  onTransformDraft?: (instanceId: string, transform: AccessoryTransform) => void
  onTransformCommit: (instanceId: string, transform: AccessoryTransform) => void
  onGlobalSettled?: (transform: WorldAccessoryTransform) => void
  onLoadStateChange?: ((instanceId: string, state: 'loading' | 'ready' | 'error', message?: string) => void) | undefined
  onDisposed?: ((instanceId: string, report: DisposalReport) => void) | undefined
}

function bodyWorldTransform(body: RapierRigidBody, instanceId: string, uniformScale: number): WorldAccessoryTransform {
  const position = body.translation()
  const rotation = body.rotation()
  const quaternion = new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w).normalize()
  return {
    instanceId,
    worldPosition: [position.x, position.y, position.z],
    worldRotation: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
    uniformScale,
  }
}

function transformKey(instance: EquippedAccessoryInstance) {
  return [
    ...instance.localPosition,
    ...instance.localRotation,
    instance.uniformScale,
  ].map((value) => Number(value).toFixed(5)).join('|')
}

export function AccessoryModel({
  instance,
  selected,
  rockPose,
  compositionFrozen = false,
  globalSettling = false,
  onTransformCommit,
  onGlobalSettled,
  onLoadStateChange,
  onDisposed,
}: AccessoryModelProps) {
  const [object, setObject] = useState<Object3D | null>(null)
  const [selectionRadius, setSelectionRadius] = useState(0.5)
  const [simulating, setSimulating] = useState(false)
  const bodyRef = useRef<RapierRigidBody>(null)
  const simulatingRef = useRef(false)
  const settlementInFlightRef = useRef(false)
  const handledUnsettledTransformRef = useRef<string | null>(null)
  const globalReportedRef = useRef(false)
  const disposedCallbackRef = useRef(onDisposed)
  const loadCallbackRef = useRef(onLoadStateChange)
  const invalidate = useThree((state) => state.invalidate)
  const physics = useMemo(() => parseAccessoryPhysics(instance.physics, instance.category), [instance.category, instance.physics])
  const groundBounds = useMemo(
    () => accessoryBoundsFromDimensions(instance.dimensions, instance.uniformScale),
    [instance.dimensions, instance.uniformScale],
  )

  const setPhysicsSimulating = useCallback((next: boolean) => {
    simulatingRef.current = next
    setSimulating(next)
  }, [])

  useEffect(() => {
    disposedCallbackRef.current = onDisposed
  }, [onDisposed])

  useEffect(() => {
    loadCallbackRef.current = onLoadStateChange
  }, [onLoadStateChange])

  useEffect(() => {
    const controller = new AbortController()
    const loader = new GLTFLoader()
    let active = true
    let loadedObject: Object3D | null = null

    loadCallbackRef.current?.(instance.id, 'loading')

    async function load() {
      try {
        const response = await fetch(instance.modelPath, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const buffer = await response.arrayBuffer()
        if (!active || controller.signal.aborted) return

        const assetUrl = new URL(instance.modelPath, window.location.href)
        const resourcePath = assetUrl.href.slice(0, assetUrl.href.lastIndexOf('/') + 1)
        const gltf = await loader.parseAsync(buffer, resourcePath)
        loadedObject = gltf.scene
        const box = new Box3().setFromObject(loadedObject)
        if (!box.isEmpty()) {
          const sphere = box.getBoundingSphere(new Sphere())
          setSelectionRadius(Math.max(0.08, sphere.radius))
        }

        if (!active || controller.signal.aborted) {
          const report = disposeRockObject(loadedObject)
          disposedCallbackRef.current?.(instance.id, report)
          loadedObject = null
          return
        }

        setObject(loadedObject)
        loadCallbackRef.current?.(instance.id, 'ready')
        invalidate()
      } catch (error) {
        if (!active || controller.signal.aborted) return
        const message = error instanceof Error ? error.message : 'Erreur de chargement inconnue.'
        loadCallbackRef.current?.(instance.id, 'error', message)
      }
    }

    void load()

    return () => {
      active = false
      controller.abort()
      if (loadedObject) {
        const report = disposeRockObject(loadedObject)
        disposedCallbackRef.current?.(instance.id, report)
      }
    }
  }, [instance.id, instance.modelPath, invalidate])

  const worldFromInstance = useCallback(
    () => accessoryLocalToWorld(instance.id, instance, rockPose),
    [instance, rockPose],
  )

  const enforceHardFloor = useCallback(() => {
    const body = bodyRef.current
    if (!body) return false
    const world = bodyWorldTransform(body, instance.id, instance.uniformScale)
    const grounded = clampWorldPositionAboveGround(
      world.worldPosition,
      world.worldRotation,
      groundBounds,
      PEDESTAL_GROUND_Y,
    )
    if (grounded[1] <= world.worldPosition[1] + 0.000001) return false

    body.setTranslation({ x: grounded[0], y: grounded[1], z: grounded[2] }, true)
    const velocity = body.linvel()
    if (velocity.y < 0) body.setLinvel({ x: velocity.x, y: 0, z: velocity.z }, true)
    invalidate()
    return true
  }, [groundBounds, instance.id, instance.uniformScale, invalidate])

  useAfterPhysicsStep(() => {
    if (simulatingRef.current || globalSettling) enforceHardFloor()
  })

  useEffect(() => {
    const body = bodyRef.current
    if (!body || simulatingRef.current || globalSettling) return
    const world = worldFromInstance()
    const position = { x: world.worldPosition[0], y: world.worldPosition[1], z: world.worldPosition[2] }
    const rotation = {
      x: world.worldRotation[0],
      y: world.worldRotation[1],
      z: world.worldRotation[2],
      w: world.worldRotation[3],
    }
    if (body.isKinematic()) {
      body.setNextKinematicTranslation(position)
      body.setNextKinematicRotation(rotation)
    } else {
      body.setTranslation(position, false)
      body.setRotation(rotation, false)
    }
    invalidate()
  }, [globalSettling, invalidate, rockPose, worldFromInstance])

  const startDynamicSettlement = useCallback(() => {
    settlementInFlightRef.current = false
    setPhysicsSimulating(true)
  }, [setPhysicsSimulating])

  useEffect(() => {
    if (!simulating || globalSettling) return
    const body = bodyRef.current
    if (!body) return
    body.setLinvel({ x: 0, y: -0.02, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    body.wakeUp()
    invalidate()
  }, [globalSettling, invalidate, simulating])

  const persistCurrentTransform = useCallback(() => {
    const body = bodyRef.current
    if (!body || settlementInFlightRef.current || !simulatingRef.current || globalSettling) return
    settlementInFlightRef.current = true
    enforceHardFloor()

    const local = accessoryWorldToLocal(bodyWorldTransform(body, instance.id, instance.uniformScale), rockPose)
    body.setLinvel({ x: 0, y: 0, z: 0 }, false)
    body.setAngvel({ x: 0, y: 0, z: 0 }, false)
    body.sleep()

    if (!isAccessoryTransformWithinPhysicsBounds(local.localPosition)) {
      const fallback = worldFromInstance()
      body.setTranslation({ x: fallback.worldPosition[0], y: fallback.worldPosition[1], z: fallback.worldPosition[2] }, false)
      body.setRotation({
        x: fallback.worldRotation[0],
        y: fallback.worldRotation[1],
        z: fallback.worldRotation[2],
        w: fallback.worldRotation[3],
      }, false)
    } else {
      handledUnsettledTransformRef.current = transformKey({ ...instance, ...local })
      onTransformCommit(instance.id, { ...local, physicsSettled: true })
    }

    setPhysicsSimulating(false)
    settlementInFlightRef.current = false
    invalidate()
  }, [enforceHardFloor, globalSettling, instance, invalidate, onTransformCommit, rockPose, setPhysicsSimulating, worldFromInstance])

  useEffect(() => {
    if (!simulating || globalSettling) return
    const timer = window.setTimeout(persistCurrentTransform, ACCESSORY_SETTLE_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [globalSettling, persistCurrentTransform, simulating])

  useEffect(() => {
    if (!object || instance.stabilizedAt !== null || compositionFrozen || globalSettling) return
    const body = bodyRef.current
    if (!body) return

    const nextKey = transformKey(instance)
    if (handledUnsettledTransformRef.current === nextKey) return
    handledUnsettledTransformRef.current = nextKey

    if (simulatingRef.current) {
      body.setLinvel({ x: 0, y: 0, z: 0 }, false)
      body.setAngvel({ x: 0, y: 0, z: 0 }, false)
      body.sleep()
      setPhysicsSimulating(false)
    }

    const world = worldFromInstance()
    body.setTranslation({ x: world.worldPosition[0], y: world.worldPosition[1], z: world.worldPosition[2] }, false)
    body.setRotation({
      x: world.worldRotation[0],
      y: world.worldRotation[1],
      z: world.worldRotation[2],
      w: world.worldRotation[3],
    }, false)

    if (physics.enabled && physics.dynamic) {
      startDynamicSettlement()
    } else {
      const grounded = clampWorldPositionAboveGround(
        world.worldPosition,
        world.worldRotation,
        groundBounds,
        PEDESTAL_GROUND_Y,
      )
      const local = accessoryWorldToLocal({ ...world, worldPosition: grounded }, rockPose)
      onTransformCommit(instance.id, { ...local, physicsSettled: true })
    }
  }, [
    compositionFrozen,
    globalSettling,
    groundBounds,
    instance,
    object,
    onTransformCommit,
    physics.dynamic,
    physics.enabled,
    rockPose,
    setPhysicsSimulating,
    startDynamicSettlement,
    worldFromInstance,
  ])

  useEffect(() => {
    if (instance.stabilizedAt == null || !simulatingRef.current || globalSettling) return
    const body = bodyRef.current
    if (!body) return
    const world = worldFromInstance()
    body.setLinvel({ x: 0, y: 0, z: 0 }, false)
    body.setAngvel({ x: 0, y: 0, z: 0 }, false)
    body.setTranslation({ x: world.worldPosition[0], y: world.worldPosition[1], z: world.worldPosition[2] }, false)
    body.setRotation({
      x: world.worldRotation[0],
      y: world.worldRotation[1],
      z: world.worldRotation[2],
      w: world.worldRotation[3],
    }, false)
    body.sleep()
    handledUnsettledTransformRef.current = null
    setPhysicsSimulating(false)
    invalidate()
  }, [globalSettling, instance.stabilizedAt, invalidate, setPhysicsSimulating, worldFromInstance])

  const reportGlobalSettlement = useCallback(() => {
    const body = bodyRef.current
    if (!body || !globalSettling || globalReportedRef.current) return
    globalReportedRef.current = true
    enforceHardFloor()
    body.setLinvel({ x: 0, y: 0, z: 0 }, false)
    body.setAngvel({ x: 0, y: 0, z: 0 }, false)
    body.sleep()
    onGlobalSettled?.(bodyWorldTransform(body, instance.id, instance.uniformScale))
    invalidate()
  }, [enforceHardFloor, globalSettling, instance.id, instance.uniformScale, invalidate, onGlobalSettled])

  useEffect(() => {
    globalReportedRef.current = false
    if (!globalSettling) return
    setPhysicsSimulating(false)
    const body = bodyRef.current
    if (body) {
      body.setLinvel({ x: 0, y: -0.02, z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      body.wakeUp()
    }
    const timer = window.setTimeout(reportGlobalSettlement, ROCK_SETTLE_TIMEOUT_MS)
    invalidate()
    return () => window.clearTimeout(timer)
  }, [globalSettling, invalidate, reportGlobalSettlement, setPhysicsSimulating])

  if (!object) return null

  const bodyType = globalSettling
    ? 'dynamic'
    : simulating && physics.dynamic
      ? 'dynamic'
      : compositionFrozen
        ? 'kinematicPosition'
        : 'fixed'
  const world = accessoryLocalToWorld(instance.id, instance, rockPose)
  const collider = physics.enabled ? physics.collider : 'hull'

  return (
    <RigidBody
      key={`${instance.id}-${instance.uniformScale.toFixed(4)}`}
      ref={bodyRef}
      type={bodyType}
      colliders={collider}
      position={world.worldPosition}
      quaternion={world.worldRotation}
      scale={instance.uniformScale}
      mass={physics.mass}
      friction={physics.friction}
      restitution={physics.restitution}
      linearDamping={physics.linearDamping}
      angularDamping={physics.angularDamping}
      gravityScale={globalSettling ? 1 : physics.gravityScale}
      ccd={globalSettling || physics.ccd}
      canSleep
      additionalSolverIterations={globalSettling || physics.dynamic ? 2 : 0}
      onSleep={() => {
        if (globalSettling) reportGlobalSettlement()
        else if (simulatingRef.current) persistCurrentTransform()
      }}
    >
      <primitive object={object} />
      {selected ? (
        <mesh scale={selectionRadius * 1.08} raycast={() => undefined} renderOrder={20}>
          <sphereGeometry args={[1, 20, 14]} />
          <meshBasicMaterial wireframe transparent opacity={0.2} depthTest={false} />
        </mesh>
      ) : null}
    </RigidBody>
  )
}

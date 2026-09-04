import { useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { ConvexHullCollider } from '@react-three/rapier'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box3, Sphere } from 'three'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { resolveAccessoryCollisionRuntime } from '../features/accessories/accessoryCollisionRuntime'
import {
  ACCESSORY_SETTLE_TIMEOUT_MS,
  parseAccessoryPhysics,
} from '../features/accessories/accessoryPhysics'
import type { EquippedAccessoryInstance } from '../features/accessories/accessoryTypes'
import { PlacementBody } from '../features/placement/PlacementBody'
import type { PlacementBodyPhysicsConfig } from '../features/placement/PlacementBody'
import type { PlacementBodyState } from '../features/placement/placementBodyState'
import { createConvexColliderParts } from '../features/placement/placementColliderGeometry'
import { constrainTransformToPedestal } from '../features/placement/placementConstraints'
import { createPlacementGeometry } from '../features/placement/placementGeometry'
import type { PlacementGeometry } from '../features/placement/placementGeometry'
import type { PlacementTransform } from '../features/placement/placementTypes'
import {
  ROCK_SETTLE_TIMEOUT_MS,
  accessoryLocalToWorld,
} from '../features/rockMovement/rockMovementRules'
import type { RockPose, WorldAccessoryTransform } from '../features/rockMovement/rockMovementTypes'
import { disposeRockObject } from './rockResources'
import type { DisposalReport } from './rockResources'

interface AccessoryModelProps {
  instance: EquippedAccessoryInstance
  selected: boolean
  rockPose: RockPose
  compositionFrozen?: boolean
  globalSettling?: boolean
  settlingRequested?: boolean
  onSelect?: (() => void) | undefined
  onSettledWorld?: ((instanceId: string, transform: PlacementTransform) => void) | undefined
  onGlobalSettled?: (transform: WorldAccessoryTransform) => void
  placementTransform?: PlacementTransform | null
  onPlacementGeometryReady?: (instanceId: string, geometry: PlacementGeometry | null) => void
  onLoadStateChange?: ((instanceId: string, state: 'loading' | 'ready' | 'error', message?: string) => void) | undefined
  onDisposed?: ((instanceId: string, report: DisposalReport) => void) | undefined
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
  settlingRequested = false,
  onSelect,
  onSettledWorld,
  onGlobalSettled,
  placementTransform = null,
  onPlacementGeometryReady,
  onLoadStateChange,
  onDisposed,
}: AccessoryModelProps) {
  const [object, setObject] = useState<Object3D | null>(null)
  const [selectionRadius, setSelectionRadius] = useState(0.5)
  const [placementGeometry, setPlacementGeometry] = useState<PlacementGeometry | null>(null)
  const [manualColliderParts, setManualColliderParts] = useState<Float32Array[] | null>(null)
  const reportedRecoveryRef = useRef<string | null>(null)
  const disposedCallbackRef = useRef(onDisposed)
  const loadCallbackRef = useRef(onLoadStateChange)
  const invalidate = useThree((state) => state.invalidate)
  const physics = useMemo(() => parseAccessoryPhysics(instance.physics, instance.category), [instance.category, instance.physics])
  const collisionPlan = useMemo(
    () => resolveAccessoryCollisionRuntime(instance.collision, physics.enabled ? physics.collider : 'hull'),
    [instance.collision, physics.collider, physics.enabled],
  )

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
    setObject(null)
    setPlacementGeometry(null)
    setManualColliderParts(null)
    onPlacementGeometryReady?.(instance.id, null)

    async function loadGltf(path: string) {
      const response = await fetch(path, { signal: controller.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status} pour ${path}`)
      const buffer = await response.arrayBuffer()
      if (!active || controller.signal.aborted) return null
      const assetUrl = new URL(path, window.location.href)
      const resourcePath = assetUrl.href.slice(0, assetUrl.href.lastIndexOf('/') + 1)
      const gltf = await loader.parseAsync(buffer, resourcePath)
      return gltf.scene
    }

    async function load() {
      try {
        loadedObject = await loadGltf(instance.modelPath)
        if (!loadedObject) return

        const nextPlacementGeometry = createPlacementGeometry(loadedObject)
        let nextManualColliderParts: Float32Array[] | null = null

        if (collisionPlan.mode === 'manual') {
          if (collisionPlan.geometrySource === 'proxy') {
            if (!collisionPlan.proxyPath) throw new Error('Collider proxy sans chemin runtime.')
            const proxyObject = await loadGltf(collisionPlan.proxyPath)
            if (!proxyObject) return
            try {
              nextManualColliderParts = createConvexColliderParts(proxyObject)
            } finally {
              disposeRockObject(proxyObject)
            }
          } else {
            nextManualColliderParts = createConvexColliderParts(loadedObject)
          }
        }

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
        setPlacementGeometry(nextPlacementGeometry)
        setManualColliderParts(nextManualColliderParts)
        onPlacementGeometryReady?.(instance.id, nextPlacementGeometry)
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
      onPlacementGeometryReady?.(instance.id, null)
      if (loadedObject) {
        const report = disposeRockObject(loadedObject)
        disposedCallbackRef.current?.(instance.id, report)
      }
    }
  }, [collisionPlan, instance.id, instance.modelPath, invalidate, onPlacementGeometryReady])

  const worldFromInstance = useCallback((): WorldAccessoryTransform => {
    if (placementTransform) {
      return {
        instanceId: instance.id,
        worldPosition: [...placementTransform.position],
        worldRotation: [...placementTransform.rotation],
        uniformScale: placementTransform.scale,
      }
    }
    return accessoryLocalToWorld(instance.id, instance, rockPose)
  }, [instance, placementTransform, rockPose])

  const recoveryRequested = instance.stabilizedAt === null
    && !compositionFrozen
    && !globalSettling
    && !settlingRequested
  const dynamicRecovery = recoveryRequested && physics.enabled && physics.dynamic
  const renderScale = placementTransform?.scale ?? instance.uniformScale
  const world = worldFromInstance()
  const bodyTransform: PlacementTransform = {
    position: [...world.worldPosition],
    rotation: [...world.worldRotation],
    scale: renderScale,
  }
  const bodyState: PlacementBodyState = globalSettling || settlingRequested || dynamicRecovery
    ? 'settling'
    : compositionFrozen
      ? 'editing'
      : 'fixed'
  const bodyPhysics = useMemo<PlacementBodyPhysicsConfig>(() => ({
    collider: collisionPlan.collider,
    mass: physics.mass,
    friction: physics.friction,
    restitution: physics.restitution,
    linearDamping: physics.linearDamping,
    angularDamping: physics.angularDamping,
    gravityScale: globalSettling ? 1 : physics.gravityScale,
    ccd: physics.ccd,
    settlingCcd: globalSettling || physics.ccd,
    baseSolverIterations: physics.dynamic ? 2 : 0,
    settlingSolverIterations: 2,
    settleTimeoutMs: globalSettling ? ROCK_SETTLE_TIMEOUT_MS : ACCESSORY_SETTLE_TIMEOUT_MS,
    settleLinearVelocityY: -0.02,
  }), [collisionPlan.collider, globalSettling, physics])

  useEffect(() => {
    if (!recoveryRequested) {
      reportedRecoveryRef.current = null
      return
    }
    if (!object || !placementGeometry || dynamicRecovery) return
    const key = transformKey(instance)
    if (reportedRecoveryRef.current === key) return
    reportedRecoveryRef.current = key
    const canonicalWorld = worldFromInstance()
    const safe = constrainTransformToPedestal({
      position: [...canonicalWorld.worldPosition],
      rotation: [...canonicalWorld.worldRotation],
      scale: instance.uniformScale,
    }, placementGeometry)
    onSettledWorld?.(instance.id, safe)
  }, [
    dynamicRecovery,
    instance,
    object,
    onSettledWorld,
    placementGeometry,
    recoveryRequested,
    worldFromInstance,
  ])

  const handleBodySettled = useCallback((transform: PlacementTransform) => {
    const settledWorld: WorldAccessoryTransform = {
      instanceId: instance.id,
      worldPosition: [...transform.position],
      worldRotation: [...transform.rotation],
      uniformScale: transform.scale,
    }
    if (globalSettling) {
      onGlobalSettled?.(settledWorld)
      return
    }
    if (!settlingRequested && !dynamicRecovery) return
    onSettledWorld?.(instance.id, transform)
  }, [dynamicRecovery, globalSettling, instance.id, onGlobalSettled, onSettledWorld, settlingRequested])

  const handleSelect = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!onSelect) return
    event.stopPropagation()
    onSelect()
  }, [onSelect])

  if (!object || !placementGeometry) return null
  if (collisionPlan.mode === 'manual' && !manualColliderParts) return null

  const selectionScale = selectionRadius * renderScale

  return (
    <>
      <PlacementBody
        bodyKey={`accessory:${instance.id}`}
        state={bodyState}
        transform={bodyTransform}
        geometry={placementGeometry}
        physics={bodyPhysics}
        onSettled={handleBodySettled}
      >
        {manualColliderParts?.map((vertices, index) => (
          <ConvexHullCollider key={`collider:${index}`} args={[vertices]} />
        ))}
        <primitive object={object} onClick={onSelect ? handleSelect : undefined} />
      </PlacementBody>

      {onSelect ? (
        <mesh
          position={bodyTransform.position}
          quaternion={bodyTransform.rotation}
          scale={selectionScale * 1.04}
          onClick={handleSelect}
          renderOrder={19}
        >
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      ) : null}

      {selected && onSelect ? (
        <mesh
          position={bodyTransform.position}
          quaternion={bodyTransform.rotation}
          scale={selectionScale * 1.08}
          raycast={() => undefined}
          renderOrder={20}
        >
          <sphereGeometry args={[1, 20, 14]} />
          <meshBasicMaterial wireframe transparent opacity={0.2} depthTest={false} />
        </mesh>
      ) : null}
    </>
  )
}

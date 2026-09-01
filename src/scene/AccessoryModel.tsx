import { useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box3, Mesh, Plane, Quaternion, Raycaster, Sphere, Vector3 } from 'three'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { ACCESSORY_POSITION_LIMIT } from '../features/accessories/accessoryPlacementRules'
import {
  ACCESSORY_CONTACT_CLEARANCE,
  ACCESSORY_SETTLE_TIMEOUT_MS,
  isAccessoryTransformWithinPhysicsBounds,
  parseAccessoryPhysics,
} from '../features/accessories/accessoryPhysics'
import type { AccessoryTransform, EquippedAccessoryInstance } from '../features/accessories/accessoryTypes'
import { disposeRockObject } from './rockResources'
import type { DisposalReport } from './rockResources'

interface AccessoryModelProps {
  instance: EquippedAccessoryInstance
  selected: boolean
  editing: boolean
  rockObject?: Object3D | null
  onSelect: (instanceId: string) => void
  onTransformCommit: (instanceId: string, transform: AccessoryTransform) => void
  onLoadStateChange?: ((instanceId: string, state: 'loading' | 'ready' | 'error', message?: string) => void) | undefined
  onDisposed?: ((instanceId: string, report: DisposalReport) => void) | undefined
}

interface DragState {
  pointerId: number
  plane: Plane
  worldOffset: Vector3
}

function clampPosition(value: number) {
  return Math.min(ACCESSORY_POSITION_LIMIT, Math.max(-ACCESSORY_POSITION_LIMIT, value))
}

function clampVector(position: Vector3) {
  return new Vector3(
    clampPosition(position.x),
    clampPosition(position.y),
    clampPosition(position.z),
  )
}

function pointerTarget(event: ThreeEvent<PointerEvent>) {
  const target = event.nativeEvent.target
  return target instanceof Element ? target : null
}

function bodyTransform(body: RapierRigidBody, uniformScale: number): AccessoryTransform {
  const position = body.translation()
  const rotation = body.rotation()
  const quaternion = new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w).normalize()
  return {
    localPosition: [position.x, position.y, position.z],
    localRotation: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
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

function constrainToRockSurface(
  worldTarget: Vector3,
  rockObject: Object3D | null | undefined,
  clearance: number,
) {
  if (!rockObject) return clampVector(worldTarget)

  const bounds = new Box3().setFromObject(rockObject)
  if (bounds.isEmpty()) return clampVector(worldTarget)
  const sphere = bounds.getBoundingSphere(new Sphere())
  const offset = worldTarget.clone().sub(sphere.center)
  const distance = offset.length()
  if (distance >= sphere.radius + clearance * 0.72) return clampVector(worldTarget)

  const direction = distance > 0.0001 ? offset.normalize() : new Vector3(0, 0, 1)
  const rayOrigin = sphere.center.clone().addScaledVector(direction, sphere.radius * 2.4 + clearance)
  const raycaster = new Raycaster(rayOrigin, direction.clone().negate(), 0, sphere.radius * 4 + clearance * 2)
  const surface = raycaster.intersectObject(rockObject, true)[0]?.point

  return clampVector(surface
    ? surface.clone().addScaledVector(direction, clearance + ACCESSORY_CONTACT_CLEARANCE)
    : sphere.center.clone().addScaledVector(direction, sphere.radius + clearance + ACCESSORY_CONTACT_CLEARANCE))
}

export function AccessoryModel({
  instance,
  selected,
  editing,
  rockObject,
  onSelect,
  onTransformCommit,
  onLoadStateChange,
  onDisposed,
}: AccessoryModelProps) {
  const [object, setObject] = useState<Object3D | null>(null)
  const [selectionRadius, setSelectionRadius] = useState(0.5)
  const [simulating, setSimulating] = useState(false)
  const bodyRef = useRef<RapierRigidBody>(null)
  const dragRef = useRef<DragState | null>(null)
  const simulatingRef = useRef(false)
  const settlementInFlightRef = useRef(false)
  const handledUnsettledTransformRef = useRef<string | null>(null)
  const disposedCallbackRef = useRef(onDisposed)
  const loadCallbackRef = useRef(onLoadStateChange)
  const camera = useThree((state) => state.camera)
  const invalidate = useThree((state) => state.invalidate)
  const physics = useMemo(() => parseAccessoryPhysics(instance.physics, instance.category), [instance.category, instance.physics])

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
        loadedObject.traverse((child) => {
          if (!(child instanceof Mesh)) return
          child.castShadow = true
          child.receiveShadow = true
        })

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

  const startDynamicSettlement = useCallback((body: RapierRigidBody) => {
    settlementInFlightRef.current = false
    setPhysicsSimulating(true)
    body.setLinvel({ x: 0, y: -0.02, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    body.wakeUp()
    invalidate()
  }, [invalidate, setPhysicsSimulating])

  useEffect(() => {
    const body = bodyRef.current
    if (!body || dragRef.current || simulatingRef.current) return

    const position = { x: instance.localPosition[0], y: instance.localPosition[1], z: instance.localPosition[2] }
    const rotation = {
      x: instance.localRotation[0],
      y: instance.localRotation[1],
      z: instance.localRotation[2],
      w: instance.localRotation[3],
    }
    if (body.isKinematic()) {
      body.setNextKinematicTranslation(position)
      body.setNextKinematicRotation(rotation)
    } else {
      body.setTranslation(position, false)
      body.setRotation(rotation, false)
    }
    invalidate()
  }, [instance.localPosition, instance.localRotation, instance.uniformScale, invalidate])

  const persistCurrentTransform = useCallback(() => {
    const body = bodyRef.current
    if (!body || settlementInFlightRef.current || !simulatingRef.current) return
    settlementInFlightRef.current = true

    const transform = bodyTransform(body, instance.uniformScale)
    body.setLinvel({ x: 0, y: 0, z: 0 }, false)
    body.setAngvel({ x: 0, y: 0, z: 0 }, false)
    body.sleep()

    if (!isAccessoryTransformWithinPhysicsBounds(transform.localPosition)) {
      body.setTranslation({
        x: instance.localPosition[0],
        y: instance.localPosition[1],
        z: instance.localPosition[2],
      }, false)
      body.setRotation({
        x: instance.localRotation[0],
        y: instance.localRotation[1],
        z: instance.localRotation[2],
        w: instance.localRotation[3],
      }, false)
    } else {
      handledUnsettledTransformRef.current = transformKey({ ...instance, ...transform })
      onTransformCommit(instance.id, { ...transform, physicsSettled: true })
    }

    setPhysicsSimulating(false)
    settlementInFlightRef.current = false
    invalidate()
  }, [
    instance,
    invalidate,
    onTransformCommit,
    setPhysicsSimulating,
  ])

  useEffect(() => {
    if (!simulating) return
    const timer = window.setTimeout(() => persistCurrentTransform(), ACCESSORY_SETTLE_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [persistCurrentTransform, simulating])

  useEffect(() => {
    if (!object || instance.stabilizedAt !== null) return
    const body = bodyRef.current
    if (!body || dragRef.current) return

    const nextKey = transformKey(instance)
    if (handledUnsettledTransformRef.current === nextKey) return
    handledUnsettledTransformRef.current = nextKey

    if (simulatingRef.current) {
      body.setLinvel({ x: 0, y: 0, z: 0 }, false)
      body.setAngvel({ x: 0, y: 0, z: 0 }, false)
      body.sleep()
      setPhysicsSimulating(false)
    }

    const constrained = constrainToRockSurface(
      new Vector3(...instance.localPosition),
      rockObject,
      selectionRadius * instance.uniformScale * 0.72,
    )
    body.setTranslation({ x: constrained.x, y: constrained.y, z: constrained.z }, false)
    body.setRotation({
      x: instance.localRotation[0],
      y: instance.localRotation[1],
      z: instance.localRotation[2],
      w: instance.localRotation[3],
    }, false)

    if (physics.enabled && physics.dynamic) {
      startDynamicSettlement(body)
    } else {
      onTransformCommit(instance.id, {
        localPosition: [constrained.x, constrained.y, constrained.z],
        localRotation: instance.localRotation,
        uniformScale: instance.uniformScale,
        physicsSettled: true,
      })
    }
  }, [
    instance,
    object,
    onTransformCommit,
    physics.dynamic,
    physics.enabled,
    rockObject,
    selectionRadius,
    setPhysicsSimulating,
    startDynamicSettlement,
  ])

  useEffect(() => {
    if (instance.stabilizedAt == null || !simulatingRef.current) return
    const body = bodyRef.current
    if (!body) return
    body.setLinvel({ x: 0, y: 0, z: 0 }, false)
    body.setAngvel({ x: 0, y: 0, z: 0 }, false)
    body.setTranslation({
      x: instance.localPosition[0],
      y: instance.localPosition[1],
      z: instance.localPosition[2],
    }, false)
    body.setRotation({
      x: instance.localRotation[0],
      y: instance.localRotation[1],
      z: instance.localRotation[2],
      w: instance.localRotation[3],
    }, false)
    body.sleep()
    handledUnsettledTransformRef.current = null
    setPhysicsSimulating(false)
    invalidate()
  }, [instance.localPosition, instance.localRotation, instance.stabilizedAt, invalidate, setPhysicsSimulating])

  const beginDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onSelect(instance.id)
    const body = bodyRef.current
    if (!editing || !selected || !body) return

    if (simulatingRef.current) {
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      setPhysicsSimulating(false)
    }

    const translation = body.translation()
    const worldPosition = new Vector3(translation.x, translation.y, translation.z)
    const normal = camera.getWorldDirection(new Vector3()).normalize()
    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, worldPosition)
    const hit = event.ray.intersectPlane(plane, new Vector3())
    if (!hit) return

    dragRef.current = {
      pointerId: event.pointerId,
      plane,
      worldOffset: worldPosition.clone().sub(hit),
    }
    pointerTarget(event)?.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: ThreeEvent<PointerEvent>) => {
    const drag = dragRef.current
    const body = bodyRef.current
    if (!drag || !body || drag.pointerId !== event.pointerId) return
    event.stopPropagation()

    const hit = event.ray.intersectPlane(drag.plane, new Vector3())
    if (!hit) return
    const requested = hit.add(drag.worldOffset)
    const constrained = constrainToRockSurface(
      requested,
      rockObject,
      selectionRadius * instance.uniformScale * 0.72,
    )
    body.setNextKinematicTranslation({ x: constrained.x, y: constrained.y, z: constrained.z })
    invalidate()
  }

  const finishDrag = (event: ThreeEvent<PointerEvent>) => {
    const drag = dragRef.current
    const body = bodyRef.current
    if (!drag || !body || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    dragRef.current = null
    const target = pointerTarget(event)
    if (target?.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)

    if (physics.enabled && physics.dynamic) {
      startDynamicSettlement(body)
      return
    }

    onTransformCommit(instance.id, { ...bodyTransform(body, instance.uniformScale), physicsSettled: true })
  }

  const cancelDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    event.stopPropagation()
    dragRef.current = null
    const body = bodyRef.current
    if (body) {
      body.setTranslation({
        x: instance.localPosition[0],
        y: instance.localPosition[1],
        z: instance.localPosition[2],
      }, false)
      body.setRotation({
        x: instance.localRotation[0],
        y: instance.localRotation[1],
        z: instance.localRotation[2],
        w: instance.localRotation[3],
      }, false)
      body.sleep()
      setPhysicsSimulating(false)
      invalidate()
    }
  }

  if (!object) return null

  const bodyType = simulating && physics.dynamic
    ? 'dynamic'
    : editing && selected ? 'kinematicPosition' : 'fixed'

  return (
    <RigidBody
      key={`${instance.id}-${instance.uniformScale.toFixed(4)}`}
      ref={bodyRef}
      type={bodyType}
      colliders={physics.enabled ? physics.collider : false}
      position={instance.localPosition}
      quaternion={instance.localRotation}
      scale={instance.uniformScale}
      mass={physics.mass}
      friction={physics.friction}
      restitution={physics.restitution}
      linearDamping={physics.linearDamping}
      angularDamping={physics.angularDamping}
      gravityScale={physics.gravityScale}
      ccd={physics.ccd}
      canSleep
      additionalSolverIterations={physics.dynamic ? 2 : 0}
      onSleep={() => {
        if (simulatingRef.current) persistCurrentTransform()
      }}
    >
      <primitive
        object={object}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
      />
      {selected ? (
        <mesh scale={selectionRadius * 1.08} raycast={() => undefined} renderOrder={20}>
          <sphereGeometry args={[1, 20, 14]} />
          <meshBasicMaterial wireframe transparent opacity={0.2} depthTest={false} />
        </mesh>
      ) : null}
    </RigidBody>
  )
}

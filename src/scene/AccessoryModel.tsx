import { useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box3, Plane, Quaternion, Raycaster, Sphere, Vector3 } from 'three'
import { Mesh } from 'three'
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
import {
  PEDESTAL_GROUND_Y,
  ROCK_SETTLE_TIMEOUT_MS,
  accessoryLocalToWorld,
  accessoryWorldToLocal,
  angleBetweenTouches,
  distanceBetweenTouches,
} from '../features/rockMovement/rockMovementRules'
import type { RockPose, WorldAccessoryTransform } from '../features/rockMovement/rockMovementTypes'
import { disposeRockObject } from './rockResources'
import type { DisposalReport } from './rockResources'

interface AccessoryModelProps {
  instance: EquippedAccessoryInstance
  selected: boolean
  editing: boolean
  rockPose: RockPose
  rockObject?: Object3D | null
  compositionFrozen?: boolean
  globalSettling?: boolean
  onSelect: (instanceId: string) => void
  onTransformDraft?: (instanceId: string, transform: AccessoryTransform) => void
  onTransformCommit: (instanceId: string, transform: AccessoryTransform) => void
  onGlobalSettled?: (transform: WorldAccessoryTransform) => void
  onLoadStateChange?: ((instanceId: string, state: 'loading' | 'ready' | 'error', message?: string) => void) | undefined
  onDisposed?: ((instanceId: string, report: DisposalReport) => void) | undefined
}

interface TouchPoint {
  x: number
  y: number
}

interface GestureState {
  pointers: Map<number, TouchPoint>
  startScale: number
  displayScale: number
  startDistance: number | null
  startAngle: number | null
  startRotation: Quaternion
  lastWorldPosition: Vector3
  lastWorldRotation: Quaternion
  surfaceNormal: Vector3
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

function directPlacement(
  event: ThreeEvent<PointerEvent>,
  rockObject: Object3D | null | undefined,
  clearance: number,
) {
  const candidates: Array<{ point: Vector3; normal: Vector3; distance: number }> = []
  if (rockObject) {
    rockObject.updateWorldMatrix(true, true)
    const raycaster = new Raycaster(event.ray.origin, event.ray.direction, 0, 100)
    const hit = raycaster.intersectObject(rockObject, true)[0]
    if (hit) {
      const normal = hit.face?.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
        ?? event.ray.direction.clone().negate().normalize()
      candidates.push({ point: hit.point.clone(), normal, distance: hit.distance })
    }
  }

  const ground = new Plane(new Vector3(0, 1, 0), -PEDESTAL_GROUND_Y)
  const groundPoint = event.ray.intersectPlane(ground, new Vector3())
  if (groundPoint) {
    candidates.push({
      point: groundPoint.clone(),
      normal: new Vector3(0, 1, 0),
      distance: groundPoint.distanceTo(event.ray.origin),
    })
  }

  candidates.sort((left, right) => left.distance - right.distance)
  const hit = candidates[0]
  if (!hit) return null
  return {
    position: hit.point.clone().addScaledVector(hit.normal, clearance + ACCESSORY_CONTACT_CLEARANCE),
    normal: hit.normal,
  }
}

export function AccessoryModel({
  instance,
  selected,
  editing,
  rockPose,
  rockObject,
  compositionFrozen = false,
  globalSettling = false,
  onSelect,
  onTransformDraft,
  onTransformCommit,
  onGlobalSettled,
  onLoadStateChange,
  onDisposed,
}: AccessoryModelProps) {
  const [object, setObject] = useState<Object3D | null>(null)
  const [selectionRadius, setSelectionRadius] = useState(0.5)
  const [simulating, setSimulating] = useState(false)
  const [displayScale, setDisplayScale] = useState(instance.uniformScale)
  const bodyRef = useRef<RapierRigidBody>(null)
  const gestureRef = useRef<GestureState | null>(null)
  const simulatingRef = useRef(false)
  const settlementInFlightRef = useRef(false)
  const handledUnsettledTransformRef = useRef<string | null>(null)
  const globalReportedRef = useRef(false)
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
    if (!gestureRef.current) setDisplayScale(instance.uniformScale)
  }, [instance.uniformScale])

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

  const worldFromInstance = useCallback(() => accessoryLocalToWorld(instance.id, instance, rockPose), [instance, rockPose])

  useEffect(() => {
    const body = bodyRef.current
    if (!body || gestureRef.current || simulatingRef.current || globalSettling) return
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
  }, [globalSettling, instance, invalidate, onTransformCommit, rockPose, setPhysicsSimulating, worldFromInstance])

  useEffect(() => {
    if (!simulating || globalSettling) return
    const timer = window.setTimeout(() => persistCurrentTransform(), ACCESSORY_SETTLE_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [globalSettling, persistCurrentTransform, simulating])

  useEffect(() => {
    if (!object || instance.stabilizedAt !== null || editing || compositionFrozen || globalSettling) return
    const body = bodyRef.current
    if (!body || gestureRef.current) return

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
      onTransformCommit(instance.id, {
        localPosition: instance.localPosition,
        localRotation: instance.localRotation,
        uniformScale: instance.uniformScale,
        physicsSettled: true,
      })
    }
  }, [
    compositionFrozen,
    editing,
    globalSettling,
    instance,
    object,
    onTransformCommit,
    physics.dynamic,
    physics.enabled,
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
    body.setLinvel({ x: 0, y: 0, z: 0 }, false)
    body.setAngvel({ x: 0, y: 0, z: 0 }, false)
    body.sleep()
    onGlobalSettled?.(bodyWorldTransform(body, instance.id, instance.uniformScale))
    invalidate()
  }, [globalSettling, instance.id, instance.uniformScale, invalidate, onGlobalSettled])

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

  const resetMultiTouchBaseline = (gesture: GestureState) => {
    const points = [...gesture.pointers.values()]
    if (points.length < 2) {
      gesture.startDistance = null
      gesture.startAngle = null
      gesture.startScale = gesture.displayScale
      gesture.startRotation.copy(gesture.lastWorldRotation)
      return
    }
    gesture.startDistance = Math.max(1, distanceBetweenTouches(points[0], points[1]))
    gesture.startAngle = angleBetweenTouches(points[0], points[1])
    gesture.startScale = gesture.displayScale
    gesture.startRotation.copy(gesture.lastWorldRotation)
  }

  const beginGesture = (event: ThreeEvent<PointerEvent>) => {
    if (!editing || globalSettling) return
    event.stopPropagation()
    onSelect(instance.id)
    const body = bodyRef.current
    if (!body) return

    if (simulatingRef.current) {
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      setPhysicsSimulating(false)
    }

    const translation = body.translation()
    const rotation = body.rotation()
    let gesture = gestureRef.current
    if (!gesture) {
      gesture = {
        pointers: new Map(),
        startScale: instance.uniformScale,
        displayScale: instance.uniformScale,
        startDistance: null,
        startAngle: null,
        startRotation: new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w).normalize(),
        lastWorldPosition: new Vector3(translation.x, translation.y, translation.z),
        lastWorldRotation: new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w).normalize(),
        surfaceNormal: camera.getWorldDirection(new Vector3()).negate().normalize(),
      }
      gestureRef.current = gesture
    }

    gesture.pointers.set(event.pointerId, { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY })
    if (gesture.pointers.size >= 2) resetMultiTouchBaseline(gesture)
    pointerTarget(event)?.setPointerCapture(event.pointerId)
  }

  const moveGesture = (event: ThreeEvent<PointerEvent>) => {
    const gesture = gestureRef.current
    const body = bodyRef.current
    if (!gesture || !body || !gesture.pointers.has(event.pointerId)) return
    event.stopPropagation()
    gesture.pointers.set(event.pointerId, { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY })

    const points = [...gesture.pointers.values()]
    if (points.length >= 2 && gesture.startDistance && gesture.startAngle !== null) {
      const distance = Math.max(1, distanceBetweenTouches(points[0], points[1]))
      const ratio = distance / gesture.startDistance
      const nextScale = Math.max(instance.scaleMin, Math.min(instance.scaleMax, gesture.startScale * ratio))
      const angle = angleBetweenTouches(points[0], points[1])
      const twist = angle - gesture.startAngle
      const twistRotation = new Quaternion().setFromAxisAngle(gesture.surfaceNormal, twist)
      const nextRotation = twistRotation.multiply(gesture.startRotation.clone()).normalize()
      gesture.displayScale = nextScale
      gesture.lastWorldRotation.copy(nextRotation)
      setDisplayScale(nextScale)
      body.setNextKinematicRotation({ x: nextRotation.x, y: nextRotation.y, z: nextRotation.z, w: nextRotation.w })
      invalidate()
      return
    }

    const hit = directPlacement(
      event,
      rockObject,
      selectionRadius * gesture.displayScale * 0.58,
    )
    if (!hit) return
    const clamped = clampVector(hit.position)
    gesture.lastWorldPosition.copy(clamped)
    gesture.surfaceNormal.copy(hit.normal)
    body.setNextKinematicTranslation({ x: clamped.x, y: clamped.y, z: clamped.z })
    invalidate()
  }

  const finishPointer = (event: ThreeEvent<PointerEvent>, cancelled: boolean) => {
    const gesture = gestureRef.current
    if (!gesture || !gesture.pointers.has(event.pointerId)) return
    event.stopPropagation()
    gesture.pointers.delete(event.pointerId)
    const target = pointerTarget(event)
    if (target?.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)

    if (cancelled) {
      if (gesture.pointers.size > 0) return
      gestureRef.current = null
      setDisplayScale(instance.uniformScale)
      const body = bodyRef.current
      const world = worldFromInstance()
      if (body) {
        body.setNextKinematicTranslation({ x: world.worldPosition[0], y: world.worldPosition[1], z: world.worldPosition[2] })
        body.setNextKinematicRotation({
          x: world.worldRotation[0],
          y: world.worldRotation[1],
          z: world.worldRotation[2],
          w: world.worldRotation[3],
        })
      }
      invalidate()
      return
    }

    if (gesture.pointers.size > 0) {
      resetMultiTouchBaseline(gesture)
      return
    }

    gestureRef.current = null
    const world: WorldAccessoryTransform = {
      instanceId: instance.id,
      worldPosition: [gesture.lastWorldPosition.x, gesture.lastWorldPosition.y, gesture.lastWorldPosition.z],
      worldRotation: [gesture.lastWorldRotation.x, gesture.lastWorldRotation.y, gesture.lastWorldRotation.z, gesture.lastWorldRotation.w],
      uniformScale: gesture.displayScale,
    }
    const local = accessoryWorldToLocal(world, rockPose)
    onTransformDraft?.(instance.id, local)
    setDisplayScale(gesture.displayScale)
    invalidate()
  }

  if (!object) return null

  const bodyType = globalSettling
    ? 'dynamic'
    : simulating && physics.dynamic
      ? 'dynamic'
      : editing || compositionFrozen
        ? 'kinematicPosition'
        : 'fixed'
  const world = accessoryLocalToWorld(instance.id, instance, rockPose)
  const visualScaleRatio = instance.uniformScale > 0 ? displayScale / instance.uniformScale : 1
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
      <group scale={visualScaleRatio}>
        <primitive
          object={object}
          onPointerDown={beginGesture}
          onPointerMove={moveGesture}
          onPointerUp={(event: ThreeEvent<PointerEvent>) => finishPointer(event, false)}
          onPointerCancel={(event: ThreeEvent<PointerEvent>) => finishPointer(event, true)}
        />
        {selected && editing ? (
          <mesh
            scale={selectionRadius * 1.4}
            onPointerDown={beginGesture}
            onPointerMove={moveGesture}
            onPointerUp={(event: ThreeEvent<PointerEvent>) => finishPointer(event, false)}
            onPointerCancel={(event: ThreeEvent<PointerEvent>) => finishPointer(event, true)}
          >
            <sphereGeometry args={[1, 20, 14]} />
            <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
          </mesh>
        ) : null}
      </group>
      {selected ? (
        <mesh scale={selectionRadius * 1.08 * visualScaleRatio} raycast={() => undefined} renderOrder={20}>
          <sphereGeometry args={[1, 20, 14]} />
          <meshBasicMaterial wireframe transparent opacity={0.2} depthTest={false} />
        </mesh>
      ) : null}
    </RigidBody>
  )
}
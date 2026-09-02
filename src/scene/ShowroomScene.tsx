import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { CuboidCollider, Physics, RigidBody, useAfterPhysicsStep } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Box3, MathUtils, PerspectiveCamera, Quaternion, Sphere, Vector3 } from 'three'
import type { Group, Object3D } from 'three'

import type { RockCatalogEntry } from '../content/rockCatalog'
import { ACCESSORY_WORLD_GRAVITY } from '../features/accessories/accessoryPhysics'
import { clampAccessoryTransform } from '../features/accessories/accessoryPlacementRules'
import type { AccessoryTransform, EquippedAccessoryInstance } from '../features/accessories/accessoryTypes'
import { constrainPlacementPosition } from '../features/placement/placementConstraints'
import type { PlacementGeometry } from '../features/placement/placementGeometry'
import type { PlacementTarget, PlacementTool } from '../features/placement/placementTypes'
import {
  PEDESTAL_GROUND_CENTER_Y,
  PEDESTAL_GROUND_COLOR,
  PEDESTAL_GROUND_FRICTION,
  PEDESTAL_GROUND_HALF_EXTENTS,
  PEDESTAL_GROUND_RESTITUTION,
  PEDESTAL_GROUND_SIZE,
  PEDESTAL_GROUND_THICKNESS,
  PEDESTAL_GROUND_Y,
  ROCK_SETTLE_TIMEOUT_MS,
  accessoryLocalToWorld,
  accessoryWorldToLocal,
  clampRockPosition,
  normalizeRockPose,
} from '../features/rockMovement/rockMovementRules'
import type { RockCompositionDraft, RockPose, WorldAccessoryTransform } from '../features/rockMovement/rockMovementTypes'
import { AccessoryModel } from './AccessoryModel'
import { RockModel } from './RockModel'
import type { RockLoadState, RockSurfacePointerSample } from './RockModel'
import type { DisposalReport } from './rockResources'

export type ShowroomInteractionMode =
  | 'orbit'
  | 'caress'
  | 'cleaning'
  | 'accessory'
  | 'rock-position'
  | 'rock-orientation'
  | 'placement'
  | 'composition-settle'

interface ShowroomSceneProps {
  rock: RockCatalogEntry
  retryKey: number
  reducedMotion: boolean
  onLoadStateChange: (state: RockLoadState, message?: string) => void
  onInteractionChange: (active: boolean) => void
  interactionMode?: ShowroomInteractionMode
  rockPose?: RockPose
  onRockPoseDraft?: (pose: RockPose) => void
  onCompositionSettled?: (draft: RockCompositionDraft) => void
  placementTarget?: PlacementTarget | null
  placementTool?: PlacementTool
  dustAmount?: number
  dustRevision?: number
  onSurfacePointerDown?: (sample: RockSurfacePointerSample) => void
  onSurfacePointerMove?: (sample: RockSurfacePointerSample) => void
  onSurfacePointerUp?: (sample: RockSurfacePointerSample) => void
  onSurfacePointerCancel?: (sample: RockSurfacePointerSample) => void
  accessories?: EquippedAccessoryInstance[]
  selectedAccessoryId?: string | null
  onAccessorySelect?: (instanceId: string) => void
  onAccessoryTransformDraft?: (instanceId: string, transform: AccessoryTransform) => void
  onAccessoryTransformCommit?: (instanceId: string, transform: AccessoryTransform) => void
  onAccessoryLoadStateChange?: (
    instanceId: string,
    state: 'loading' | 'ready' | 'error',
    message?: string,
  ) => void
  onAccessoryDisposed?: (instanceId: string, report: DisposalReport) => void
}

interface OrbitControlsShape {
  target: Vector3
  minDistance: number
  maxDistance: number
  update: () => void
}

interface GesturePoint {
  x: number
  y: number
}

interface ManipulationSnapshot {
  position: Vector3
  rotation: Quaternion
  scale: number
}

function samePosition(left: readonly number[], right: readonly number[], epsilon = 0.00001) {
  return left.length === right.length && left.every((value, index) => Math.abs(value - (right[index] ?? value)) <= epsilon)
}

function AutoFitCamera({ object }: { object: Object3D | null }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as OrbitControlsShape | null
  const invalidate = useThree((state) => state.invalidate)
  const size = useThree((state) => state.size)

  useLayoutEffect(() => {
    if (!object || !(camera instanceof PerspectiveCamera)) return
    const box = new Box3().setFromObject(object)
    if (box.isEmpty()) return

    const sphere = box.getBoundingSphere(new Sphere())
    const verticalFov = MathUtils.degToRad(camera.fov)
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
    const limitingFov = Math.min(verticalFov, horizontalFov)
    const distance = (sphere.radius / Math.sin(limitingFov / 2)) * 1.18
    const viewDirection = new Vector3(0.62, 0.42, 0.78).normalize()

    camera.position.copy(sphere.center).addScaledVector(viewDirection, distance)
    camera.near = Math.max(0.01, distance / 100)
    camera.far = Math.max(100, distance * 20)
    camera.lookAt(sphere.center)
    camera.updateProjectionMatrix()

    if (controls) {
      controls.target.copy(sphere.center)
      controls.minDistance = distance * 0.72
      controls.maxDistance = distance * 1.45
      controls.update()
    }
    invalidate()
  }, [camera, controls, invalidate, object, size.height, size.width])

  return null
}

function RockGestureController({
  mode,
  pose,
  geometry,
  onPoseChange,
}: {
  mode: 'rock-position' | 'rock-orientation'
  pose: RockPose
  geometry: PlacementGeometry | null
  onPoseChange: (pose: RockPose) => void
}) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const pointersRef = useRef(new Map<number, GesturePoint>())
  const poseRef = useRef(pose)
  const previousSingleRef = useRef<GesturePoint | null>(null)
  const multiBaselineRef = useRef<{ distance: number; angle: number; pose: RockPose } | null>(null)

  useEffect(() => {
    poseRef.current = pose
  }, [pose])

  useEffect(() => {
    const canvas = gl.domElement
    const points = () => [...pointersRef.current.values()]
    const distance = (items: GesturePoint[]) => Math.hypot(items[1]!.x - items[0]!.x, items[1]!.y - items[0]!.y)
    const angle = (items: GesturePoint[]) => Math.atan2(items[1]!.y - items[0]!.y, items[1]!.x - items[0]!.x)
    const worldPerPixel = () => {
      const target = new Vector3(...poseRef.current.position)
      const cameraDistance = Math.max(0.5, camera.position.distanceTo(target))
      if (!(camera instanceof PerspectiveCamera)) return cameraDistance / Math.max(320, canvas.clientHeight)
      return 2 * cameraDistance * Math.tan(MathUtils.degToRad(camera.fov) / 2) / Math.max(1, canvas.clientHeight)
    }
    const publish = (next: RockPose) => {
  const normalized = normalizeRockPose(next)
  if (!geometry) return
  const constrained = normalizeRockPose({
    position: constrainPlacementPosition(
      normalized.position,
      normalized.rotation,
      1,
      geometry,
    ),
    rotation: normalized.rotation,
  })
  poseRef.current = constrained
  onPoseChange(constrained)
  invalidate()
}

    const resetBaseline = () => {
      const items = points()
      if (items.length >= 2) {
        multiBaselineRef.current = {
          distance: Math.max(1, distance(items)),
          angle: angle(items),
          pose: poseRef.current,
        }
        previousSingleRef.current = null
      } else if (items.length === 1) {
        previousSingleRef.current = items[0] ?? null
        multiBaselineRef.current = null
      } else {
        previousSingleRef.current = null
        multiBaselineRef.current = null
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault()
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      try { canvas.setPointerCapture(event.pointerId) } catch { /* capture is optional */ }
      resetBaseline()
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!pointersRef.current.has(event.pointerId)) return
      event.preventDefault()
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const items = points()
      const scale = worldPerPixel()

      if (items.length >= 2 && multiBaselineRef.current) {
        const baseline = multiBaselineRef.current
        if (mode === 'rock-position') {
          const delta = distance(items) - baseline.distance
          const view = camera.getWorldDirection(new Vector3()).normalize()
          const base = new Vector3(...baseline.pose.position).addScaledVector(view, -delta * scale * 1.35)
          publish({ ...baseline.pose, position: clampRockPosition([base.x, base.y, base.z]) })
        } else {
          const twist = angle(items) - baseline.angle
          const axis = camera.getWorldDirection(new Vector3()).normalize()
          const baseRotation = new Quaternion(...baseline.pose.rotation).normalize()
          const next = new Quaternion().setFromAxisAngle(axis, twist).multiply(baseRotation).normalize()
          publish({ ...baseline.pose, rotation: [next.x, next.y, next.z, next.w] })
        }
        return
      }

      if (items.length !== 1) return
      const current = items[0]
      if (!current) return
      const previous = previousSingleRef.current
      previousSingleRef.current = current
      if (!previous) return
      const dx = current.x - previous.x
      const dy = current.y - previous.y

      if (mode === 'rock-position') {
        const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
        const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
        const next = new Vector3(...poseRef.current.position)
          .addScaledVector(right, dx * scale)
          .addScaledVector(up, -dy * scale)
        publish({ ...poseRef.current, position: clampRockPosition([next.x, next.y, next.z]) })
      } else {
        const cameraUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
        const cameraRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
        const yaw = new Quaternion().setFromAxisAngle(cameraUp, dx * 0.008)
        const pitch = new Quaternion().setFromAxisAngle(cameraRight, dy * 0.008)
        const currentRotation = new Quaternion(...poseRef.current.rotation).normalize()
        const next = yaw.multiply(pitch).multiply(currentRotation).normalize()
        publish({ ...poseRef.current, rotation: [next.x, next.y, next.z, next.w] })
      }
    }
    const onPointerEnd = (event: PointerEvent) => {
      pointersRef.current.delete(event.pointerId)
      try {
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      } catch { /* nothing to release */ }
      resetBaseline()
    }

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false })
    canvas.addEventListener('pointermove', onPointerMove, { passive: false })
    canvas.addEventListener('pointerup', onPointerEnd, { passive: false })
    canvas.addEventListener('pointercancel', onPointerEnd, { passive: false })
    return () => {
      pointersRef.current.clear()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerEnd)
      canvas.removeEventListener('pointercancel', onPointerEnd)
    }
  }, [camera, geometry, gl, invalidate, mode, onPoseChange])

  return null
}

function ManipulationController({
  target,
  tool,
  rockPose,
  rockGeometry,
  accessories,
  accessoryGeometries,
  onRockPoseChange,
  onAccessoryTransformChange,
}: {
  target: PlacementTarget
  tool: PlacementTool
  rockPose: RockPose
  rockGeometry: PlacementGeometry | null
  accessories: EquippedAccessoryInstance[]
  accessoryGeometries: Map<string, PlacementGeometry>
  onRockPoseChange?: ((pose: RockPose) => void) | undefined
  onAccessoryTransformChange?: ((instanceId: string, transform: AccessoryTransform) => void) | undefined
}) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const pointersRef = useRef(new Map<number, GesturePoint>())
  const previousSingleRef = useRef<GesturePoint | null>(null)
  const baselineRef = useRef<{ distance: number; angle: number; snapshot: ManipulationSnapshot } | null>(null)
  const stateRef = useRef({ target, tool, rockPose, rockGeometry, accessories, accessoryGeometries })

  useEffect(() => {
    stateRef.current = { target, tool, rockPose, rockGeometry, accessories, accessoryGeometries }
  }, [accessories, accessoryGeometries, rockGeometry, rockPose, target, tool])

  useEffect(() => {
    const canvas = gl.domElement
    const points = () => [...pointersRef.current.values()]
    const distance = (items: GesturePoint[]) => Math.hypot(items[1]!.x - items[0]!.x, items[1]!.y - items[0]!.y)
    const angle = (items: GesturePoint[]) => Math.atan2(items[1]!.y - items[0]!.y, items[1]!.x - items[0]!.x)

    const selectedInstance = () => {
      const current = stateRef.current
      return current.target.kind === 'accessory'
        ? current.accessories.find((candidate) => candidate.id === current.target.instanceId) ?? null
        : null
    }

    const snapshot = (): ManipulationSnapshot | null => {
      const current = stateRef.current
      if (current.target.kind === 'rock') {
        return {
          position: new Vector3(...current.rockPose.position),
          rotation: new Quaternion(...current.rockPose.rotation).normalize(),
          scale: 1,
        }
      }
      const instance = selectedInstance()
      if (!instance) return null
      const world = accessoryLocalToWorld(instance.id, instance, current.rockPose)
      return {
        position: new Vector3(...world.worldPosition),
        rotation: new Quaternion(...world.worldRotation).normalize(),
        scale: instance.uniformScale,
      }
    }

    const publish = (next: ManipulationSnapshot) => {
      const current = stateRef.current
      const rotation: [number, number, number, number] = [
        next.rotation.x,
        next.rotation.y,
        next.rotation.z,
        next.rotation.w,
      ]

      if (current.target.kind === 'rock') {
        if (!onRockPoseChange) return
        const normalized = normalizeRockPose({
          position: [next.position.x, next.position.y, next.position.z],
          rotation,
        })
                if (!current.rockGeometry) return
      const grounded = constrainPlacementPosition(
        normalized.position,
        normalized.rotation,
        1,
        current.rockGeometry,
      )
      onRockPoseChange(normalizeRockPose({ position: grounded, rotation: normalized.rotation }))

        invalidate()
        return
      }

      if (!onAccessoryTransformChange) return
      const instance = selectedInstance()
      if (!instance) return
            const safeScale = Math.max(instance.scaleMin, Math.min(instance.scaleMax, next.scale))
    const geometry = current.accessoryGeometries.get(instance.id)
    if (!geometry) return
    const grounded = constrainPlacementPosition(
      [next.position.x, next.position.y, next.position.z],
      rotation,
      safeScale,
      geometry,
    )

      const local = accessoryWorldToLocal({
        instanceId: instance.id,
        worldPosition: grounded,
        worldRotation: rotation,
        uniformScale: safeScale,
      }, current.rockPose)
      onAccessoryTransformChange(
        instance.id,
        clampAccessoryTransform(local, instance.scaleMin, instance.scaleMax),
      )
      invalidate()
    }

    const worldPerPixel = () => {
      const current = snapshot()
      if (!current) return 0.005
      const cameraDistance = Math.max(0.5, camera.position.distanceTo(current.position))
      if (!(camera instanceof PerspectiveCamera)) return cameraDistance / Math.max(320, canvas.clientHeight)
      return 2 * cameraDistance * Math.tan(MathUtils.degToRad(camera.fov) / 2) / Math.max(1, canvas.clientHeight)
    }

    const resetBaseline = () => {
      const items = points()
      const current = snapshot()
      if (!current) return
      if (items.length >= 2) {
        baselineRef.current = {
          distance: Math.max(1, distance(items)),
          angle: angle(items),
          snapshot: current,
        }
        previousSingleRef.current = null
      } else if (items.length === 1) {
        previousSingleRef.current = items[0] ?? null
        baselineRef.current = null
      } else {
        previousSingleRef.current = null
        baselineRef.current = null
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault()
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      try { canvas.setPointerCapture(event.pointerId) } catch { /* capture is optional */ }
      resetBaseline()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointersRef.current.has(event.pointerId)) return
      event.preventDefault()
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const currentState = stateRef.current
      const currentTool = currentState.tool
      const items = points()
      const scalePerPixel = worldPerPixel()

      if (items.length >= 2 && baselineRef.current) {
        const baseline = baselineRef.current
        if (currentTool === 'position') {
          const delta = distance(items) - baseline.distance
          const view = camera.getWorldDirection(new Vector3()).normalize()
          publish({
            ...baseline.snapshot,
            position: baseline.snapshot.position.clone().addScaledVector(view, -delta * scalePerPixel * 1.35),
          })
        } else if (currentTool === 'orientation') {
          const twist = angle(items) - baseline.angle
          const axis = camera.getWorldDirection(new Vector3()).normalize()
          const nextRotation = new Quaternion().setFromAxisAngle(axis, twist)
            .multiply(baseline.snapshot.rotation.clone())
            .normalize()
          publish({ ...baseline.snapshot, rotation: nextRotation })
        } else if (currentTool === 'size' && currentState.target.kind === 'accessory') {
          const ratio = Math.max(0.2, distance(items) / baseline.distance)
          publish({ ...baseline.snapshot, scale: baseline.snapshot.scale * ratio })
        }
        return
      }

      if (items.length !== 1 || currentTool === 'size') return
      const point = items[0]
      if (!point) return
      const previous = previousSingleRef.current
      previousSingleRef.current = point
      if (!previous) return
      const dx = point.x - previous.x
      const dy = point.y - previous.y
      const current = snapshot()
      if (!current) return

      if (currentTool === 'position') {
        const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
        const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
        publish({
          ...current,
          position: current.position.clone()
            .addScaledVector(right, dx * scalePerPixel)
            .addScaledVector(up, -dy * scalePerPixel),
        })
      } else {
        const cameraUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
        const cameraRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
        const yaw = new Quaternion().setFromAxisAngle(cameraUp, dx * 0.008)
        const pitch = new Quaternion().setFromAxisAngle(cameraRight, dy * 0.008)
        publish({
          ...current,
          rotation: yaw.multiply(pitch).multiply(current.rotation.clone()).normalize(),
        })
      }
    }

    const onPointerEnd = (event: PointerEvent) => {
      pointersRef.current.delete(event.pointerId)
      try {
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      } catch { /* nothing to release */ }
      resetBaseline()
    }

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false })
    canvas.addEventListener('pointermove', onPointerMove, { passive: false })
    canvas.addEventListener('pointerup', onPointerEnd, { passive: false })
    canvas.addEventListener('pointercancel', onPointerEnd, { passive: false })
    return () => {
      pointersRef.current.clear()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerEnd)
      canvas.removeEventListener('pointercancel', onPointerEnd)
    }
  }, [camera, gl, invalidate, onAccessoryTransformChange, onRockPoseChange])

  return null
}

function RockPhysicsBody({
  object,
  pose,
  bounds,
  visualGroup,
  manipulating,
  globalSettling,
  onSettled,
}: {
  object: Object3D
  pose: RockPose
  bounds: PlacementGeometry
  visualGroup: Group | null
  manipulating: boolean
  globalSettling: boolean
  onSettled: (pose: RockPose) => void
}) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const reportedRef = useRef(false)
  const invalidate = useThree((state) => state.invalidate)
  const colliderObject = useMemo(() => {
    const clone = object.clone(true)
    clone.name = 'CAILLOU_DYNAMIC_HULL_COLLIDER'
    clone.visible = false
    return clone
  }, [object])

  const enforceHardFloor = useCallback(() => {
    const body = bodyRef.current
    if (!body) return false
    const position = body.translation()
    const rotation = body.rotation()
    const currentPosition: [number, number, number] = [position.x, position.y, position.z]
    const grounded = constrainPlacementPosition(
      currentPosition,
      [rotation.x, rotation.y, rotation.z, rotation.w],
      1,
      bounds,
    )
    if (samePosition(grounded, currentPosition)) return false

    const changedX = Math.abs(grounded[0] - position.x) > 0.000001
    const changedY = Math.abs(grounded[1] - position.y) > 0.000001
    const changedZ = Math.abs(grounded[2] - position.z) > 0.000001
    body.setTranslation({ x: grounded[0], y: grounded[1], z: grounded[2] }, true)
    const velocity = body.linvel()
    body.setLinvel({
      x: changedX ? 0 : velocity.x,
      y: changedY && velocity.y < 0 ? 0 : velocity.y,
      z: changedZ ? 0 : velocity.z,
    }, true)
    invalidate()
    return true
  }, [bounds, invalidate])

  const syncVisual = useCallback(() => {
    const body = bodyRef.current
    if (!body || !visualGroup) return
    const translation = body.translation()
    const rotation = body.rotation()
    visualGroup.position.set(translation.x, translation.y, translation.z)
    visualGroup.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w).normalize()
    visualGroup.updateMatrixWorld(true)
    invalidate()
  }, [invalidate, visualGroup])

  useAfterPhysicsStep(() => {
    if (globalSettling) enforceHardFloor()
    syncVisual()
  })

  useEffect(() => {
    const body = bodyRef.current
    if (!body || globalSettling) return
    const grounded = constrainPlacementPosition(pose.position, pose.rotation, 1, bounds)
    const safePose = normalizeRockPose({ position: grounded, rotation: pose.rotation })
    const translation = { x: safePose.position[0], y: safePose.position[1], z: safePose.position[2] }
    const rotation = { x: safePose.rotation[0], y: safePose.rotation[1], z: safePose.rotation[2], w: safePose.rotation[3] }
    if (manipulating) {
      body.setNextKinematicTranslation(translation)
      body.setNextKinematicRotation(rotation)
    } else {
      body.setTranslation(translation, false)
      body.setRotation(rotation, false)
    }
    if (visualGroup) {
      visualGroup.position.set(...safePose.position)
      visualGroup.quaternion.set(...safePose.rotation).normalize()
      visualGroup.updateMatrixWorld(true)
    }
    invalidate()
  }, [bounds, globalSettling, invalidate, manipulating, pose, visualGroup])

  const report = useCallback(() => {
    const body = bodyRef.current
    if (!body || !globalSettling || reportedRef.current) return
    reportedRef.current = true
    enforceHardFloor()
    body.setLinvel({ x: 0, y: 0, z: 0 }, false)
    body.setAngvel({ x: 0, y: 0, z: 0 }, false)
    body.sleep()
    const position = body.translation()
    const rotation = body.rotation()
        const grounded = constrainPlacementPosition(
    [position.x, position.y, position.z],
    [rotation.x, rotation.y, rotation.z, rotation.w],
    1,
    bounds,
  )

    if (!samePosition(grounded, [position.x, position.y, position.z])) {
      body.setTranslation({ x: grounded[0], y: grounded[1], z: grounded[2] }, false)
    }
    onSettled(normalizeRockPose({
      position: grounded,
      rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
    }))
    syncVisual()
  }, [bounds, enforceHardFloor, globalSettling, onSettled, syncVisual])

  useEffect(() => {
    reportedRef.current = false
    if (!globalSettling) return
    const body = bodyRef.current
    if (body) {
      enforceHardFloor()
      body.setLinvel({ x: 0, y: -0.03, z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      body.wakeUp()
    }
    const timer = window.setTimeout(report, ROCK_SETTLE_TIMEOUT_MS)
    invalidate()
    return () => window.clearTimeout(timer)
  }, [enforceHardFloor, globalSettling, invalidate, report])

  return (
    <RigidBody
      key={globalSettling ? 'rock-dynamic' : manipulating ? 'rock-kinematic' : 'rock-fixed'}
      ref={bodyRef}
      type={globalSettling ? 'dynamic' : manipulating ? 'kinematicPosition' : 'fixed'}
      colliders="hull"
      includeInvisible
      position={pose.position}
      quaternion={pose.rotation}
      mass={6}
      friction={0.9}
      restitution={0.015}
      linearDamping={1.8}
      angularDamping={2.2}
      ccd={globalSettling}
      canSleep
      additionalSolverIterations={globalSettling ? 6 : 1}
      onSleep={report}
    >
      <primitive object={colliderObject} />
    </RigidBody>
  )
}

function PedestalGround() {
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={[0, PEDESTAL_GROUND_CENTER_Y, 0]}
      friction={PEDESTAL_GROUND_FRICTION}
      restitution={PEDESTAL_GROUND_RESTITUTION}
    >
      <CuboidCollider args={PEDESTAL_GROUND_HALF_EXTENTS} />
      <mesh name="CAILLOU_PEDESTAL_FLOOR" receiveShadow>
        <boxGeometry args={[PEDESTAL_GROUND_SIZE, PEDESTAL_GROUND_THICKNESS, PEDESTAL_GROUND_SIZE]} />
        <meshStandardMaterial color={PEDESTAL_GROUND_COLOR} roughness={0.96} metalness={0.02} />
      </mesh>
    </RigidBody>
  )
}

export function ShowroomScene({
  rock,
  retryKey,
  reducedMotion,
  onLoadStateChange,
  onInteractionChange,
  interactionMode = 'orbit',
  rockPose = { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
  onRockPoseDraft,
  onCompositionSettled,
  placementTarget = null,
  placementTool = 'position',
  dustAmount = 0,
  dustRevision = 0,
  onSurfacePointerDown,
  onSurfacePointerMove,
  onSurfacePointerUp,
  onSurfacePointerCancel,
  accessories = [],
  selectedAccessoryId = null,
  onAccessorySelect,
  onAccessoryTransformDraft,
  onAccessoryTransformCommit,
  onAccessoryLoadStateChange,
  onAccessoryDisposed,
}: ShowroomSceneProps) {
  const [object, setObject] = useState<Object3D | null>(null)
  const [rockGeometry, setRockGeometry] = useState<PlacementGeometry | null>(null)
  const [accessoryGeometries, setAccessoryGeometries] = useState<Map<string, PlacementGeometry>>(() => new Map())
  const [visualGroup, setVisualGroup] = useState<Group | null>(null)
  const finalRockRef = useRef<RockPose | null>(null)
  const finalAccessoriesRef = useRef(new Map<string, WorldAccessoryTransform>())
  const compositionReportedRef = useRef(false)
  const handleObjectReady = useCallback((nextObject: Object3D | null) => {
    setObject(nextObject)
  }, [])
  const handleRockGeometryReady = useCallback((geometry: PlacementGeometry | null) => {
    setRockGeometry(geometry)
  }, [])
  const handleAccessoryGeometryReady = useCallback((instanceId: string, geometry: PlacementGeometry | null) => {
    setAccessoryGeometries((current) => {
      const next = new Map(current)
      if (geometry) next.set(instanceId, geometry)
      else next.delete(instanceId)
      return next
    })
  }, [])
  const surfaceMode = interactionMode === 'caress' || interactionMode === 'cleaning'
  const cleaningMode = interactionMode === 'cleaning'
  const legacyAccessoryMode = interactionMode === 'accessory'
  const legacyRockManipulationMode = interactionMode === 'rock-position' || interactionMode === 'rock-orientation'
  const placementMode = interactionMode === 'placement'
  const placementRockTarget = placementMode && placementTarget?.kind === 'rock'
  const globalSettling = interactionMode === 'composition-settle'
  const orbitMode = interactionMode === 'orbit'

  useEffect(() => {
    if (!rockGeometry || globalSettling || placementRockTarget || !onRockPoseDraft) return
    const constrained = constrainPlacementPosition(rockPose.position, rockPose.rotation, 1, rockGeometry)
    if (!samePosition(constrained, rockPose.position)) {
      onRockPoseDraft(normalizeRockPose({ position: constrained, rotation: rockPose.rotation }))
    }
  }, [globalSettling, onRockPoseDraft, placementRockTarget, rockGeometry, rockPose])

  useEffect(() => {
    if (!globalSettling) return
    finalRockRef.current = null
    finalAccessoriesRef.current = new Map()
    compositionReportedRef.current = false
  }, [globalSettling])

  const tryReportComposition = useCallback(() => {
    const finalRock = finalRockRef.current
    if (!globalSettling || !finalRock || compositionReportedRef.current) return
    if (finalAccessoriesRef.current.size !== accessories.length) return
    compositionReportedRef.current = true
    const localAccessories = accessories.map((instance) => {
      const world = finalAccessoriesRef.current.get(instance.id)
      if (!world) throw new Error(`Missing settled transform for ${instance.id}`)
      return accessoryWorldToLocal(world, finalRock)
    })
    onCompositionSettled?.({ rockPose: finalRock, accessories: localAccessories })
  }, [accessories, globalSettling, onCompositionSettled])

  const handleRockSettled = useCallback((pose: RockPose) => {
    finalRockRef.current = pose
    tryReportComposition()
  }, [tryReportComposition])

  const handleAccessorySettled = useCallback((transform: WorldAccessoryTransform) => {
    finalAccessoriesRef.current.set(transform.instanceId, transform)
    tryReportComposition()
  }, [tryReportComposition])

  return (
    <div
      className="showroom-canvas"
      onPointerDown={() => { if (orbitMode) onInteractionChange(true) }}
      onPointerUp={() => { if (orbitMode) onInteractionChange(false) }}
      onPointerCancel={() => { if (orbitMode) onInteractionChange(false) }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <Canvas
        aria-hidden="true"
        camera={{ position: [3.1, 2.15, 4.4], fov: 32, near: 0.05, far: 100 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        shadows
      >
        <color attach="background" args={['#e5e1d8']} />
        <ambientLight intensity={0.58} />
        <directionalLight position={[4.5, 5.5, 4.2]} intensity={2.45} castShadow />
        <directionalLight position={[-4.2, 2.4, -2.5]} intensity={0.72} />
        <directionalLight position={[1.2, 3.4, -4.4]} intensity={0.62} />

        <Suspense fallback={null}>
          <Physics
            gravity={[ACCESSORY_WORLD_GRAVITY[0], ACCESSORY_WORLD_GRAVITY[1], ACCESSORY_WORLD_GRAVITY[2]]}
            colliders={false}
            updateLoop="independent"
            paused={!object}
          >
            <PedestalGround />

            <group ref={setVisualGroup} position={rockPose.position} quaternion={rockPose.rotation}>
              <RockModel
                key={`${rock.id}-${retryKey}`}
                path={rock.modelPath}
                dustAmount={dustAmount}
                dustRevision={dustRevision}
                cleaningActive={cleaningMode}
                onLoadStateChange={onLoadStateChange}
                onObjectReady={handleObjectReady}
                onPlacementGeometryReady={handleRockGeometryReady}
                onSurfacePointerDown={surfaceMode ? onSurfacePointerDown : undefined}
                onSurfacePointerMove={surfaceMode ? onSurfacePointerMove : undefined}
                onSurfacePointerUp={surfaceMode ? onSurfacePointerUp : undefined}
                onSurfacePointerCancel={surfaceMode ? onSurfacePointerCancel : undefined}
              />
            </group>

            {object && visualGroup && rockGeometry ? (
              <RockPhysicsBody
                object={object}
                pose={rockPose}
                bounds={rockGeometry}
                visualGroup={visualGroup}
                manipulating={legacyRockManipulationMode || placementRockTarget}
                globalSettling={globalSettling}
                onSettled={handleRockSettled}
              />
            ) : null}

            {accessories.map((instance) => (
              <AccessoryModel
                key={instance.id}
                instance={instance}
                selected={selectedAccessoryId === instance.id}
                editing={legacyAccessoryMode}
                rockPose={rockPose}
                rockObject={object}
                compositionFrozen={legacyRockManipulationMode || placementMode}
                globalSettling={globalSettling}
                onSelect={(instanceId) => onAccessorySelect?.(instanceId)}
                onTransformDraft={(instanceId, transform) => onAccessoryTransformDraft?.(instanceId, transform)}
                onTransformCommit={(instanceId, transform) => onAccessoryTransformCommit?.(instanceId, transform)}
                onGlobalSettled={handleAccessorySettled}
                onPlacementGeometryReady={handleAccessoryGeometryReady}
                onLoadStateChange={onAccessoryLoadStateChange}
                onDisposed={onAccessoryDisposed}
              />
            ))}

            {legacyRockManipulationMode && onRockPoseDraft ? (
              <RockGestureController
                mode={interactionMode}
                pose={rockPose}
                geometry={rockGeometry}
                onPoseChange={onRockPoseDraft}
              />
            ) : null}

            {placementMode && placementTarget ? (
              <ManipulationController
                target={placementTarget}
                tool={placementTool}
                rockPose={rockPose}
                rockGeometry={rockGeometry}
                accessories={accessories}
                accessoryGeometries={accessoryGeometries}
                onRockPoseChange={onRockPoseDraft}
                onAccessoryTransformChange={onAccessoryTransformDraft}
              />
            ) : null}
          </Physics>
        </Suspense>

        <AutoFitCamera object={object} />
        {object ? (
          <ContactShadows
            key={`${rock.id}-${retryKey}-shadow`}
            position={[0, PEDESTAL_GROUND_Y + 0.002, 0]}
            opacity={0.3}
            scale={PEDESTAL_GROUND_SIZE}
            blur={2.6}
            far={4}
            frames={1}
          />
        ) : null}
        <OrbitControls
          makeDefault
          enabled={orbitMode}
          enablePan={false}
          enableDamping={!reducedMotion}
          dampingFactor={0.08}
          rotateSpeed={0.62}
          zoomSpeed={0.72}
          minPolarAngle={Math.PI / 5}
          maxPolarAngle={Math.PI / 1.95}
        />
      </Canvas>
    </div>
  )
}

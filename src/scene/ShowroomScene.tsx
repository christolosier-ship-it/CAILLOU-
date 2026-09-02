import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { CuboidCollider, Physics, RigidBody, useAfterPhysicsStep } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Box3, MathUtils, PerspectiveCamera, Quaternion, Sphere, Vector3 } from 'three'
import type { Group, Object3D } from 'three'

import type { RockCatalogEntry } from '../content/rockCatalog'
import { ACCESSORY_WORLD_GRAVITY } from '../features/accessories/accessoryPhysics'
import type { AccessoryTransform, EquippedAccessoryInstance } from '../features/accessories/accessoryTypes'
import {
  PEDESTAL_GROUND_SIZE,
  PEDESTAL_GROUND_THICKNESS,
  PEDESTAL_GROUND_Y,
  ROCK_SETTLE_TIMEOUT_MS,
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
  onPoseChange,
}: {
  mode: 'rock-position' | 'rock-orientation'
  pose: RockPose
  onPoseChange: (pose: RockPose) => void
}) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const pointersRef = useRef(new Map<number, GesturePoint>())
  const poseRef = useRef(pose)
  const previousSingleRef = useRef<GesturePoint | null>(null)
  const multiBaselineRef = useRef<{
    distance: number
    angle: number
    pose: RockPose
  } | null>(null)

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
      poseRef.current = normalized
      onPoseChange(normalized)
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
      try {
        canvas.setPointerCapture(event.pointerId)
      } catch {
        // Pointer capture may already belong to a nested R3F target.
      }
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
          const base = new Vector3(...baseline.pose.position)
          base.addScaledVector(view, -delta * scale * 1.35)
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
      } catch {
        // Nothing to release.
      }
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
  }, [camera, gl, invalidate, mode, onPoseChange])

  return null
}

function RockPhysicsBody({
  object,
  pose,
  visualGroup,
  manipulating,
  globalSettling,
  onSettled,
}: {
  object: Object3D
  pose: RockPose
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

  useAfterPhysicsStep(syncVisual)

  useEffect(() => {
    const body = bodyRef.current
    if (!body || globalSettling) return
    const translation = { x: pose.position[0], y: pose.position[1], z: pose.position[2] }
    const rotation = { x: pose.rotation[0], y: pose.rotation[1], z: pose.rotation[2], w: pose.rotation[3] }
    if (manipulating) {
      body.setNextKinematicTranslation(translation)
      body.setNextKinematicRotation(rotation)
    } else {
      body.setTranslation(translation, false)
      body.setRotation(rotation, false)
    }
    if (visualGroup) {
      visualGroup.position.set(...pose.position)
      visualGroup.quaternion.set(...pose.rotation).normalize()
      visualGroup.updateMatrixWorld(true)
    }
    invalidate()
  }, [globalSettling, invalidate, manipulating, pose, visualGroup])

  const report = useCallback(() => {
    const body = bodyRef.current
    if (!body || !globalSettling || reportedRef.current) return
    reportedRef.current = true
    body.setLinvel({ x: 0, y: 0, z: 0 }, false)
    body.setAngvel({ x: 0, y: 0, z: 0 }, false)
    body.sleep()
    const position = body.translation()
    const rotation = body.rotation()
    onSettled(normalizeRockPose({
      position: [position.x, position.y, position.z],
      rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
    }))
    syncVisual()
  }, [globalSettling, onSettled, syncVisual])

  useEffect(() => {
    reportedRef.current = false
    if (!globalSettling) return
    const body = bodyRef.current
    if (body) {
      body.setLinvel({ x: 0, y: -0.03, z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      body.wakeUp()
    }
    const timer = window.setTimeout(report, ROCK_SETTLE_TIMEOUT_MS)
    invalidate()
    return () => window.clearTimeout(timer)
  }, [globalSettling, invalidate, report])

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
      additionalSolverIterations={globalSettling ? 4 : 1}
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
      position={[0, PEDESTAL_GROUND_Y - PEDESTAL_GROUND_THICKNESS / 2, 0]}
      friction={0.94}
      restitution={0.01}
    >
      <CuboidCollider args={[PEDESTAL_GROUND_SIZE / 2, PEDESTAL_GROUND_THICKNESS / 2, PEDESTAL_GROUND_SIZE / 2]} />
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
  const [visualGroup, setVisualGroup] = useState<Group | null>(null)
  const finalRockRef = useRef<RockPose | null>(null)
  const finalAccessoriesRef = useRef(new Map<string, WorldAccessoryTransform>())
  const compositionReportedRef = useRef(false)
  const handleObjectReady = useCallback((nextObject: Object3D | null) => setObject(nextObject), [])
  const surfaceMode = interactionMode === 'caress' || interactionMode === 'cleaning'
  const cleaningMode = interactionMode === 'cleaning'
  const accessoryMode = interactionMode === 'accessory'
  const rockManipulationMode = interactionMode === 'rock-position' || interactionMode === 'rock-orientation'
  const globalSettling = interactionMode === 'composition-settle'
  const orbitMode = interactionMode === 'orbit'

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
      onPointerDown={() => {
        if (orbitMode) onInteractionChange(true)
      }}
      onPointerUp={() => {
        if (orbitMode) onInteractionChange(false)
      }}
      onPointerCancel={() => {
        if (orbitMode) onInteractionChange(false)
      }}
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

            <group
              ref={setVisualGroup}
              position={rockPose.position}
              quaternion={rockPose.rotation}
            >
              <RockModel
                key={`${rock.id}-${retryKey}`}
                path={rock.modelPath}
                dustAmount={dustAmount}
                dustRevision={dustRevision}
                cleaningActive={cleaningMode}
                onLoadStateChange={onLoadStateChange}
                onObjectReady={handleObjectReady}
                onSurfacePointerDown={surfaceMode ? onSurfacePointerDown : undefined}
                onSurfacePointerMove={surfaceMode ? onSurfacePointerMove : undefined}
                onSurfacePointerUp={surfaceMode ? onSurfacePointerUp : undefined}
                onSurfacePointerCancel={surfaceMode ? onSurfacePointerCancel : undefined}
              />
            </group>

            {object && visualGroup ? (
              <RockPhysicsBody
                object={object}
                pose={rockPose}
                visualGroup={visualGroup}
                manipulating={rockManipulationMode}
                globalSettling={globalSettling}
                onSettled={handleRockSettled}
              />
            ) : null}

            {accessories.map((instance) => (
              <AccessoryModel
                key={instance.id}
                instance={instance}
                selected={selectedAccessoryId === instance.id}
                editing={accessoryMode}
                rockPose={rockPose}
                rockObject={object}
                compositionFrozen={rockManipulationMode}
                globalSettling={globalSettling}
                onSelect={(instanceId) => onAccessorySelect?.(instanceId)}
                onTransformDraft={(instanceId, transform) => onAccessoryTransformDraft?.(instanceId, transform)}
                onTransformCommit={(instanceId, transform) => onAccessoryTransformCommit?.(instanceId, transform)}
                onGlobalSettled={handleAccessorySettled}
                onLoadStateChange={onAccessoryLoadStateChange}
                onDisposed={onAccessoryDisposed}
              />
            ))}

            {rockManipulationMode && onRockPoseDraft ? (
              <RockGestureController
                mode={interactionMode}
                pose={rockPose}
                onPoseChange={onRockPoseDraft}
              />
            ) : null}
          </Physics>
        </Suspense>

        <AutoFitCamera object={object} />
        {object ? (
          <ContactShadows
            key={`${rock.id}-${retryKey}-shadow`}
            position={[0, PEDESTAL_GROUND_Y, 0]}
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
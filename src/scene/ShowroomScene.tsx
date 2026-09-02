import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Box3, MathUtils, PerspectiveCamera, Quaternion, Sphere, Vector3 } from 'three'
import type { Group, Object3D } from 'three'

import type { RockCatalogEntry } from '../content/rockCatalog'
import { ACCESSORY_WORLD_GRAVITY } from '../features/accessories/accessoryPhysics'
import type { EquippedAccessoryInstance } from '../features/accessories/accessoryTypes'
import { PlacementBody } from '../features/placement/PlacementBody'
import type { PlacementBodyPhysicsConfig } from '../features/placement/PlacementBody'
import { constrainPlacementPosition, constrainTransformToPedestal } from '../features/placement/placementConstraints'
import type { PlacementGeometry } from '../features/placement/placementGeometry'
import { resolvePlacementGesture } from '../features/placement/placementGesturePolicy'
import type { SettledWorldComposition } from '../features/placement/placementPersistence'
import type { PlacementTarget, PlacementTool, PlacementTransform } from '../features/placement/placementTypes'
import { normalizePlacementTransform, ROCK_PLACEMENT_SCALE_LIMITS } from '../features/placement/placementTransform'
import type { PlacementScaleLimits } from '../features/placement/placementTransform'
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
  normalizeRockPose,
} from '../features/rockMovement/rockMovementRules'
import type { RockPose, WorldAccessoryTransform } from '../features/rockMovement/rockMovementTypes'
import { AccessoryModel } from './AccessoryModel'
import { RockModel } from './RockModel'
import type { RockLoadState, RockSurfacePointerSample } from './RockModel'
import type { DisposalReport } from './rockResources'

export type ShowroomInteractionMode =
  | 'orbit'
  | 'caress'
  | 'cleaning'
  | 'placement'
  | 'composition-settle'
  | 'accessory-settle'

interface ShowroomSceneProps {
  rock: RockCatalogEntry
  retryKey: number
  reducedMotion: boolean
  onLoadStateChange: (state: RockLoadState, message?: string) => void
  onInteractionChange: (active: boolean) => void
  interactionMode?: ShowroomInteractionMode
  rockPose?: RockPose
  onRockPoseDraft?: (pose: RockPose) => void
  onCompositionSettled?: (composition: SettledWorldComposition) => void
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
  onAccessoryPlacementDraft?: (instanceId: string, transform: PlacementTransform) => void
  onAccessorySettled?: (instanceId: string, transform: PlacementTransform) => void
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

function PlacementController({
  target,
  tool,
  transform,
  geometry,
  scaleLimits,
  onTransformChange,
  onTransformEnd,
}: {
  target: PlacementTarget
  tool: PlacementTool
  transform: PlacementTransform
  geometry: PlacementGeometry | null
  scaleLimits: PlacementScaleLimits
  onTransformChange: (transform: PlacementTransform) => void
  onTransformEnd: (transform: PlacementTransform) => void
}) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const pointersRef = useRef(new Map<number, GesturePoint>())
  const previousSingleRef = useRef<GesturePoint | null>(null)
  const baselineRef = useRef<{ distance: number; angle: number; transform: PlacementTransform } | null>(null)
  const transformRef = useRef(transform)
  const stateRef = useRef({ target, tool, geometry, scaleLimits })

  useEffect(() => {
    transformRef.current = transform
  }, [transform])

  useEffect(() => {
    stateRef.current = { target, tool, geometry, scaleLimits }
  }, [geometry, scaleLimits, target, tool])

  useEffect(() => {
    const canvas = gl.domElement
    const points = () => [...pointersRef.current.values()]
    const distance = (items: GesturePoint[]) => Math.hypot(items[1]!.x - items[0]!.x, items[1]!.y - items[0]!.y)
    const angle = (items: GesturePoint[]) => Math.atan2(items[1]!.y - items[0]!.y, items[1]!.x - items[0]!.x)
    const worldPerPixel = () => {
      const position = new Vector3(...transformRef.current.position)
      const cameraDistance = Math.max(0.5, camera.position.distanceTo(position))
      if (!(camera instanceof PerspectiveCamera)) return cameraDistance / Math.max(320, canvas.clientHeight)
      return 2 * cameraDistance * Math.tan(MathUtils.degToRad(camera.fov) / 2) / Math.max(1, canvas.clientHeight)
    }
    const publish = (next: PlacementTransform) => {
      const current = stateRef.current
      let safe = normalizePlacementTransform(next, current.scaleLimits)
      if (current.geometry) safe = constrainTransformToPedestal(safe, current.geometry)
      transformRef.current = safe
      onTransformChange(safe)
      invalidate()
    }
    const resetBaseline = () => {
      const items = points()
      if (items.length >= 2) {
        baselineRef.current = {
          distance: Math.max(1, distance(items)),
          angle: angle(items),
          transform: {
            position: [...transformRef.current.position],
            rotation: [...transformRef.current.rotation],
            scale: transformRef.current.scale,
          },
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
      const current = stateRef.current
      const items = points()
      const action = resolvePlacementGesture(current.target, current.tool, items.length)
      const scalePerPixel = worldPerPixel()

      if (items.length >= 2 && baselineRef.current) {
        const baseline = baselineRef.current
        if (action === 'depth-position') {
          const delta = distance(items) - baseline.distance
          const view = camera.getWorldDirection(new Vector3()).normalize()
          const base = new Vector3(...baseline.transform.position).addScaledVector(view, -delta * scalePerPixel * 1.35)
          publish({ ...baseline.transform, position: [base.x, base.y, base.z] })
        } else if (action === 'twist-orientation') {
          const twist = angle(items) - baseline.angle
          const axis = camera.getWorldDirection(new Vector3()).normalize()
          const nextRotation = new Quaternion().setFromAxisAngle(axis, twist)
            .multiply(new Quaternion(...baseline.transform.rotation))
            .normalize()
          publish({ ...baseline.transform, rotation: [nextRotation.x, nextRotation.y, nextRotation.z, nextRotation.w] })
        } else if (action === 'uniform-scale') {
          const ratio = Math.max(0.2, distance(items) / baseline.distance)
          publish({ ...baseline.transform, scale: baseline.transform.scale * ratio })
        }
        return
      }

      if (items.length !== 1 || action === null) return
      const point = items[0]
      if (!point) return
      const previous = previousSingleRef.current
      previousSingleRef.current = point
      if (!previous) return
      const dx = point.x - previous.x
      const dy = point.y - previous.y
      const active = transformRef.current

      if (action === 'surface-position') {
        const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
        const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
        const next = new Vector3(...active.position)
          .addScaledVector(right, dx * scalePerPixel)
          .addScaledVector(up, -dy * scalePerPixel)
        publish({ ...active, position: [next.x, next.y, next.z] })
      } else if (action === 'free-orientation') {
        const cameraUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
        const cameraRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
        const yaw = new Quaternion().setFromAxisAngle(cameraUp, dx * 0.008)
        const pitch = new Quaternion().setFromAxisAngle(cameraRight, dy * 0.008)
        const next = yaw.multiply(pitch).multiply(new Quaternion(...active.rotation)).normalize()
        publish({ ...active, rotation: [next.x, next.y, next.z, next.w] })
      }
    }
    const onPointerEnd = (event: PointerEvent) => {
      pointersRef.current.delete(event.pointerId)
      try {
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      } catch { /* nothing to release */ }
      resetBaseline()
      if (pointersRef.current.size === 0) onTransformEnd(transformRef.current)
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
  }, [camera, gl, invalidate, onTransformChange, onTransformEnd])

  return null
}


const ROCK_PLACEMENT_BODY_PHYSICS: PlacementBodyPhysicsConfig = {
  collider: 'hull',
  mass: 6,
  friction: 0.9,
  restitution: 0.015,
  linearDamping: 1.8,
  angularDamping: 2.2,
  gravityScale: 1,
  ccd: false,
  settlingCcd: true,
  baseSolverIterations: 1,
  settlingSolverIterations: 6,
  settleTimeoutMs: ROCK_SETTLE_TIMEOUT_MS,
  settleLinearVelocityY: -0.03,
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
  onAccessoryPlacementDraft,
  onAccessorySettled,
  onAccessoryLoadStateChange,
  onAccessoryDisposed,
}: ShowroomSceneProps) {
  const [object, setObject] = useState<Object3D | null>(null)
  const [rockGeometry, setRockGeometry] = useState<PlacementGeometry | null>(null)
  const [accessoryGeometries, setAccessoryGeometries] = useState<Map<string, PlacementGeometry>>(() => new Map())
  const [visualGroup, setVisualGroup] = useState<Group | null>(null)
  const [activePlacementDraft, setActivePlacementDraft] = useState<{ key: string; transform: PlacementTransform } | null>(null)
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

  const rockColliderObject = useMemo(() => {
    if (!object) return null
    const clone = object.clone(true)
    clone.name = 'CAILLOU_DYNAMIC_HULL_COLLIDER'
    clone.visible = false
    return clone
  }, [object])
  const handleRockPhysicsTransform = useCallback((transform: PlacementTransform) => {
    if (!visualGroup) return
    visualGroup.position.set(...transform.position)
    visualGroup.quaternion.set(...transform.rotation).normalize()
    visualGroup.updateMatrixWorld(true)
  }, [visualGroup])
  const surfaceMode = interactionMode === 'caress' || interactionMode === 'cleaning'
  const cleaningMode = interactionMode === 'cleaning'
  const placementMode = interactionMode === 'placement'
  const accessorySettling = interactionMode === 'accessory-settle' && placementTarget?.kind === 'accessory'
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
  onCompositionSettled?.({
    rockTransform: {
      position: [...finalRock.position],
      rotation: [...finalRock.rotation],
      scale: 1,
    },
    accessories: accessories.map((instance) => {
      const world = finalAccessoriesRef.current.get(instance.id)
      if (!world) throw new Error(`Missing settled transform for ${instance.id}`)
      return {
        instanceId: instance.id,
        transform: {
          position: [...world.worldPosition],
          rotation: [...world.worldRotation],
          scale: world.uniformScale,
        },
      }
    }),
  })
}, [accessories, globalSettling, onCompositionSettled])

  const handleRockSettled = useCallback((pose: RockPose) => {
    finalRockRef.current = pose
    tryReportComposition()
  }, [tryReportComposition])

  const handleRockBodySettled = useCallback((transform: PlacementTransform) => {
    handleRockSettled(normalizeRockPose({
      position: [...transform.position],
      rotation: [...transform.rotation],
    }))
  }, [handleRockSettled])

  const handleAccessorySettled = useCallback((transform: WorldAccessoryTransform) => {
    finalAccessoriesRef.current.set(transform.instanceId, transform)
    tryReportComposition()
  }, [tryReportComposition])


  const placementDraftKey = (placementMode || accessorySettling) && placementTarget
    ? placementTarget.kind === 'rock' ? 'rock' : `accessory:${placementTarget.instanceId}`
    : null

  useEffect(() => {
    if ((!placementMode && !accessorySettling) || !placementTarget || !placementDraftKey) {
      setActivePlacementDraft(null)
      return
    }
    setActivePlacementDraft((current) => {
      if (current?.key === placementDraftKey) return current
      if (placementTarget.kind === 'rock') {
        return {
          key: placementDraftKey,
          transform: normalizePlacementTransform({
            position: [...rockPose.position],
            rotation: [...rockPose.rotation],
            scale: 1,
          }, ROCK_PLACEMENT_SCALE_LIMITS),
        }
      }
      const instance = accessories.find((candidate) => candidate.id === placementTarget.instanceId)
      if (!instance) return null
      const world = accessoryLocalToWorld(instance.id, instance, rockPose)
      return {
        key: placementDraftKey,
        transform: normalizePlacementTransform({
          position: [...world.worldPosition],
          rotation: [...world.worldRotation],
          scale: instance.uniformScale,
        }, { min: instance.scaleMin, max: instance.scaleMax }),
      }
    })
  }, [accessories, accessorySettling, placementDraftKey, placementMode, placementTarget, rockPose])

  const placementGeometry = useMemo(() => {
    if (!placementTarget) return null
    return placementTarget.kind === 'rock'
      ? rockGeometry
      : accessoryGeometries.get(placementTarget.instanceId) ?? null
  }, [accessoryGeometries, placementTarget, rockGeometry])

  const placementScaleLimits = useMemo<PlacementScaleLimits>(() => {
    if (!placementTarget || placementTarget.kind === 'rock') return ROCK_PLACEMENT_SCALE_LIMITS
    const instance = accessories.find((candidate) => candidate.id === placementTarget.instanceId)
    return instance ? { min: instance.scaleMin, max: instance.scaleMax } : { min: 1, max: 1 }
  }, [accessories, placementTarget])


const handlePlacementTransformDraft = useCallback((transform: PlacementTransform) => {
  if (!placementTarget || !placementDraftKey) return
  setActivePlacementDraft({ key: placementDraftKey, transform })
  if (placementTarget.kind === 'rock') {
    onRockPoseDraft?.({ position: [...transform.position], rotation: [...transform.rotation] })
  } else {
    onAccessoryPlacementDraft?.(placementTarget.instanceId, transform)
  }
}, [onAccessoryPlacementDraft, onRockPoseDraft, placementDraftKey, placementTarget])


const handlePlacementTransformEnd = useCallback((transform: PlacementTransform) => {
  if (!placementTarget || placementTarget.kind !== 'accessory') return
  onAccessoryPlacementDraft?.(placementTarget.instanceId, transform)
}, [onAccessoryPlacementDraft, placementTarget])

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

            {rockColliderObject && rockGeometry ? (
              <PlacementBody
                bodyKey="rock"
                state={globalSettling ? 'settling' : placementRockTarget ? 'editing' : 'fixed'}
                transform={{
                  position: [...rockPose.position],
                  rotation: [...rockPose.rotation],
                  scale: 1,
                }}
                geometry={rockGeometry}
                physics={ROCK_PLACEMENT_BODY_PHYSICS}
                includeInvisible
                onTransformFrame={handleRockPhysicsTransform}
                onSettled={handleRockBodySettled}
              >
                <primitive object={rockColliderObject} />
              </PlacementBody>
            ) : null}

            {accessories.map((instance) => (
              <AccessoryModel
                key={instance.id}
                instance={instance}
                selected={selectedAccessoryId === instance.id}
                rockPose={rockPose}
                compositionFrozen={placementMode || accessorySettling}
                globalSettling={globalSettling}
                settlingRequested={accessorySettling && placementTarget?.kind === 'accessory' && placementTarget.instanceId === instance.id}
                onSettledWorld={onAccessorySettled}
                onGlobalSettled={handleAccessorySettled}
                placementTransform={(placementMode || accessorySettling) && placementTarget?.kind === 'accessory' && placementTarget.instanceId === instance.id
                  ? activePlacementDraft?.transform ?? null
                  : null}
                onPlacementGeometryReady={handleAccessoryGeometryReady}
                onLoadStateChange={onAccessoryLoadStateChange}
                onDisposed={onAccessoryDisposed}
              />
            ))}


{placementMode && placementTarget && activePlacementDraft?.key === placementDraftKey ? (
  <PlacementController
    target={placementTarget}
    tool={placementTool}
    transform={activePlacementDraft.transform}
    geometry={placementGeometry}
    scaleLimits={placementScaleLimits}
    onTransformChange={handlePlacementTransformDraft}
    onTransformEnd={handlePlacementTransformEnd}
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

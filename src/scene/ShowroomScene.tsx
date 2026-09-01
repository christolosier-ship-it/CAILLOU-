import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Physics, RigidBody } from '@react-three/rapier'
import { Suspense, useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { Box3, MathUtils, PerspectiveCamera, Sphere, Vector3 } from 'three'
import type { Object3D } from 'three'

import { ACCESSORY_WORLD_GRAVITY } from '../features/accessories/accessoryPhysics'
import type { AccessoryTransform, EquippedAccessoryInstance } from '../features/accessories/accessoryTypes'
import type { RockCatalogEntry } from '../content/rockCatalog'
import { AccessoryModel } from './AccessoryModel'
import { RockModel } from './RockModel'
import type { RockLoadState, RockSurfacePointerSample } from './RockModel'
import type { DisposalReport } from './rockResources'

export type ShowroomInteractionMode = 'orbit' | 'caress' | 'cleaning' | 'accessory'

interface ShowroomSceneProps {
  rock: RockCatalogEntry
  retryKey: number
  reducedMotion: boolean
  onLoadStateChange: (state: RockLoadState, message?: string) => void
  onInteractionChange: (active: boolean) => void
  interactionMode?: ShowroomInteractionMode
  dustAmount?: number
  dustRevision?: number
  onSurfacePointerDown?: (sample: RockSurfacePointerSample) => void
  onSurfacePointerMove?: (sample: RockSurfacePointerSample) => void
  onSurfacePointerUp?: (sample: RockSurfacePointerSample) => void
  onSurfacePointerCancel?: (sample: RockSurfacePointerSample) => void
  accessories?: EquippedAccessoryInstance[]
  selectedAccessoryId?: string | null
  onAccessorySelect?: (instanceId: string) => void
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

function RockPhysicsCollider({ object }: { object: Object3D }) {
  const colliderObject = useMemo(() => {
    const clone = object.clone(true)
    clone.name = 'CAILLOU_STATIC_PHYSICS_COLLIDER'
    clone.visible = false
    return clone
  }, [object])

  return (
    <RigidBody type="fixed" colliders="trimesh" includeInvisible friction={0.86} restitution={0.02}>
      <primitive object={colliderObject} />
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
  dustAmount = 0,
  dustRevision = 0,
  onSurfacePointerDown,
  onSurfacePointerMove,
  onSurfacePointerUp,
  onSurfacePointerCancel,
  accessories = [],
  selectedAccessoryId = null,
  onAccessorySelect,
  onAccessoryTransformCommit,
  onAccessoryLoadStateChange,
  onAccessoryDisposed,
}: ShowroomSceneProps) {
  const [object, setObject] = useState<Object3D | null>(null)
  const handleObjectReady = useCallback((nextObject: Object3D | null) => setObject(nextObject), [])
  const surfaceMode = interactionMode === 'caress' || interactionMode === 'cleaning'
  const cleaningMode = interactionMode === 'cleaning'
  const accessoryMode = interactionMode === 'accessory'
  const orbitMode = interactionMode === 'orbit'

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
            <group>
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

              {object ? <RockPhysicsCollider object={object} /> : null}

              {accessories.map((instance) => (
                <AccessoryModel
                  key={instance.id}
                  instance={instance}
                  selected={selectedAccessoryId === instance.id}
                  editing={accessoryMode}
                  rockObject={object}
                  onSelect={(instanceId) => onAccessorySelect?.(instanceId)}
                  onTransformCommit={(instanceId, transform) => onAccessoryTransformCommit?.(instanceId, transform)}
                  onLoadStateChange={onAccessoryLoadStateChange}
                  onDisposed={onAccessoryDisposed}
                />
              ))}
            </group>
          </Physics>
        </Suspense>

        <AutoFitCamera object={object} />
        {object ? (
          <ContactShadows
            key={`${rock.id}-${retryKey}-shadow`}
            position={[0, -0.02, 0]}
            opacity={0.3}
            scale={5.5}
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

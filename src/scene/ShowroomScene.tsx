import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useCallback, useLayoutEffect, useState } from 'react'
import { Box3, MathUtils, PerspectiveCamera, Sphere, Vector3 } from 'three'
import type { Object3D } from 'three'

import type { RockCatalogEntry } from '../content/rockCatalog'
import { RockModel } from './RockModel'
import type { RockLoadState } from './RockModel'

interface ShowroomSceneProps {
  rock: RockCatalogEntry
  retryKey: number
  reducedMotion: boolean
  onLoadStateChange: (state: RockLoadState, message?: string) => void
  onInteractionChange: (active: boolean) => void
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

export function ShowroomScene({
  rock,
  retryKey,
  reducedMotion,
  onLoadStateChange,
  onInteractionChange,
}: ShowroomSceneProps) {
  const [object, setObject] = useState<Object3D | null>(null)
  const handleObjectReady = useCallback((nextObject: Object3D | null) => setObject(nextObject), [])

  return (
    <div
      className="showroom-canvas"
      onPointerDown={() => onInteractionChange(true)}
      onPointerUp={() => onInteractionChange(false)}
      onPointerCancel={() => onInteractionChange(false)}
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

        <RockModel
          key={`${rock.id}-${retryKey}`}
          path={rock.modelPath}
          onLoadStateChange={onLoadStateChange}
          onObjectReady={handleObjectReady}
        />
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

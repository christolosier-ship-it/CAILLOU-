import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import { Box3, MathUtils, PerspectiveCamera, Sphere, Vector3 } from 'three'
import type { Object3D } from 'three'

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

interface SceneCameraControllerProps {
  object: Object3D | null
  enabled: boolean
  reducedMotion: boolean
}

export function SceneCameraController({
  object,
  enabled,
  reducedMotion,
}: SceneCameraControllerProps) {
  return (
    <>
      <AutoFitCamera object={object} />
      <OrbitControls
        makeDefault
        enabled={enabled}
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        rotateSpeed={0.62}
        zoomSpeed={0.72}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 1.95}
      />
    </>
  )
}

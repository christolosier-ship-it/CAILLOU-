import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, PerspectiveCamera, Quaternion, Vector3 } from 'three'

import type { PlacementCollisionMotion } from './placementCollisionSolver'
import type { PlacementGeometry } from './placementGeometry'
import { resolvePlacementGesture } from './placementGesturePolicy'
import type {
  PlacementScaleLimits,
  PlacementTarget,
  PlacementTool,
  PlacementTransform,
} from './placementTypes'
import { normalizePlacementTransform } from './placementTransform'
import { usePlacementCollisionResolver } from './usePlacementCollisionResolver'

interface GesturePoint {
  x: number
  y: number
}

interface PlacementInteractionControllerProps {
  target: PlacementTarget
  tool: PlacementTool
  transform: PlacementTransform
  geometry: PlacementGeometry | null
  scaleLimits: PlacementScaleLimits
  onTransformChange: (transform: PlacementTransform) => void
  onTransformEnd: (transform: PlacementTransform) => void
}

export function PlacementInteractionController({
  target,
  tool,
  transform,
  geometry,
  scaleLimits,
  onTransformChange,
  onTransformEnd,
}: PlacementInteractionControllerProps) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const resolveCollision = usePlacementCollisionResolver(target, geometry)
  const pointersRef = useRef(new Map<number, GesturePoint>())
  const previousSingleRef = useRef<GesturePoint | null>(null)
  const baselineRef = useRef<{ distance: number; angle: number; transform: PlacementTransform } | null>(null)
  const transformRef = useRef(transform)
  const stateRef = useRef({ target, tool, geometry, scaleLimits })
  stateRef.current = { target, tool, geometry, scaleLimits }

  useEffect(() => {
    transformRef.current = transform
  }, [transform])

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
    const publish = (next: PlacementTransform, motion: PlacementCollisionMotion) => {
      const current = stateRef.current
      const desired = normalizePlacementTransform(next, current.scaleLimits)
      const safe = resolveCollision(transformRef.current, desired, motion)
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
          publish({ ...baseline.transform, position: [base.x, base.y, base.z] }, 'translation')
        } else if (action === 'twist-orientation') {
          const twist = angle(items) - baseline.angle
          const axis = camera.getWorldDirection(new Vector3()).normalize()
          const nextRotation = new Quaternion().setFromAxisAngle(axis, twist)
            .multiply(new Quaternion(...baseline.transform.rotation))
            .normalize()
          publish({ ...baseline.transform, rotation: [nextRotation.x, nextRotation.y, nextRotation.z, nextRotation.w] }, 'rotation')
        } else if (action === 'uniform-scale') {
          const ratio = Math.max(0.2, distance(items) / baseline.distance)
          publish({ ...baseline.transform, scale: baseline.transform.scale * ratio }, 'scale')
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
        publish({ ...active, position: [next.x, next.y, next.z] }, 'translation')
      } else if (action === 'free-orientation') {
        const cameraUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
        const cameraRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
        const yaw = new Quaternion().setFromAxisAngle(cameraUp, dx * 0.008)
        const pitch = new Quaternion().setFromAxisAngle(cameraRight, dy * 0.008)
        const next = yaw.multiply(pitch).multiply(new Quaternion(...active.rotation)).normalize()
        publish({ ...active, rotation: [next.x, next.y, next.z, next.w] }, 'rotation')
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
  }, [camera, gl, invalidate, onTransformChange, onTransformEnd, resolveCollision])

  return null
}

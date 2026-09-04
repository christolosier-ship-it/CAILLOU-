import { useRapier } from '@react-three/rapier'
import { useCallback } from 'react'
import { MathUtils, Quaternion, Vector3 } from 'three'

import {
  interpolatePlacementCollisionTransform,
  maximalValidPlacementFraction,
} from './placementCollisionSolver'
import type { PlacementCollisionMotion } from './placementCollisionSolver'
import { constrainTransformToPedestal } from './placementConstraints'
import type { PlacementGeometry } from './placementGeometry'
import type { PlacementTarget, PlacementTransform } from './placementTypes'

const COLLISION_TARGET_DISTANCE = 0.00025
const ROTATION_SAMPLE_RADIANS = MathUtils.degToRad(2.5)
const MAX_ROTATION_STEPS = 64
const MAX_SCALE_STEPS = 32
const COLLISION_REFINEMENT_STEPS = 9
const LEGACY_PENETRATION_EPSILON = 0.000001

function placementTargetId(target: PlacementTarget) {
  return target.kind === 'rock' ? 'rock' : `accessory:${target.instanceId}`
}

function quaternionAngle(from: readonly number[], to: readonly number[]) {
  const left = new Quaternion(...from).normalize()
  const right = new Quaternion(...to).normalize()
  return 2 * Math.acos(Math.min(1, Math.abs(left.dot(right))))
}

function scaledBounds(geometry: PlacementGeometry, scale: number) {
  const min = new Vector3(...geometry.colliderBounds.min).multiplyScalar(scale)
  const max = new Vector3(...geometry.colliderBounds.max).multiplyScalar(scale)
  const center = min.clone().add(max).multiplyScalar(0.5)
  const half = max.clone().sub(min).multiplyScalar(0.5)
  return { center, half }
}

function shapeWorldPosition(transform: PlacementTransform, localCenter: Vector3) {
  const rotation = new Quaternion(...transform.rotation).normalize()
  const center = localCenter.clone().applyQuaternion(rotation)
  return {
    x: transform.position[0] + center.x,
    y: transform.position[1] + center.y,
    z: transform.position[2] + center.z,
  }
}

function shapeWorldRotation(transform: PlacementTransform) {
  return {
    x: transform.rotation[0],
    y: transform.rotation[1],
    z: transform.rotation[2],
    w: transform.rotation[3],
  }
}

function shapeCastTime(hit: unknown) {
  if (!hit || typeof hit !== 'object') return null
  const candidate = hit as { time_of_impact?: unknown; timeOfImpact?: unknown }
  const raw = typeof candidate.time_of_impact === 'number'
    ? candidate.time_of_impact
    : typeof candidate.timeOfImpact === 'number'
      ? candidate.timeOfImpact
      : null
  return raw !== null && Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : null
}

export function usePlacementCollisionResolver(
  target: PlacementTarget,
  geometry: PlacementGeometry | null,
) {
  const { rapier, world } = useRapier()

  return useCallback((
    current: PlacementTransform,
    desired: PlacementTransform,
    motion: PlacementCollisionMotion,
  ): PlacementTransform => {
    if (!geometry) return desired

    world.propagateModifiedBodyPositionsToColliders()
    const activeObjectId = placementTargetId(target)
    type FilterPredicate = NonNullable<Parameters<typeof world.castShape>[11]>
    type ColliderDescriptor = ReturnType<typeof rapier.ColliderDesc.cuboid>
    type WorldCollider = Parameters<Parameters<typeof world.forEachCollider>[0]>[0]

    const baseFilter: FilterPredicate = (collider) => {
      if (collider.isSensor()) return false
      const parent = collider.parent()
      if (!parent) return true
      const userData = parent.userData as {
        placementObjectId?: unknown
        placementBoundary?: unknown
      } | undefined
      if (userData?.placementBoundary === 'pedestal-floor') return false
      return userData?.placementObjectId !== activeObjectId
    }

    const createQueryShape = (transform: PlacementTransform) => {
      const { collision } = target.profile
      const safeScale = Math.max(0.0001, transform.scale)
      const bounds = scaledBounds(geometry, safeScale)
      let descriptor: ColliderDescriptor
      let localCenter = new Vector3()

      if (collision.strategy === 'primitive' && collision.shape === 'cuboid') {
        descriptor = rapier.ColliderDesc.cuboid(
          Math.max(0.0001, bounds.half.x),
          Math.max(0.0001, bounds.half.y),
          Math.max(0.0001, bounds.half.z),
        )
        localCenter = bounds.center
      } else if (collision.strategy === 'primitive' && collision.shape === 'ball') {
        descriptor = rapier.ColliderDesc.ball(Math.max(0.0001, bounds.half.length()))
        localCenter = bounds.center
      } else if (collision.strategy === 'primitive' && collision.shape === 'capsule') {
        const radius = Math.max(0.0001, bounds.half.x, bounds.half.z)
        descriptor = rapier.ColliderDesc.capsule(
          Math.max(0.0001, bounds.half.y - radius),
          radius,
        )
        localCenter = bounds.center
      } else {
        const vertices = new Float32Array(geometry.supportPoints.length * 3)
        geometry.supportPoints.forEach((point, index) => {
          vertices[index * 3] = point[0] * safeScale
          vertices[index * 3 + 1] = point[1] * safeScale
          vertices[index * 3 + 2] = point[2] * safeScale
        })
        const hull = rapier.ColliderDesc.convexHull(vertices)
        if (hull) {
          descriptor = hull
        } else {
          descriptor = rapier.ColliderDesc.cuboid(
            Math.max(0.0001, bounds.half.x),
            Math.max(0.0001, bounds.half.y),
            Math.max(0.0001, bounds.half.z),
          )
          localCenter = bounds.center
        }
      }

      return {
        shape: descriptor.shape,
        position: shapeWorldPosition(transform, localCenter),
        rotation: shapeWorldRotation(transform),
      }
    }

    const currentQuery = createQueryShape(current)
    const legacyPenetrations: WorldCollider[] = []

    world.forEachCollider((collider) => {
      if (!baseFilter(collider)) return
      const contact = collider.contactShape(
        currentQuery.shape,
        currentQuery.position,
        currentQuery.rotation,
        0,
      )
      if (contact && contact.distance < -LEGACY_PENETRATION_EPSILON) {
        legacyPenetrations.push(collider)
      }
    })

    const regularFilter: FilterPredicate = (collider) => baseFilter(collider)
      && !legacyPenetrations.some((entry) => entry.handle === collider.handle)

    const constrainedDesired = constrainTransformToPedestal(desired, geometry)

    if (motion === 'translation') {
      const velocity = {
        x: constrainedDesired.position[0] - current.position[0],
        y: constrainedDesired.position[1] - current.position[1],
        z: constrainedDesired.position[2] - current.position[2],
      }
      if (Math.hypot(velocity.x, velocity.y, velocity.z) <= 0.000001) return constrainedDesired

      const hit = world.castShape(
        currentQuery.position,
        currentQuery.rotation,
        velocity,
        currentQuery.shape,
        COLLISION_TARGET_DISTANCE,
        1,
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        regularFilter,
      )
      const time = shapeCastTime(hit)
      if (time === null || time >= 1) return constrainedDesired
      return interpolatePlacementCollisionTransform(current, constrainedDesired, 'translation', time)
    }

    if (motion === 'scale' && constrainedDesired.scale <= current.scale) {
      return constrainedDesired
    }

    let firstBlockingObjectId: string | null = null
    const isCandidateValid = (fraction: number) => {
      const interpolated = interpolatePlacementCollisionTransform(current, constrainedDesired, motion, fraction)
      const candidate = constrainTransformToPedestal(interpolated, geometry)
      const query = createQueryShape(candidate)
      const intersection = world.intersectionWithShape(
        query.position,
        query.rotation,
        query.shape,
        undefined,
        undefined,
        undefined,
        undefined,
        regularFilter,
      ) as WorldCollider | null
      if (intersection && firstBlockingObjectId === null) {
        const parent = intersection.parent()
        const userData = parent?.userData as {
          placementObjectId?: unknown
          placementBoundary?: unknown
        } | undefined
        firstBlockingObjectId = typeof userData?.placementObjectId === 'string'
          ? userData.placementObjectId
          : typeof userData?.placementBoundary === 'string'
            ? userData.placementBoundary
            : `collider:${intersection.handle}`
      }
      return intersection === null
    }

    const coarseSteps = motion === 'rotation'
      ? Math.max(1, Math.min(
        MAX_ROTATION_STEPS,
        Math.ceil(quaternionAngle(current.rotation, constrainedDesired.rotation) / ROTATION_SAMPLE_RADIANS),
      ))
      : Math.max(1, Math.min(
        MAX_SCALE_STEPS,
        Math.ceil(Math.abs(constrainedDesired.scale - current.scale) / Math.max(0.02, current.scale * 0.04)),
      ))

    const fraction = maximalValidPlacementFraction(
      isCandidateValid,
      coarseSteps,
      COLLISION_REFINEMENT_STEPS,
    )
    if (import.meta.env.DEV && motion === 'rotation' && fraction < 0.9999) {
      console.debug('[CAILLOU placement collision] rotation bounded', JSON.stringify({
        target: activeObjectId,
        blocker: firstBlockingObjectId,
        fraction,
        currentPosition: current.position,
        currentRotation: current.rotation,
        desiredPosition: constrainedDesired.position,
        desiredRotation: constrainedDesired.rotation,
        legacyPenetrations: legacyPenetrations.map((collider) => collider.handle),
      }))
    }
    const resolved = interpolatePlacementCollisionTransform(current, constrainedDesired, motion, fraction)
    return constrainTransformToPedestal(resolved, geometry)
  }, [geometry, rapier, target, world])
}

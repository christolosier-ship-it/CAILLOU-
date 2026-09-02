import { Box3, Mesh, Vector3 } from 'three'
import type { Object3D } from 'three'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js'

import type { PlacementBounds, PlacementVector3 } from './placementTypes'

export interface PlacementGeometry {
  supportPoints: PlacementVector3[]
  colliderBounds: PlacementBounds
}

const FALLBACK_SUPPORT_POINTS: PlacementVector3[] = [
  [-0.5, -0.5, -0.5],
  [-0.5, -0.5, 0.5],
  [-0.5, 0.5, -0.5],
  [-0.5, 0.5, 0.5],
  [0.5, -0.5, -0.5],
  [0.5, -0.5, 0.5],
  [0.5, 0.5, -0.5],
  [0.5, 0.5, 0.5],
]

const SUPPORT_POINT_PRECISION = 100_000

function tuple(point: Vector3): PlacementVector3 {
  return [point.x, point.y, point.z]
}

function pointKey(point: Vector3) {
  return [point.x, point.y, point.z]
    .map((value) => Math.round(value * SUPPORT_POINT_PRECISION))
    .join('|')
}

function geometryFromPoints(points: PlacementVector3[]): PlacementGeometry {
  const bounds = new Box3()
  for (const point of points) bounds.expandByPoint(new Vector3(...point))
  return {
    supportPoints: points,
    colliderBounds: {
      min: [bounds.min.x, bounds.min.y, bounds.min.z],
      max: [bounds.max.x, bounds.max.y, bounds.max.z],
    },
  }
}

function convexSupportPoints(points: Vector3[]): PlacementVector3[] {
  if (points.length < 4) return points.map(tuple)
  try {
    const hullGeometry = new ConvexGeometry(points)
    const position = hullGeometry.getAttribute('position')
    const supportPoints: PlacementVector3[] = []
    const seen = new Set<string>()
    const point = new Vector3()

    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index)
      const key = pointKey(point)
      if (seen.has(key)) continue
      seen.add(key)
      supportPoints.push(tuple(point))
    }
    hullGeometry.dispose()
    return supportPoints.length > 0 ? supportPoints : points.map(tuple)
  } catch {
    return points.map(tuple)
  }
}

export function createPlacementGeometry(root: Object3D): PlacementGeometry {
  root.updateWorldMatrix(true, true)
  const inverseRoot = root.matrixWorld.clone().invert()
  const rawPoints: Vector3[] = []
  const seen = new Set<string>()
  const point = new Vector3()

  root.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const position = child.geometry.getAttribute('position')
    if (!position) return

    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index)
        .applyMatrix4(child.matrixWorld)
        .applyMatrix4(inverseRoot)
      if (![point.x, point.y, point.z].every(Number.isFinite)) continue
      const key = pointKey(point)
      if (seen.has(key)) continue
      seen.add(key)
      rawPoints.push(point.clone())
    }
  })

  const supportPoints = rawPoints.length > 0
    ? convexSupportPoints(rawPoints)
    : FALLBACK_SUPPORT_POINTS.map((value) => [...value] as PlacementVector3)

  return geometryFromPoints(supportPoints)
}

import { Vector3 } from 'three'
import type { BufferAttribute, Matrix4, Mesh, Object3D } from 'three'

export const MAX_ACCESSORY_COLLIDER_PARTS = 12
export const MAX_ACCESSORY_COLLIDER_VERTICES_PER_PART = 4096

function quantizedKey(point: Vector3) {
  return `${Math.round(point.x * 100000)}:${Math.round(point.y * 100000)}:${Math.round(point.z * 100000)}`
}

function meshVerticesInRootSpace(rootInverse: Matrix4, mesh: Mesh, position: BufferAttribute) {
  const transform = rootInverse.clone().multiply(mesh.matrixWorld)
  const point = new Vector3()
  const seen = new Set<string>()
  const values: number[] = []

  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index).applyMatrix4(transform)
    const key = quantizedKey(point)
    if (seen.has(key)) continue
    seen.add(key)
    values.push(point.x, point.y, point.z)
  }

  return values
}

export function createConvexColliderParts(root: Object3D): Float32Array[] {
  root.updateWorldMatrix(true, true)
  const rootInverse = root.matrixWorld.clone().invert()
  const parts: Float32Array[] = []

  root.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    const position = mesh.geometry?.getAttribute('position') as BufferAttribute | undefined
    if (!position || position.count < 4) return

    const values = meshVerticesInRootSpace(rootInverse, mesh, position)
    const vertexCount = values.length / 3
    if (vertexCount < 4) return
    if (vertexCount > MAX_ACCESSORY_COLLIDER_VERTICES_PER_PART) {
      throw new Error(
        `Accessory collider part exceeds ${MAX_ACCESSORY_COLLIDER_VERTICES_PER_PART} vertices (${vertexCount}).`,
      )
    }
    parts.push(Float32Array.from(values))
  })

  if (parts.length === 0) {
    throw new Error('Accessory collider contains no usable convex part.')
  }
  if (parts.length > MAX_ACCESSORY_COLLIDER_PARTS) {
    throw new Error(`Accessory collider exceeds ${MAX_ACCESSORY_COLLIDER_PARTS} convex parts (${parts.length}).`)
  }

  return parts
}

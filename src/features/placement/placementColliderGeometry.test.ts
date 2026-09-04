import { BoxGeometry, BufferAttribute, BufferGeometry, Group, Mesh } from 'three'
import { describe, expect, it } from 'vitest'

import {
  MAX_ACCESSORY_COLLIDER_VERTICES_PER_PART,
  createConvexColliderParts,
} from './placementColliderGeometry'

describe('V2-03 prepared convex collider geometry', () => {
  it('keeps one convex part per prepared mesh in root coordinates', () => {
    const root = new Group()
    const left = new Mesh(new BoxGeometry(1, 1, 1))
    const right = new Mesh(new BoxGeometry(1, 1, 1))
    left.position.x = -1
    right.position.x = 1
    root.add(left, right)

    const parts = createConvexColliderParts(root)
    expect(parts).toHaveLength(2)
    expect(Math.max(...parts[1])).toBeGreaterThan(1)

    left.geometry.dispose()
    right.geometry.dispose()
  })

  it('rejects a collider part that exceeds the runtime vertex budget', () => {
    const count = MAX_ACCESSORY_COLLIDER_VERTICES_PER_PART + 1
    const geometry = new BufferGeometry()
    const vertices = new Float32Array(count * 3)
    for (let index = 0; index < count; index += 1) {
      vertices[index * 3] = index * 0.0001
      vertices[index * 3 + 1] = (index % 7) * 0.0001
      vertices[index * 3 + 2] = (index % 11) * 0.0001
    }
    geometry.setAttribute('position', new BufferAttribute(vertices, 3))
    const root = new Group()
    root.add(new Mesh(geometry))

    expect(() => createConvexColliderParts(root)).toThrow('exceeds 4096 vertices')
    geometry.dispose()
  })
})

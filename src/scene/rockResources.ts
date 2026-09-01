import { Mesh, Texture } from 'three'
import type { BufferGeometry, Material, Object3D } from 'three'

export interface DisposalReport {
  geometries: number
  materials: number
  textures: number
}

export function disposeRockObject(root: Object3D): DisposalReport {
  const geometries = new Set<BufferGeometry>()
  const materials = new Set<Material>()
  const textures = new Set<Texture>()

  root.traverse((child) => {
    if (!(child instanceof Mesh)) return
    geometries.add(child.geometry)

    const childMaterials = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of childMaterials) {
      materials.add(material)
      for (const value of Object.values(material)) {
        if (value instanceof Texture) textures.add(value)
      }
    }
  })

  for (const texture of textures) texture.dispose()
  for (const material of materials) material.dispose()
  for (const geometry of geometries) geometry.dispose()

  return {
    geometries: geometries.size,
    materials: materials.size,
    textures: textures.size,
  }
}

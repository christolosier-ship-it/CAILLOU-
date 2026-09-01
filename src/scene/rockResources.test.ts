import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { disposeRockObject } from './rockResources'

describe('rock GPU resource disposal', () => {
  it('disposes shared geometry, material and textures exactly once', () => {
    const root = new Group()
    const geometry = new BoxGeometry()
    const texture = new Texture()
    const material = new MeshStandardMaterial({ map: texture, normalMap: texture })
    root.add(new Mesh(geometry, material), new Mesh(geometry, material))

    const geometryDispose = vi.spyOn(geometry, 'dispose')
    const materialDispose = vi.spyOn(material, 'dispose')
    const textureDispose = vi.spyOn(texture, 'dispose')

    expect(disposeRockObject(root)).toEqual({ geometries: 1, materials: 1, textures: 1 })
    expect(geometryDispose).toHaveBeenCalledTimes(1)
    expect(materialDispose).toHaveBeenCalledTimes(1)
    expect(textureDispose).toHaveBeenCalledTimes(1)
  })
})

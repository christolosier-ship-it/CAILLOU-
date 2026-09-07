import { describe, expect, it, vi } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three'
import { createPaintMaterialAdapter } from './paintMaterial'
import { NATURAL_APPEARANCE } from './paintRules'

describe('non-destructive material adapter', () => {
  it('restores exact references across multiple meshes/material slots, without changing sources or geometry', () => {
    const colorMap = new Texture(); const normal = new Texture()
    const first = new MeshStandardMaterial({ color: '#123456', map: colorMap, normalMap: normal, roughness: .84, metalness: .02 })
    const second = new MeshStandardMaterial({ color: '#abcdef', roughness: .7 })
    const root = new Group(); const sharedScene = new Mesh(new BoxGeometry(), first)
    const one = new Mesh(new BoxGeometry(), first); const slots = [first, second]
    const two = new Mesh(new BoxGeometry(), slots); root.add(one, two)
    const dust = new Mesh(one.geometry, second); dust.name = 'CAILLOU_DUST_OVERLAY'; one.add(dust)
    const geometry = one.geometry; const version = first.version
    const adapter = createPaintMaterialAdapter(root)
    expect(adapter.materialCount).toBe(2)
    adapter.apply({ version: 1, mode: 'solid', color: '#ffffff', finish: 'glossy' })
    const clone = one.material; const dispose = vi.spyOn(clone, 'dispose'); const sourceDispose = vi.spyOn(colorMap, 'dispose')
    expect(clone).not.toBe(first); expect(clone.map).toBeNull(); expect(clone.normalMap).toBe(normal)
    expect(two.material[0]).toBe(clone); expect(dust.material).toBe(second)
    const cloneVersion = clone.version
    for (let i = 0; i < 60; i++) {
      adapter.apply(NATURAL_APPEARANCE)
      expect(one.material).toBe(first); expect(two.material).toBe(slots)
      adapter.apply({ version: 1, mode: 'solid', color: '#a66f3f', finish: 'matte' })
      expect(one.material).toBe(clone)
    }
    expect(clone.version).toBe(cloneVersion)
    expect(first.version).toBe(version); expect(first.color.getHexString()).toBe('123456'); expect(first.map).toBe(colorMap)
    expect(sharedScene.material).toBe(first); expect(one.geometry).toBe(geometry)
    adapter.dispose(); adapter.dispose()
    expect(one.material).toBe(first); expect(two.material).toBe(slots)
    expect(dispose).toHaveBeenCalledTimes(1); expect(sourceDispose).not.toHaveBeenCalled()
    root.clear(); geometry.dispose(); two.geometry.dispose(); sharedScene.geometry.dispose(); first.dispose(); second.dispose(); colorMap.dispose(); normal.dispose()
  })
})

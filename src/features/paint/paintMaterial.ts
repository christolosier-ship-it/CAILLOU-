import { Mesh, MeshStandardMaterial } from 'three'
import type { Material, Object3D } from 'three'
import { PAINT_FINISHES } from './paintRules'
import type { RockAppearance } from './paintRules'

// One adapter per loaded instance. Originals and source textures are never mutated.
export function createPaintMaterialAdapter(root: Object3D) {
  const clones = new Map<Material, MeshStandardMaterial>()
  const targets: Array<{ mesh: Mesh; natural: Material | Material[]; solid: Material | Material[] }> = []
  let disposed = false
  const painted = (source: Material): Material => {
    if (!(source instanceof MeshStandardMaterial)) return source
    const existing = clones.get(source)
    if (existing) return existing
    const clone = source.clone()
    clone.name = `${source.name}:paint-v1`
    clone.map = null
    clone.roughnessMap = null
    clone.metalnessMap = null
    clone.metalness = 0
    clone.vertexColors = false
    clone.emissive.set(0)
    clone.emissiveMap = null
    clones.set(source, clone)
    return clone
  }
  root.traverse((object) => {
    if (!(object instanceof Mesh) || object.name === 'CAILLOU_DUST_OVERLAY') return
    const natural = object.material
    targets.push({ mesh: object, natural, solid: Array.isArray(natural) ? natural.map(painted) : painted(natural) })
  })
  const restore = () => { for (const target of targets) target.mesh.material = target.natural }
  return {
    materialCount: clones.size,
    apply(appearance: RockAppearance) {
      if (disposed) return
      if (appearance.mode === 'natural') { restore(); return }
      const roughness = PAINT_FINISHES.find((f) => f.id === appearance.finish)!.roughness
      for (const material of clones.values()) {
        material.color.set(appearance.color)
        material.roughness = roughness
        // Uniform-only changes: no needsUpdate/recompilation on color/finish input.
      }
      for (const target of targets) target.mesh.material = target.solid
    },
    dispose() {
      if (disposed) return
      disposed = true
      restore()
      for (const material of clones.values()) material.dispose()
      clones.clear()
    },
  }
}

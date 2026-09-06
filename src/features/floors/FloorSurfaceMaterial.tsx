import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three'
import type { MeshStandardMaterial, Texture } from 'three'
import { BASE_FLOOR_MATERIAL } from './floorRules'
import type { FloorMaterial } from './floorTypes'

// This component only owns material resources. The floor mesh/body/collider keep their identity.
export function FloorSurfaceMaterial({ descriptor = BASE_FLOOR_MATERIAL }: { descriptor?: FloorMaterial | undefined }) {
  const material = useRef<MeshStandardMaterial>(null)
  const { gl, invalidate } = useThree()
  // Scalar dependencies avoid reloads when the server returns an equivalent descriptor object.
  const { color, roughness, metalness, normalScale, colorMap, normalMap, roughnessMap } = descriptor
  const [repeatX, repeatY] = descriptor.repeat
  useEffect(() => {
    const target = material.current
    if (!target) return
    let disposed = false
    const textures: Texture[] = []
    target.color.set(color)
    target.roughness = roughness
    target.metalness = metalness
    target.normalScale.set(normalScale, normalScale)
    target.userData.floorStatus = colorMap ? 'loading' : 'ready'
    target.needsUpdate = true
    invalidate()
    const loader = new TextureLoader()
    const definitions = [
      ['map', colorMap], ['normalMap', normalMap], ['roughnessMap', roughnessMap],
    ] as const
    const requests = definitions.filter(([, path]) => !!path).map(([slot, path]) => new Promise<void>((resolve) => {
      const texture = loader.load(path!, (loaded) => {
        if (disposed) { loaded.dispose(); resolve(); return }
        loaded.wrapS = loaded.wrapT = RepeatWrapping
        loaded.repeat.set(repeatX, repeatY)
        loaded.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
        if (slot === 'map') loaded.colorSpace = SRGBColorSpace
        loaded.needsUpdate = true
        target[slot] = loaded
        target.needsUpdate = true
        invalidate()
        resolve()
      }, undefined, () => {
        if (!disposed) { target.userData.floorStatus = 'fallback'; invalidate() }
        resolve()
      })
      textures.push(texture)
    }))
    void Promise.all(requests).then(() => {
      if (!disposed && target.userData.floorStatus !== 'fallback') {
        target.userData.floorStatus = 'ready'
        invalidate()
      }
    })
    return () => {
      disposed = true
      target.map = target.normalMap = target.roughnessMap = null
      target.needsUpdate = true
      textures.forEach((texture) => texture.dispose())
      invalidate()
    }
  }, [color, roughness, metalness, normalScale, colorMap, normalMap, roughnessMap, repeatX, repeatY, gl, invalidate])
  return <meshStandardMaterial ref={material} color={color} roughness={roughness} metalness={metalness} />
}

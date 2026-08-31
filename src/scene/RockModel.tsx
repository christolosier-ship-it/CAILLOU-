import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { Material, Mesh, Texture } from 'three'

function disposeMaterial(material: Material) {
  for (const value of Object.values(material)) {
    if (value instanceof Texture) value.dispose()
  }
  material.dispose()
}

export function RockModel({ path }: { path: string }) {
  const gltf = useGLTF(path)
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene])

  useEffect(() => {
    scene.traverse((child) => {
      if (!(child instanceof Mesh)) return
      child.castShadow = true
      child.receiveShadow = true
    })

    return () => {
      scene.traverse((child) => {
        if (!(child instanceof Mesh)) return
        child.geometry.dispose()
        if (Array.isArray(child.material)) child.material.forEach(disposeMaterial)
        else disposeMaterial(child.material)
      })
      useGLTF.clear(path)
    }
  }, [path, scene])

  return <primitive object={scene} />
}

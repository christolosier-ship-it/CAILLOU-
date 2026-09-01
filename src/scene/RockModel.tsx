import { useEffect, useState } from 'react'
import { Mesh } from 'three'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { disposeRockObject } from './rockResources'

export type RockLoadState = 'loading' | 'ready' | 'error'

interface RockModelProps {
  path: string
  onLoadStateChange?: (state: RockLoadState, message?: string) => void
  onObjectReady?: (object: Object3D | null) => void
}

export function RockModel({ path, onLoadStateChange, onObjectReady }: RockModelProps) {
  const [object, setObject] = useState<Object3D | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const loader = new GLTFLoader()
    let active = true
    let loadedObject: Object3D | null = null

    onLoadStateChange?.('loading')
    onObjectReady?.(null)

    async function load() {
      try {
        const response = await fetch(path, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const buffer = await response.arrayBuffer()
        if (!active || controller.signal.aborted) return

        const assetUrl = new URL(path, window.location.href)
        const resourcePath = assetUrl.href.slice(0, assetUrl.href.lastIndexOf('/') + 1)
        const gltf = await loader.parseAsync(buffer, resourcePath)
        loadedObject = gltf.scene

        loadedObject.traverse((child) => {
          if (!(child instanceof Mesh)) return
          child.castShadow = true
          child.receiveShadow = true
        })

        if (!active || controller.signal.aborted) {
          disposeRockObject(loadedObject)
          loadedObject = null
          return
        }

        setObject(loadedObject)
        onObjectReady?.(loadedObject)
        onLoadStateChange?.('ready')
      } catch (error) {
        if (!active || controller.signal.aborted) return
        const message = error instanceof Error ? error.message : 'Erreur de chargement inconnue.'
        onLoadStateChange?.('error', message)
      }
    }

    void load()

    return () => {
      active = false
      controller.abort()
      onObjectReady?.(null)
      if (loadedObject) disposeRockObject(loadedObject)
    }
  }, [onLoadStateChange, onObjectReady, path])

  return object ? <primitive object={object} /> : null
}

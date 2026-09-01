import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { Mesh } from 'three'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { disposeRockObject } from './rockResources'

export type RockLoadState = 'loading' | 'ready' | 'error'

export interface RockSurfacePointerSample {
  pointerId: number
  clientX: number
  clientY: number
  timeStamp: number
  isPrimary: boolean
}

interface RockModelProps {
  path: string
  onLoadStateChange?: ((state: RockLoadState, message?: string) => void) | undefined
  onObjectReady?: ((object: Object3D | null) => void) | undefined
  onSurfacePointerDown?: ((sample: RockSurfacePointerSample) => void) | undefined
  onSurfacePointerMove?: ((sample: RockSurfacePointerSample) => void) | undefined
  onSurfacePointerUp?: ((sample: RockSurfacePointerSample) => void) | undefined
  onSurfacePointerCancel?: ((sample: RockSurfacePointerSample) => void) | undefined
}

function toSurfaceSample(event: ThreeEvent<PointerEvent>): RockSurfacePointerSample {
  return {
    pointerId: event.nativeEvent.pointerId,
    clientX: event.nativeEvent.clientX,
    clientY: event.nativeEvent.clientY,
    timeStamp: event.nativeEvent.timeStamp,
    isPrimary: event.nativeEvent.isPrimary,
  }
}

export function RockModel({
  path,
  onLoadStateChange,
  onObjectReady,
  onSurfacePointerDown,
  onSurfacePointerMove,
  onSurfacePointerUp,
  onSurfacePointerCancel,
}: RockModelProps) {
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

  if (!object) return null

  return (
    <primitive
      object={object}
      onPointerDown={onSurfacePointerDown ? (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        onSurfacePointerDown(toSurfaceSample(event))
      } : undefined}
      onPointerMove={onSurfacePointerMove ? (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        onSurfacePointerMove(toSurfaceSample(event))
      } : undefined}
      onPointerUp={onSurfacePointerUp ? (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        onSurfacePointerUp(toSurfaceSample(event))
      } : undefined}
      onPointerCancel={onSurfacePointerCancel ? (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        onSurfacePointerCancel(toSurfaceSample(event))
      } : undefined}
    />
  )
}

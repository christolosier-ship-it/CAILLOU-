import { useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import {
  CanvasTexture,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
} from 'three'
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
  uvX: number | null
  uvY: number | null
}

interface RockModelProps {
  path: string
  dustAmount?: number
  dustRevision?: number
  cleaningActive?: boolean
  onLoadStateChange?: ((state: RockLoadState, message?: string) => void) | undefined
  onObjectReady?: ((object: Object3D | null) => void) | undefined
  onSurfacePointerDown?: ((sample: RockSurfacePointerSample) => void) | undefined
  onSurfacePointerMove?: ((sample: RockSurfacePointerSample) => void) | undefined
  onSurfacePointerUp?: ((sample: RockSurfacePointerSample) => void) | undefined
  onSurfacePointerCancel?: ((sample: RockSurfacePointerSample) => void) | undefined
}

interface DustResources {
  context: CanvasRenderingContext2D
  texture: CanvasTexture
  overlays: Array<{ parent: Mesh; overlay: Mesh; material: MeshStandardMaterial }>
}

const DUST_TEXTURE_SIZE = 128
const DUST_BRUSH_RADIUS_PX = 11

function stableSeed(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seedRef: { value: number }) {
  let value = seedRef.value || 0x6d2b79f5
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  seedRef.value = value >>> 0
  return seedRef.value / 0xffffffff
}

function paintDustMask(context: CanvasRenderingContext2D, amount: number, seed: number) {
  const image = context.createImageData(DUST_TEXTURE_SIZE, DUST_TEXTURE_SIZE)
  const random = { value: seed }

  for (let pixel = 0; pixel < DUST_TEXTURE_SIZE * DUST_TEXTURE_SIZE; pixel += 1) {
    const grain = seededRandom(random)
    const fleck = seededRandom(random)
    const density = fleck > 0.86 ? 1 : 0.28 + grain * 0.42
    const value = Math.round(255 * amount * density)
    const offset = pixel * 4
    image.data[offset] = value
    image.data[offset + 1] = value
    image.data[offset + 2] = value
    image.data[offset + 3] = 255
  }

  context.putImageData(image, 0, 0)
}

function brushDust(resources: DustResources | null, uvX: number | null, uvY: number | null) {
  if (!resources || uvX === null || uvY === null) return false

  const x = uvX * DUST_TEXTURE_SIZE
  const y = (1 - uvY) * DUST_TEXTURE_SIZE
  const gradient = resources.context.createRadialGradient(
    x,
    y,
    DUST_BRUSH_RADIUS_PX * 0.22,
    x,
    y,
    DUST_BRUSH_RADIUS_PX,
  )
  gradient.addColorStop(0, 'rgb(0 0 0 / 1)')
  gradient.addColorStop(0.68, 'rgb(0 0 0 / .92)')
  gradient.addColorStop(1, 'rgb(0 0 0 / 0)')

  resources.context.save()
  resources.context.fillStyle = gradient
  resources.context.beginPath()
  resources.context.arc(x, y, DUST_BRUSH_RADIUS_PX, 0, Math.PI * 2)
  resources.context.fill()
  resources.context.restore()
  resources.texture.needsUpdate = true
  return true
}

function toSurfaceSample(event: ThreeEvent<PointerEvent>): RockSurfacePointerSample {
  return {
    pointerId: event.nativeEvent.pointerId,
    clientX: event.nativeEvent.clientX,
    clientY: event.nativeEvent.clientY,
    timeStamp: event.nativeEvent.timeStamp,
    isPrimary: event.nativeEvent.isPrimary,
    uvX: event.uv?.x ?? null,
    uvY: event.uv?.y ?? null,
  }
}

export function RockModel({
  path,
  dustAmount = 0,
  dustRevision = 0,
  cleaningActive = false,
  onLoadStateChange,
  onObjectReady,
  onSurfacePointerDown,
  onSurfacePointerMove,
  onSurfacePointerUp,
  onSurfacePointerCancel,
}: RockModelProps) {
  const [object, setObject] = useState<Object3D | null>(null)
  const dustResourcesRef = useRef<DustResources | null>(null)
  const invalidate = useThree((state) => state.invalidate)

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

  useEffect(() => {
    if (!object || dustAmount <= 0) {
      dustResourcesRef.current = null
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = DUST_TEXTURE_SIZE
    canvas.height = DUST_TEXTURE_SIZE
    const context = canvas.getContext('2d')
    if (!context) return

    paintDustMask(context, Math.min(1, Math.max(0, dustAmount)), stableSeed(path))
    const texture = new CanvasTexture(canvas)
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.needsUpdate = true

    const targets: Mesh[] = []
    object.traverse((child) => {
      if (child instanceof Mesh && child.geometry.getAttribute('uv')) targets.push(child)
    })

    const overlays = targets.map((parent) => {
      const material = new MeshStandardMaterial({
        color: '#d8d2c8',
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.38,
        alphaMap: texture,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
      const overlay = new Mesh(parent.geometry, material)
      overlay.name = 'CAILLOU_DUST_OVERLAY'
      overlay.scale.setScalar(1.0015)
      overlay.castShadow = false
      overlay.receiveShadow = false
      overlay.raycast = () => undefined
      parent.add(overlay)
      return { parent, overlay, material }
    })

    const resources = { context, texture, overlays }
    dustResourcesRef.current = resources
    invalidate()

    return () => {
      if (dustResourcesRef.current === resources) dustResourcesRef.current = null
      for (const { parent, overlay, material } of overlays) {
        parent.remove(overlay)
        material.dispose()
      }
      texture.dispose()
    }
  }, [dustAmount, dustRevision, invalidate, object, path])

  if (!object) return null

  return (
    <primitive
      object={object}
      onPointerDown={onSurfacePointerDown ? (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        const sample = toSurfaceSample(event)
        if (cleaningActive && brushDust(dustResourcesRef.current, sample.uvX, sample.uvY)) invalidate()
        onSurfacePointerDown(sample)
      } : undefined}
      onPointerMove={onSurfacePointerMove ? (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        const sample = toSurfaceSample(event)
        if (cleaningActive && brushDust(dustResourcesRef.current, sample.uvX, sample.uvY)) invalidate()
        onSurfacePointerMove(sample)
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

import { useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Box3, Mesh, Plane, Sphere, Vector3 } from 'three'
import type { Group, Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import type { AccessoryTransform, EquippedAccessoryInstance } from '../features/accessories/accessoryTypes'
import { ACCESSORY_POSITION_LIMIT } from '../features/accessories/accessoryPlacementRules'
import { disposeRockObject } from './rockResources'
import type { DisposalReport } from './rockResources'

interface AccessoryModelProps {
  instance: EquippedAccessoryInstance
  selected: boolean
  editing: boolean
  onSelect: (instanceId: string) => void
  onTransformCommit: (instanceId: string, transform: AccessoryTransform) => void
  onLoadStateChange?: ((instanceId: string, state: 'loading' | 'ready' | 'error', message?: string) => void) | undefined
  onDisposed?: ((instanceId: string, report: DisposalReport) => void) | undefined
}

interface DragState {
  pointerId: number
  plane: Plane
  worldOffset: Vector3
}

function clampPosition(value: number) {
  return Math.min(ACCESSORY_POSITION_LIMIT, Math.max(-ACCESSORY_POSITION_LIMIT, value))
}

function pointerTarget(event: ThreeEvent<PointerEvent>) {
  const target = event.nativeEvent.target
  return target instanceof Element ? target : null
}

export function AccessoryModel({
  instance,
  selected,
  editing,
  onSelect,
  onTransformCommit,
  onLoadStateChange,
  onDisposed,
}: AccessoryModelProps) {
  const [object, setObject] = useState<Object3D | null>(null)
  const [selectionRadius, setSelectionRadius] = useState(0.5)
  const groupRef = useRef<Group>(null)
  const dragRef = useRef<DragState | null>(null)
  const disposedCallbackRef = useRef(onDisposed)
  const loadCallbackRef = useRef(onLoadStateChange)
  const camera = useThree((state) => state.camera)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    disposedCallbackRef.current = onDisposed
  }, [onDisposed])

  useEffect(() => {
    loadCallbackRef.current = onLoadStateChange
  }, [onLoadStateChange])

  useEffect(() => {
    const controller = new AbortController()
    const loader = new GLTFLoader()
    let active = true
    let loadedObject: Object3D | null = null

    loadCallbackRef.current?.(instance.id, 'loading')

    async function load() {
      try {
        const response = await fetch(instance.modelPath, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const buffer = await response.arrayBuffer()
        if (!active || controller.signal.aborted) return

        const assetUrl = new URL(instance.modelPath, window.location.href)
        const resourcePath = assetUrl.href.slice(0, assetUrl.href.lastIndexOf('/') + 1)
        const gltf = await loader.parseAsync(buffer, resourcePath)
        loadedObject = gltf.scene
        loadedObject.traverse((child) => {
          if (!(child instanceof Mesh)) return
          child.castShadow = true
          child.receiveShadow = true
        })

        const box = new Box3().setFromObject(loadedObject)
        if (!box.isEmpty()) {
          const sphere = box.getBoundingSphere(new Sphere())
          setSelectionRadius(Math.max(0.08, sphere.radius))
        }

        if (!active || controller.signal.aborted) {
          const report = disposeRockObject(loadedObject)
          disposedCallbackRef.current?.(instance.id, report)
          loadedObject = null
          return
        }

        setObject(loadedObject)
        loadCallbackRef.current?.(instance.id, 'ready')
        invalidate()
      } catch (error) {
        if (!active || controller.signal.aborted) return
        const message = error instanceof Error ? error.message : 'Erreur de chargement inconnue.'
        loadCallbackRef.current?.(instance.id, 'error', message)
      }
    }

    void load()

    return () => {
      active = false
      controller.abort()
      if (loadedObject) {
        const report = disposeRockObject(loadedObject)
        disposedCallbackRef.current?.(instance.id, report)
      }
    }
  }, [instance.id, instance.modelPath, invalidate])

  useEffect(() => {
    const group = groupRef.current
    if (!group || dragRef.current) return
    group.position.set(...instance.localPosition)
    group.quaternion.set(...instance.localRotation).normalize()
    group.scale.setScalar(instance.uniformScale)
    invalidate()
  }, [
    instance.localPosition,
    instance.localRotation,
    instance.uniformScale,
    invalidate,
  ])

  const beginDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onSelect(instance.id)
    if (!editing || !selected || !groupRef.current) return

    const group = groupRef.current
    const worldPosition = group.getWorldPosition(new Vector3())
    const normal = camera.getWorldDirection(new Vector3()).normalize()
    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, worldPosition)
    const hit = event.ray.intersectPlane(plane, new Vector3())
    if (!hit) return

    dragRef.current = {
      pointerId: event.pointerId,
      plane,
      worldOffset: worldPosition.clone().sub(hit),
    }
    pointerTarget(event)?.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: ThreeEvent<PointerEvent>) => {
    const drag = dragRef.current
    const group = groupRef.current
    if (!drag || !group || drag.pointerId !== event.pointerId) return
    event.stopPropagation()

    const hit = event.ray.intersectPlane(drag.plane, new Vector3())
    if (!hit) return
    const worldTarget = hit.add(drag.worldOffset)
    const parent = group.parent
    if (!parent) return
    parent.updateWorldMatrix(true, false)
    const localTarget = parent.worldToLocal(worldTarget.clone())
    group.position.set(
      clampPosition(localTarget.x),
      clampPosition(localTarget.y),
      clampPosition(localTarget.z),
    )
    invalidate()
  }

  const finishDrag = (event: ThreeEvent<PointerEvent>) => {
    const drag = dragRef.current
    const group = groupRef.current
    if (!drag || !group || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    dragRef.current = null
    const target = pointerTarget(event)
    if (target?.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
    onTransformCommit(instance.id, {
      localPosition: [group.position.x, group.position.y, group.position.z],
      localRotation: [group.quaternion.x, group.quaternion.y, group.quaternion.z, group.quaternion.w],
      uniformScale: group.scale.x,
    })
  }

  const cancelDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    event.stopPropagation()
    dragRef.current = null
    const group = groupRef.current
    if (group) {
      group.position.set(...instance.localPosition)
      group.quaternion.set(...instance.localRotation).normalize()
      group.scale.setScalar(instance.uniformScale)
      invalidate()
    }
  }

  return (
    <group ref={groupRef}>
      {object ? (
        <primitive
          object={object}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={cancelDrag}
        />
      ) : null}
      {selected && object ? (
        <mesh scale={selectionRadius * 1.08} raycast={() => undefined} renderOrder={20}>
          <sphereGeometry args={[1, 20, 14]} />
          <meshBasicMaterial wireframe transparent opacity={0.2} depthTest={false} />
        </mesh>
      ) : null}
    </group>
  )
}

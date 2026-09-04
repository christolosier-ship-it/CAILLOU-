import { Canvas } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Quaternion, Vector3 } from 'three'

import { PlacementPhysicsWorld } from '../../src/features/placement/PlacementPhysicsWorld'
import type { PlacementGeometry } from '../../src/features/placement/placementGeometry'
import type { PlacementTarget, PlacementTransform } from '../../src/features/placement/placementTypes'
import { usePlacementCollisionResolver } from '../../src/features/placement/usePlacementCollisionResolver'

function boxGeometry(halfX: number, halfY: number, halfZ: number): PlacementGeometry {
  return {
    supportPoints: [
      [-halfX, -halfY, -halfZ], [-halfX, -halfY, halfZ],
      [-halfX, halfY, -halfZ], [-halfX, halfY, halfZ],
      [halfX, -halfY, -halfZ], [halfX, -halfY, halfZ],
      [halfX, halfY, -halfZ], [halfX, halfY, halfZ],
    ],
    colliderBounds: {
      min: [-halfX, -halfY, -halfZ],
      max: [halfX, halfY, halfZ],
    },
  }
}

function target(instanceId: string): PlacementTarget {
  return {
    kind: 'accessory',
    instanceId,
    profile: {
      capabilities: { canPosition: true, canRotate: true, canScale: true },
      behavior: 'free',
      collision: { strategy: 'convexHull' },
      physics: {
        enabled: true,
        dynamic: true,
        mass: 1,
        friction: 0.7,
        restitution: 0,
        linearDamping: 1,
        angularDamping: 1,
        gravityScale: 1,
        ccd: true,
      },
      scaleLimits: { min: 0.5, max: 3 },
    },
  }
}

interface TranslationBenchProps {
  onResult: (x: number) => void
}

function TranslationBench({ onResult }: TranslationBenchProps) {
  const geometry = useMemo(() => boxGeometry(0.5, 0.2, 0.2), [])
  const placementTarget = useMemo(() => target('collision-translation'), [])
  const resolve = usePlacementCollisionResolver(placementTarget, geometry)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current: PlacementTransform = { position: [-2, 0.8, 0], rotation: [0, 0, 0, 1], scale: 1 }
      const desired: PlacementTransform = { ...current, position: [2, 0.8, 0] }
      onResult(resolve(current, desired, 'translation').position[0])
    }, 120)
    return () => window.clearTimeout(timer)
  }, [onResult, resolve])

  return (
    <>
      <RigidBody type="kinematicPosition" colliders={false} position={[-2, 0.8, 0]} userData={{ placementObjectId: 'accessory:collision-translation' }}>
        <CuboidCollider args={[0.5, 0.2, 0.2]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} position={[0, 0.8, 0]}>
        <CuboidCollider args={[0.4, 0.4, 0.4]} />
      </RigidBody>
    </>
  )
}

interface RotationBenchProps {
  onResult: (fraction: number) => void
}

function RotationBench({ onResult }: RotationBenchProps) {
  const geometry = useMemo(() => boxGeometry(1, 0.2, 0.2), [])
  const placementTarget = useMemo(() => target('collision-rotation'), [])
  const resolve = usePlacementCollisionResolver(placementTarget, geometry)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current: PlacementTransform = { position: [0, 3, 1.6], rotation: [0, 0, 0, 1], scale: 1 }
      const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)
      const desired: PlacementTransform = {
        ...current,
        rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
      }
      const result = resolve(current, desired, 'rotation')
      const angle = 2 * Math.acos(Math.min(1, Math.abs(result.rotation[3])))
      onResult(angle / (Math.PI / 2))
    }, 120)
    return () => window.clearTimeout(timer)
  }, [onResult, resolve])

  return (
    <>
      <RigidBody type="kinematicPosition" colliders={false} position={[0, 3, 1.6]} userData={{ placementObjectId: 'accessory:collision-rotation' }}>
        <CuboidCollider args={[1, 0.2, 0.2]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} position={[0, 3, 2.45]}>
        <CuboidCollider args={[0.2, 0.4, 0.2]} />
      </RigidBody>
    </>
  )
}

interface ScaleBenchProps {
  onResult: (scale: number) => void
}

function ScaleBench({ onResult }: ScaleBenchProps) {
  const geometry = useMemo(() => boxGeometry(0.5, 0.2, 0.2), [])
  const placementTarget = useMemo(() => target('collision-scale'), [])
  const resolve = usePlacementCollisionResolver(placementTarget, geometry)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current: PlacementTransform = { position: [0, 5, -1.5], rotation: [0, 0, 0, 1], scale: 1 }
      const desired: PlacementTransform = { ...current, scale: 3 }
      onResult(resolve(current, desired, 'scale').scale)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [onResult, resolve])

  return (
    <>
      <RigidBody type="kinematicPosition" colliders={false} position={[0, 5, -1.5]} userData={{ placementObjectId: 'accessory:collision-scale' }}>
        <CuboidCollider args={[0.5, 0.2, 0.2]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} position={[1.2, 5, -1.5]}>
        <CuboidCollider args={[0.2, 0.4, 0.2]} />
      </RigidBody>
    </>
  )
}

function Fixture() {
  const [translationX, setTranslationX] = useState<number | null>(null)
  const [rotationFraction, setRotationFraction] = useState<number | null>(null)
  const [scale, setScale] = useState<number | null>(null)
  const ready = translationX !== null && rotationFraction !== null && scale !== null

  return (
    <>
      <Canvas frameloop="demand" camera={{ position: [6, 6, 8], fov: 40 }}>
        <PlacementPhysicsWorld paused={false}>
          <TranslationBench onResult={setTranslationX} />
          <RotationBench onResult={setRotationFraction} />
          <ScaleBench onResult={setScale} />
        </PlacementPhysicsWorld>
      </Canvas>
      <output
        id="placement-collision-e2e-state"
        data-ready={String(ready)}
        data-translation-x={translationX ?? ''}
        data-rotation-fraction={rotationFraction ?? ''}
        data-scale={scale ?? ''}
      />
    </>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing placement collision fixture root')
createRoot(root).render(<Fixture />)

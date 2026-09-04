import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import type { ReactNode } from 'react'

import { ACCESSORY_WORLD_GRAVITY } from '../accessories/accessoryPhysics'
import {
  PEDESTAL_FLOOR_CENTER_Y,
  PEDESTAL_FLOOR_COLOR,
  PEDESTAL_FLOOR_FRICTION,
  PEDESTAL_FLOOR_HALF_EXTENTS,
  PEDESTAL_FLOOR_RESTITUTION,
  PEDESTAL_FLOOR_SIZE,
  PEDESTAL_FLOOR_THICKNESS,
} from './pedestalFloor'

function PedestalFloor() {
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={[0, PEDESTAL_FLOOR_CENTER_Y, 0]}
      friction={PEDESTAL_FLOOR_FRICTION}
      restitution={PEDESTAL_FLOOR_RESTITUTION}
    >
      <CuboidCollider args={PEDESTAL_FLOOR_HALF_EXTENTS} />
      <mesh name="CAILLOU_PEDESTAL_FLOOR" receiveShadow>
        <boxGeometry args={[PEDESTAL_FLOOR_SIZE, PEDESTAL_FLOOR_THICKNESS, PEDESTAL_FLOOR_SIZE]} />
        <meshStandardMaterial color={PEDESTAL_FLOOR_COLOR} roughness={0.96} metalness={0.02} />
      </mesh>
    </RigidBody>
  )
}

interface PlacementPhysicsWorldProps {
  paused: boolean
  children: ReactNode
}

export function PlacementPhysicsWorld({ paused, children }: PlacementPhysicsWorldProps) {
  return (
    <Physics
      gravity={[ACCESSORY_WORLD_GRAVITY[0], ACCESSORY_WORLD_GRAVITY[1], ACCESSORY_WORLD_GRAVITY[2]]}
      colliders={false}
      updateLoop="independent"
      paused={paused}
    >
      <PedestalFloor />
      {children}
    </Physics>
  )
}

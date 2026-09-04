import { useThree } from '@react-three/fiber'
import { RigidBody, useAfterPhysicsStep } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { constrainTransformToPedestal } from './placementConstraints'
import type { PlacementGeometry } from './placementGeometry'
import type { PlacementTransform } from './placementTypes'
import { normalizePlacementTransform } from './placementTransform'
import { placementRigidBodyType } from './placementBodyState'
import type { PlacementBodyState } from './placementBodyState'

export type PlacementBodyCollider = 'hull' | 'cuboid' | 'ball'

export interface PlacementBodyPhysicsConfig {
  collider: PlacementBodyCollider
  mass: number
  friction: number
  restitution: number
  linearDamping: number
  angularDamping: number
  gravityScale: number
  ccd: boolean
  settlingCcd: boolean
  baseSolverIterations: number
  settlingSolverIterations: number
  settleTimeoutMs: number
  settleLinearVelocityY: number
}

interface PlacementBodyProps {
  bodyKey: string
  state: PlacementBodyState
  transform: PlacementTransform
  geometry: PlacementGeometry
  physics: PlacementBodyPhysicsConfig
  includeInvisible?: boolean
  onTransformFrame?: (transform: PlacementTransform) => void
  onSettled?: (transform: PlacementTransform) => void
  children: ReactNode
}

function samePosition(left: readonly number[], right: readonly number[], epsilon = 0.000001) {
  return left.length === right.length
    && left.every((value, index) => Math.abs(value - (right[index] ?? value)) <= epsilon)
}

function bodyTransform(body: RapierRigidBody, scale: number): PlacementTransform {
  const position = body.translation()
  const rotation = body.rotation()
  return normalizePlacementTransform({
    position: [position.x, position.y, position.z],
    rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
    scale,
  }, { min: scale, max: scale })
}

export function PlacementBody({
  bodyKey,
  state,
  transform,
  geometry,
  physics,
  includeInvisible = false,
  onTransformFrame,
  onSettled,
  children,
}: PlacementBodyProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const transformRef = useRef(transform)
  const reportedRef = useRef(false)
  const frameCallbackRef = useRef(onTransformFrame)
  const settledCallbackRef = useRef(onSettled)
  const invalidate = useThree((current) => current.invalidate)
  const safeTransform = constrainTransformToPedestal(transform, geometry)
  transformRef.current = safeTransform

  useEffect(() => {
    frameCallbackRef.current = onTransformFrame
  }, [onTransformFrame])

  useEffect(() => {
    settledCallbackRef.current = onSettled
  }, [onSettled])

  const enforcePedestal = useCallback(() => {
    const body = bodyRef.current
    if (!body) return null
    const current = bodyTransform(body, transformRef.current.scale)
    const safe = constrainTransformToPedestal(current, geometry)
    if (!samePosition(safe.position, current.position)) {
      const changedX = Math.abs(safe.position[0] - current.position[0]) > 0.000001
      const changedY = Math.abs(safe.position[1] - current.position[1]) > 0.000001
      const changedZ = Math.abs(safe.position[2] - current.position[2]) > 0.000001
      body.setTranslation({ x: safe.position[0], y: safe.position[1], z: safe.position[2] }, true)
      const velocity = body.linvel()
      body.setLinvel({
        x: changedX ? 0 : velocity.x,
        y: changedY && velocity.y < 0 ? 0 : velocity.y,
        z: changedZ ? 0 : velocity.z,
      }, true)
    }
    return safe
  }, [geometry])

  useAfterPhysicsStep(() => {
    if (state !== 'settling') return
    const safe = enforcePedestal()
    if (safe) frameCallbackRef.current?.(safe)
    invalidate()
  })

  useEffect(() => {
    if (state === 'settling') return
    const body = bodyRef.current
    if (!body) return
    const position = {
      x: safeTransform.position[0],
      y: safeTransform.position[1],
      z: safeTransform.position[2],
    }
    const rotation = {
      x: safeTransform.rotation[0],
      y: safeTransform.rotation[1],
      z: safeTransform.rotation[2],
      w: safeTransform.rotation[3],
    }
    if (state === 'editing') {
      body.setNextKinematicTranslation(position)
      body.setNextKinematicRotation(rotation)
    } else {
      body.setTranslation(position, false)
      body.setRotation(rotation, false)
    }
    frameCallbackRef.current?.(safeTransform)
    invalidate()
  }, [invalidate, safeTransform, state])

  const reportSettled = useCallback(() => {
    const body = bodyRef.current
    if (!body || state !== 'settling' || reportedRef.current) return
    reportedRef.current = true
    const safe = enforcePedestal() ?? bodyTransform(body, transformRef.current.scale)
    body.setLinvel({ x: 0, y: 0, z: 0 }, false)
    body.setAngvel({ x: 0, y: 0, z: 0 }, false)
    body.sleep()
    frameCallbackRef.current?.(safe)
    settledCallbackRef.current?.(safe)
    invalidate()
  }, [enforcePedestal, invalidate, state])

  useEffect(() => {
    reportedRef.current = false
    if (state !== 'settling') return
    const body = bodyRef.current
    if (!body) return
    enforcePedestal()
    body.setLinvel({ x: 0, y: physics.settleLinearVelocityY, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    body.wakeUp()
    const timer = window.setTimeout(reportSettled, physics.settleTimeoutMs)
    invalidate()
    return () => window.clearTimeout(timer)
  }, [enforcePedestal, invalidate, physics.settleLinearVelocityY, physics.settleTimeoutMs, reportSettled, state])

  return (
    <RigidBody
      key={`${bodyKey}:${state}:${safeTransform.scale.toFixed(4)}`}
      ref={bodyRef}
      type={placementRigidBodyType(state)}
      colliders={physics.collider}
      includeInvisible={includeInvisible}
      position={safeTransform.position}
      quaternion={safeTransform.rotation}
      scale={safeTransform.scale}
      mass={physics.mass}
      friction={physics.friction}
      restitution={physics.restitution}
      linearDamping={physics.linearDamping}
      angularDamping={physics.angularDamping}
      gravityScale={physics.gravityScale}
      ccd={state === 'settling' ? physics.settlingCcd : physics.ccd}
      canSleep
      additionalSolverIterations={state === 'settling'
        ? physics.settlingSolverIterations
        : physics.baseSolverIterations}
      userData={{ placementObjectId: bodyKey }}
      {...(state === 'settling' ? { onSleep: reportSettled } : {})}
    >
      {children}
    </RigidBody>
  )
}

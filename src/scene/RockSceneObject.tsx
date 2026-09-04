import { useCallback, useMemo, useRef, useState } from 'react'
import type { Group, Object3D } from 'three'

import type { RockCatalogEntry } from '../content/rockCatalog'
import { PlacementBody } from '../features/placement/PlacementBody'
import type { PlacementBodyPhysicsConfig } from '../features/placement/PlacementBody'
import type { PlacementBodyState } from '../features/placement/placementBodyState'
import type { PlacementGeometry } from '../features/placement/placementGeometry'
import type { PlacementTransform } from '../features/placement/placementTypes'
import { ROCK_SETTLE_TIMEOUT_MS } from '../features/rockMovement/rockMovementRules'
import type { RockPose } from '../features/rockMovement/rockMovementTypes'
import { RockModel } from './RockModel'
import type { RockLoadState, RockSurfacePointerSample } from './RockModel'

const ROCK_PLACEMENT_BODY_PHYSICS: PlacementBodyPhysicsConfig = {
  collider: 'hull',
  mass: 6,
  friction: 0.9,
  restitution: 0.015,
  linearDamping: 1.8,
  angularDamping: 2.2,
  gravityScale: 1,
  ccd: false,
  settlingCcd: true,
  baseSolverIterations: 1,
  settlingSolverIterations: 6,
  settleTimeoutMs: ROCK_SETTLE_TIMEOUT_MS,
  settleLinearVelocityY: -0.03,
}

interface RockSceneObjectProps {
  rock: RockCatalogEntry
  retryKey: number
  bodyState: PlacementBodyState
  transform: PlacementTransform
  dustAmount: number
  dustRevision: number
  cleaningActive: boolean
  surfaceInteractionActive: boolean
  onLoadStateChange: (state: RockLoadState, message?: string) => void
  onObjectReady: (object: Object3D | null) => void
  onPlacementGeometryReady: (geometry: PlacementGeometry | null) => void
  onSettled: (transform: PlacementTransform) => void
  onSurfacePointerDown?: ((sample: RockSurfacePointerSample) => void) | undefined
  onSurfacePointerMove?: ((sample: RockSurfacePointerSample) => void) | undefined
  onSurfacePointerUp?: ((sample: RockSurfacePointerSample) => void) | undefined
  onSurfacePointerCancel?: ((sample: RockSurfacePointerSample) => void) | undefined
}

export function RockSceneObject({
  rock,
  retryKey,
  bodyState,
  transform,
  dustAmount,
  dustRevision,
  cleaningActive,
  surfaceInteractionActive,
  onLoadStateChange,
  onObjectReady,
  onPlacementGeometryReady,
  onSettled,
  onSurfacePointerDown,
  onSurfacePointerMove,
  onSurfacePointerUp,
  onSurfacePointerCancel,
}: RockSceneObjectProps) {
  const [object, setObject] = useState<Object3D | null>(null)
  const [geometry, setGeometry] = useState<PlacementGeometry | null>(null)
  const visualGroupRef = useRef<Group>(null)

  const handleObjectReady = useCallback((next: Object3D | null) => {
    setObject(next)
    onObjectReady(next)
  }, [onObjectReady])

  const handleGeometryReady = useCallback((next: PlacementGeometry | null) => {
    setGeometry(next)
    onPlacementGeometryReady(next)
  }, [onPlacementGeometryReady])

  const colliderObject = useMemo(() => {
    if (!object) return null
    const clone = object.clone(true)
    clone.name = 'CAILLOU_DYNAMIC_HULL_COLLIDER'
    clone.visible = false
    return clone
  }, [object])

  const handlePhysicsTransform = useCallback((next: PlacementTransform) => {
    const visualGroup = visualGroupRef.current
    if (!visualGroup) return
    visualGroup.position.set(...next.position)
    visualGroup.quaternion.set(...next.rotation).normalize()
    visualGroup.updateMatrixWorld(true)
  }, [])

  return (
    <>
      <group ref={visualGroupRef} position={transform.position} quaternion={transform.rotation}>
        <RockModel
          key={`${rock.id}-${retryKey}`}
          path={rock.modelPath}
          dustAmount={dustAmount}
          dustRevision={dustRevision}
          cleaningActive={cleaningActive}
          onLoadStateChange={onLoadStateChange}
          onObjectReady={handleObjectReady}
          onPlacementGeometryReady={handleGeometryReady}
          onSurfacePointerDown={surfaceInteractionActive ? onSurfacePointerDown : undefined}
          onSurfacePointerMove={surfaceInteractionActive ? onSurfacePointerMove : undefined}
          onSurfacePointerUp={surfaceInteractionActive ? onSurfacePointerUp : undefined}
          onSurfacePointerCancel={surfaceInteractionActive ? onSurfacePointerCancel : undefined}
        />
      </group>

      {colliderObject && geometry ? (
        <PlacementBody
          bodyKey="rock"
          state={bodyState}
          transform={transform}
          geometry={geometry}
          physics={ROCK_PLACEMENT_BODY_PHYSICS}
          includeInvisible
          onTransformFrame={handlePhysicsTransform}
          onSettled={onSettled}
        >
          <primitive object={colliderObject} />
        </PlacementBody>
      ) : null}
    </>
  )
}

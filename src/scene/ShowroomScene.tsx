import { ContactShadows } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { Object3D } from 'three'

import type { RockCatalogEntry } from '../content/rockCatalog'
import type { EquippedAccessoryInstance } from '../features/accessories/accessoryTypes'
import { PlacementInteractionController } from '../features/placement/PlacementInteractionController'
import { constrainPlacementPosition } from '../features/placement/placementConstraints'
import type { PlacementGeometry } from '../features/placement/placementGeometry'
import { PlacementPhysicsWorld } from '../features/placement/PlacementPhysicsWorld'
import type { SettledWorldComposition } from '../features/placement/placementPersistence'
import type { PlacementSessionState, PlacementSettlementPlan } from '../features/placement/placementSession'
import type { PlacementTarget, PlacementTool, PlacementTransform } from '../features/placement/placementTypes'
import { usePlacementSettlementCoordinator } from '../features/placement/usePlacementSettlementCoordinator'
import {
  PEDESTAL_FLOOR_SIZE,
  PEDESTAL_FLOOR_TOP_Y,
} from '../features/placement/pedestalFloor'
import { normalizeRockPose } from '../features/rockMovement/rockMovementRules'
import type { RockPose } from '../features/rockMovement/rockMovementTypes'
import { AccessorySceneObjects } from './AccessorySceneObjects'
import { RockSceneObject } from './RockSceneObject'
import type { RockLoadState, RockSurfacePointerSample } from './RockModel'
import { SceneCameraController } from './SceneCameraController'
import type { DisposalReport } from './rockResources'

export type ShowroomInteractionMode =
  | 'orbit'
  | 'caress'
  | 'cleaning'
  | 'placement'
  | 'settling'

interface ShowroomSceneProps {
  rock: RockCatalogEntry
  retryKey: number
  reducedMotion: boolean
  onLoadStateChange: (state: RockLoadState, message?: string) => void
  onInteractionChange: (active: boolean) => void
  interactionMode?: ShowroomInteractionMode
  rockPose?: RockPose
  onRockPoseDraft?: (pose: RockPose) => void
  onCompositionSettled?: (composition: SettledWorldComposition) => void
  placementTarget?: PlacementTarget | null
  placementTool?: PlacementTool
  placementSession?: PlacementSessionState | null
  settlementPlan?: PlacementSettlementPlan | null
  cameraControlActive?: boolean
  onRockSelect?: (() => void) | undefined
  onAccessorySelect?: ((instanceId: string) => void) | undefined
  dustAmount?: number
  dustRevision?: number
  onSurfacePointerDown?: (sample: RockSurfacePointerSample) => void
  onSurfacePointerMove?: (sample: RockSurfacePointerSample) => void
  onSurfacePointerUp?: (sample: RockSurfacePointerSample) => void
  onSurfacePointerCancel?: (sample: RockSurfacePointerSample) => void
  accessories?: EquippedAccessoryInstance[]
  selectedAccessoryId?: string | null
  onAccessoryPlacementDraft?: (instanceId: string, transform: PlacementTransform) => void
  onAccessorySettled?: (instanceId: string, transform: PlacementTransform) => void
  onAccessoryLoadStateChange?: (
    instanceId: string,
    state: 'loading' | 'ready' | 'error',
    message?: string,
  ) => void
  onAccessoryDisposed?: (instanceId: string, report: DisposalReport) => void
}

function samePosition(left: readonly number[], right: readonly number[], epsilon = 0.00001) {
  return left.length === right.length
    && left.every((value, index) => Math.abs(value - (right[index] ?? value)) <= epsilon)
}

export function ShowroomScene({
  rock,
  retryKey,
  reducedMotion,
  onLoadStateChange,
  onInteractionChange,
  interactionMode = 'orbit',
  rockPose = { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
  onRockPoseDraft,
  onCompositionSettled,
  placementTarget = null,
  placementTool = 'position',
  placementSession = null,
  settlementPlan = null,
  cameraControlActive = false,
  onRockSelect,
  onAccessorySelect,
  dustAmount = 0,
  dustRevision = 0,
  onSurfacePointerDown,
  onSurfacePointerMove,
  onSurfacePointerUp,
  onSurfacePointerCancel,
  accessories = [],
  selectedAccessoryId = null,
  onAccessoryPlacementDraft,
  onAccessorySettled,
  onAccessoryLoadStateChange,
  onAccessoryDisposed,
}: ShowroomSceneProps) {
  const [object, setObject] = useState<Object3D | null>(null)
  const [rockGeometry, setRockGeometry] = useState<PlacementGeometry | null>(null)
  const [accessoryGeometries, setAccessoryGeometries] = useState<Map<string, PlacementGeometry>>(() => new Map())

  const handleAccessoryGeometryReady = useCallback((instanceId: string, geometry: PlacementGeometry | null) => {
    setAccessoryGeometries((current) => {
      const next = new Map(current)
      if (geometry) next.set(instanceId, geometry)
      else next.delete(instanceId)
      return next
    })
  }, [])

  const surfaceMode = interactionMode === 'caress' || interactionMode === 'cleaning'
  const cleaningMode = interactionMode === 'cleaning'
  const placementMode = interactionMode === 'placement'
  const settlingMode = interactionMode === 'settling'
  const placementRockTarget = placementMode && placementTarget?.kind === 'rock'
  const globalSettling = settlingMode && settlementPlan?.rock === true
  const orbitMode = interactionMode === 'orbit'
  const cameraInteractionActive = orbitMode || (placementMode && cameraControlActive)
  const sessionRockTransform = placementSession?.rock ?? {
    position: [...rockPose.position],
    rotation: [...rockPose.rotation],
    scale: 1,
  }

  useEffect(() => {
    if (!rockGeometry || placementMode || settlingMode || globalSettling || placementRockTarget || !onRockPoseDraft) return
    const constrained = constrainPlacementPosition(rockPose.position, rockPose.rotation, 1, rockGeometry)
    if (!samePosition(constrained, rockPose.position)) {
      onRockPoseDraft(normalizeRockPose({ position: constrained, rotation: rockPose.rotation }))
    }
  }, [globalSettling, onRockPoseDraft, placementMode, placementRockTarget, rockGeometry, rockPose, settlingMode])

  const {
    handleRockBodySettled,
    handleAccessoryGlobalSettled,
    handleAccessoryModelSettled,
  } = usePlacementSettlementCoordinator({
    settling: settlingMode,
    settlementPlan,
    placementSession,
    accessories,
    onCompositionSettled,
    onAccessorySettled,
  })

  const activePlacementTransform = useMemo(() => {
    if (!placementMode || !placementTarget || !placementSession) return null
    return placementTarget.kind === 'rock'
      ? placementSession.rock
      : placementSession.accessories[placementTarget.instanceId] ?? null
  }, [placementMode, placementSession, placementTarget])

  const placementGeometry = useMemo(() => {
    if (!placementTarget) return null
    return placementTarget.kind === 'rock'
      ? rockGeometry
      : accessoryGeometries.get(placementTarget.instanceId) ?? null
  }, [accessoryGeometries, placementTarget, rockGeometry])

  const handlePlacementTransformDraft = useCallback((transform: PlacementTransform) => {
    if (!placementTarget) return
    if (placementTarget.kind === 'rock') {
      onRockPoseDraft?.({ position: [...transform.position], rotation: [...transform.rotation] })
      return
    }
    onAccessoryPlacementDraft?.(placementTarget.instanceId, transform)
  }, [onAccessoryPlacementDraft, onRockPoseDraft, placementTarget])

  const handlePlacementTransformEnd = useCallback((transform: PlacementTransform) => {
    if (!placementTarget || placementTarget.kind !== 'accessory') return
    onAccessoryPlacementDraft?.(placementTarget.instanceId, transform)
  }, [onAccessoryPlacementDraft, placementTarget])

  return (
    <div
      className="showroom-canvas"
      onPointerDown={() => { if (cameraInteractionActive) onInteractionChange(true) }}
      onPointerUp={() => { if (cameraInteractionActive) onInteractionChange(false) }}
      onPointerCancel={() => { if (cameraInteractionActive) onInteractionChange(false) }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <Canvas
        aria-hidden="true"
        camera={{ position: [3.1, 2.15, 4.4], fov: 32, near: 0.05, far: 100 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        shadows
      >
        <color attach="background" args={['#e5e1d8']} />
        <ambientLight intensity={0.58} />
        <directionalLight position={[4.5, 5.5, 4.2]} intensity={2.45} castShadow />
        <directionalLight position={[-4.2, 2.4, -2.5]} intensity={0.72} />
        <directionalLight position={[1.2, 3.4, -4.4]} intensity={0.62} />

        <Suspense fallback={null}>
          <PlacementPhysicsWorld paused={!object}>
            <RockSceneObject
              rock={rock}
              retryKey={retryKey}
              bodyState={globalSettling ? 'settling' : placementRockTarget ? 'editing' : 'fixed'}
              transform={sessionRockTransform}
              dustAmount={dustAmount}
              dustRevision={dustRevision}
              cleaningActive={cleaningMode}
              surfaceInteractionActive={surfaceMode}
              selectionActive={placementMode}
              onLoadStateChange={onLoadStateChange}
              onObjectReady={setObject}
              onPlacementGeometryReady={setRockGeometry}
              onSettled={handleRockBodySettled}
              onSelect={onRockSelect}
              onSurfacePointerDown={onSurfacePointerDown}
              onSurfacePointerMove={onSurfacePointerMove}
              onSurfacePointerUp={onSurfacePointerUp}
              onSurfacePointerCancel={onSurfacePointerCancel}
            />

            <AccessorySceneObjects
              instances={accessories}
              selectedAccessoryId={selectedAccessoryId}
              rockPose={rockPose}
              placementActive={placementMode}
              settlingActive={settlingMode}
              placementSession={placementSession}
              settlementPlan={settlementPlan}
              onSelectAccessory={onAccessorySelect}
              onSettledWorld={handleAccessoryModelSettled}
              onGlobalSettled={handleAccessoryGlobalSettled}
              onPlacementGeometryReady={handleAccessoryGeometryReady}
              onLoadStateChange={onAccessoryLoadStateChange}
              onDisposed={onAccessoryDisposed}
            />

            {placementMode && placementTarget && activePlacementTransform ? (
              <PlacementInteractionController
                target={placementTarget}
                tool={placementTool}
                transform={activePlacementTransform}
                geometry={placementGeometry}
                scaleLimits={placementTarget.profile.scaleLimits}
                onTransformChange={handlePlacementTransformDraft}
                onTransformEnd={handlePlacementTransformEnd}
              />
            ) : null}
          </PlacementPhysicsWorld>
        </Suspense>

        {object ? (
          <ContactShadows
            key={`${rock.id}-${retryKey}-shadow`}
            position={[0, PEDESTAL_FLOOR_TOP_Y + 0.002, 0]}
            opacity={0.3}
            scale={PEDESTAL_FLOOR_SIZE}
            blur={2.6}
            far={4}
            frames={1}
          />
        ) : null}

        <SceneCameraController
          object={object}
          enabled={cameraInteractionActive}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  )
}

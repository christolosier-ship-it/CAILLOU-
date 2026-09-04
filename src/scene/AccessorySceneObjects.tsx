import { memo, useCallback, useRef } from 'react'

import type { EquippedAccessoryInstance } from '../features/accessories/accessoryTypes'
import type { PlacementGeometry } from '../features/placement/placementGeometry'
import type { PlacementSessionState, PlacementSettlementPlan } from '../features/placement/placementSession'
import type { PlacementTransform } from '../features/placement/placementTypes'
import type { RockPose, WorldAccessoryTransform } from '../features/rockMovement/rockMovementTypes'
import { AccessoryModel } from './AccessoryModel'
import type { DisposalReport } from './rockResources'

interface AccessorySceneObjectsProps {
  instances: EquippedAccessoryInstance[]
  selectedAccessoryId: string | null
  rockPose: RockPose
  placementActive: boolean
  settlingActive: boolean
  placementSession: PlacementSessionState | null
  settlementPlan: PlacementSettlementPlan | null
  onSelectAccessory?: ((instanceId: string) => void) | undefined
  onSettledWorld: (instanceId: string, transform: PlacementTransform) => void
  onGlobalSettled: (transform: WorldAccessoryTransform) => void
  onPlacementGeometryReady: (instanceId: string, geometry: PlacementGeometry | null) => void
  onLoadStateChange?: ((
    instanceId: string,
    state: 'loading' | 'ready' | 'error',
    message?: string,
  ) => void) | undefined
  onDisposed?: ((instanceId: string, report: DisposalReport) => void) | undefined
}

interface AccessorySceneObjectProps {
  instance: EquippedAccessoryInstance
  selected: boolean
  rockPose: RockPose
  placementActive: boolean
  compositionFrozen: boolean
  globalSettling: boolean
  settlingRequested: boolean
  sessionTransform: PlacementTransform | null
  onSelectAccessory: (instanceId: string) => void
  onSettledWorld: (instanceId: string, transform: PlacementTransform) => void
  onGlobalSettled: (transform: WorldAccessoryTransform) => void
  onPlacementGeometryReady: (instanceId: string, geometry: PlacementGeometry | null) => void
  onLoadStateChange: (
    instanceId: string,
    state: 'loading' | 'ready' | 'error',
    message?: string,
  ) => void
  onDisposed: (instanceId: string, report: DisposalReport) => void
}

const AccessorySceneObject = memo(function AccessorySceneObject({
  instance,
  selected,
  rockPose,
  placementActive,
  compositionFrozen,
  globalSettling,
  settlingRequested,
  sessionTransform,
  onSelectAccessory,
  onSettledWorld,
  onGlobalSettled,
  onPlacementGeometryReady,
  onLoadStateChange,
  onDisposed,
}: AccessorySceneObjectProps) {
  const handleSelect = useCallback(() => {
    onSelectAccessory(instance.id)
  }, [instance.id, onSelectAccessory])

  return (
    <AccessoryModel
      instance={instance}
      selected={selected}
      rockPose={rockPose}
      compositionFrozen={compositionFrozen}
      globalSettling={globalSettling}
      settlingRequested={settlingRequested}
      onSelect={placementActive ? handleSelect : undefined}
      onSettledWorld={onSettledWorld}
      onGlobalSettled={onGlobalSettled}
      placementTransform={sessionTransform}
      onPlacementGeometryReady={onPlacementGeometryReady}
      onLoadStateChange={onLoadStateChange}
      onDisposed={onDisposed}
    />
  )
})

export function AccessorySceneObjects({
  instances,
  selectedAccessoryId,
  rockPose,
  placementActive,
  settlingActive,
  placementSession,
  settlementPlan,
  onSelectAccessory,
  onSettledWorld,
  onGlobalSettled,
  onPlacementGeometryReady,
  onLoadStateChange,
  onDisposed,
}: AccessorySceneObjectsProps) {
  const selectRef = useRef(onSelectAccessory)
  const settledRef = useRef(onSettledWorld)
  const globalSettledRef = useRef(onGlobalSettled)
  const geometryRef = useRef(onPlacementGeometryReady)
  const loadRef = useRef(onLoadStateChange)
  const disposedRef = useRef(onDisposed)

  selectRef.current = onSelectAccessory
  settledRef.current = onSettledWorld
  globalSettledRef.current = onGlobalSettled
  geometryRef.current = onPlacementGeometryReady
  loadRef.current = onLoadStateChange
  disposedRef.current = onDisposed

  const stableSelect = useCallback((instanceId: string) => {
    selectRef.current?.(instanceId)
  }, [])
  const stableSettled = useCallback((instanceId: string, transform: PlacementTransform) => {
    settledRef.current(instanceId, transform)
  }, [])
  const stableGlobalSettled = useCallback((transform: WorldAccessoryTransform) => {
    globalSettledRef.current(transform)
  }, [])
  const stableGeometryReady = useCallback((instanceId: string, geometry: PlacementGeometry | null) => {
    geometryRef.current(instanceId, geometry)
  }, [])
  const stableLoadStateChange = useCallback((
    instanceId: string,
    state: 'loading' | 'ready' | 'error',
    message?: string,
  ) => {
    loadRef.current?.(instanceId, state, message)
  }, [])
  const stableDisposed = useCallback((instanceId: string, report: DisposalReport) => {
    disposedRef.current?.(instanceId, report)
  }, [])

  const compositionFrozen = placementActive || settlingActive

  return (
    <>
      {instances.map((instance) => {
        const sessionTransform = placementSession?.accessories[instance.id] ?? null
        const settlesWithRock = settlingActive && settlementPlan?.rock === true
          && settlementPlan.accessoryIds.includes(instance.id)
        const settlesIndividually = settlingActive && settlementPlan?.rock === false
          && settlementPlan.accessoryIds.includes(instance.id)

        return (
          <AccessorySceneObject
            key={instance.id}
            instance={instance}
            selected={selectedAccessoryId === instance.id}
            rockPose={rockPose}
            placementActive={placementActive}
            compositionFrozen={compositionFrozen}
            globalSettling={settlesWithRock}
            settlingRequested={settlesIndividually}
            sessionTransform={sessionTransform}
            onSelectAccessory={stableSelect}
            onSettledWorld={stableSettled}
            onGlobalSettled={stableGlobalSettled}
            onPlacementGeometryReady={stableGeometryReady}
            onLoadStateChange={stableLoadStateChange}
            onDisposed={stableDisposed}
          />
        )
      })}
    </>
  )
}

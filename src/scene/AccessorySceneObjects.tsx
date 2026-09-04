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

export function AccessorySceneObjects({
  instances,
  selectedAccessoryId,
  rockPose,
  placementActive,
  settlingActive,
  placementSession,
  settlementPlan,
  onSettledWorld,
  onGlobalSettled,
  onPlacementGeometryReady,
  onLoadStateChange,
  onDisposed,
}: AccessorySceneObjectsProps) {
  return (
    <>
      {instances.map((instance) => {
        const sessionTransform = placementSession?.accessories[instance.id] ?? null
        const settlesWithRock = settlingActive && settlementPlan?.rock === true
          && settlementPlan.accessoryIds.includes(instance.id)
        const settlesIndividually = settlingActive && settlementPlan?.rock === false
          && settlementPlan.accessoryIds.includes(instance.id)

        return (
          <AccessoryModel
            key={instance.id}
            instance={instance}
            selected={selectedAccessoryId === instance.id}
            rockPose={rockPose}
            compositionFrozen={placementActive || settlingActive}
            globalSettling={settlesWithRock}
            settlingRequested={settlesIndividually}
            onSettledWorld={onSettledWorld}
            onGlobalSettled={onGlobalSettled}
            placementTransform={sessionTransform}
            onPlacementGeometryReady={onPlacementGeometryReady}
            onLoadStateChange={onLoadStateChange}
            onDisposed={onDisposed}
          />
        )
      })}
    </>
  )
}

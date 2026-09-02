export type PlacementBodyState = 'fixed' | 'editing' | 'settling'
export type PlacementRigidBodyType = 'fixed' | 'kinematicPosition' | 'dynamic'

export function placementRigidBodyType(state: PlacementBodyState): PlacementRigidBodyType {
  if (state === 'settling') return 'dynamic'
  if (state === 'editing') return 'kinematicPosition'
  return 'fixed'
}

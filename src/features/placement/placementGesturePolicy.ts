
import type { PlacementTarget, PlacementTool } from './placementTypes'

export type PlacementGestureAction =
  | 'surface-position'
  | 'free-orientation'
  | 'depth-position'
  | 'twist-orientation'
  | 'uniform-scale'
  | null

export function resolvePlacementGesture(
  target: PlacementTarget,
  tool: PlacementTool,
  pointerCount: number,
): PlacementGestureAction {
  if (pointerCount >= 2) {
    if (tool === 'position') return 'depth-position'
    if (tool === 'orientation') return 'twist-orientation'
    return target.kind === 'accessory' ? 'uniform-scale' : null
  }
  if (pointerCount === 1) {
    if (tool === 'position') return 'surface-position'
    if (tool === 'orientation') return 'free-orientation'
  }
  return null
}

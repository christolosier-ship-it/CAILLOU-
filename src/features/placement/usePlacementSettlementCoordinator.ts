import { useCallback, useEffect, useRef } from 'react'

import type { EquippedAccessoryInstance } from '../accessories/accessoryTypes'
import { normalizeRockPose } from '../rockMovement/rockMovementRules'
import type { RockPose, WorldAccessoryTransform } from '../rockMovement/rockMovementTypes'
import type { SettledWorldComposition } from './placementPersistence'
import type { PlacementSessionState, PlacementSettlementPlan } from './placementSession'
import type { PlacementTransform } from './placementTypes'

interface PlacementSettlementCoordinatorOptions {
  settling: boolean
  settlementPlan: PlacementSettlementPlan | null
  placementSession: PlacementSessionState | null
  accessories: EquippedAccessoryInstance[]
  onCompositionSettled?: ((composition: SettledWorldComposition) => void) | undefined
  onAccessorySettled?: ((instanceId: string, transform: PlacementTransform) => void) | undefined
}

export function usePlacementSettlementCoordinator({
  settling,
  settlementPlan,
  placementSession,
  accessories,
  onCompositionSettled,
  onAccessorySettled,
}: PlacementSettlementCoordinatorOptions) {
  const finalRockRef = useRef<RockPose | null>(null)
  const finalAccessoriesRef = useRef(new Map<string, WorldAccessoryTransform>())
  const compositionReportedRef = useRef(false)

  const tryReportComposition = useCallback(() => {
    const finalRock = finalRockRef.current
    if (!settling || !settlementPlan || !finalRock || compositionReportedRef.current) return
    if (finalAccessoriesRef.current.size !== accessories.length) return

    compositionReportedRef.current = true
    onCompositionSettled?.({
      rockTransform: {
        position: [...finalRock.position],
        rotation: [...finalRock.rotation],
        scale: 1,
      },
      accessories: accessories.map((instance) => {
        const world = finalAccessoriesRef.current.get(instance.id)
        if (!world) throw new Error(`Missing settled transform for ${instance.id}`)
        return {
          instanceId: instance.id,
          transform: {
            position: [...world.worldPosition],
            rotation: [...world.worldRotation],
            scale: world.uniformScale,
          },
        }
      }),
    })
  }, [accessories, onCompositionSettled, settlementPlan, settling])

  useEffect(() => {
    if (!settling || !settlementPlan || !placementSession) return

    finalRockRef.current = settlementPlan.rock
      ? null
      : {
          position: [...placementSession.rock.position],
          rotation: [...placementSession.rock.rotation],
        }

    finalAccessoriesRef.current = new Map()
    for (const instance of accessories) {
      if (settlementPlan.accessoryIds.includes(instance.id)) continue
      const transform = placementSession.accessories[instance.id]
      if (!transform) continue
      finalAccessoriesRef.current.set(instance.id, {
        instanceId: instance.id,
        worldPosition: [...transform.position],
        worldRotation: [...transform.rotation],
        uniformScale: transform.scale,
      })
    }
    compositionReportedRef.current = false

    // A membership-only session (for example a removal) may have no physical body
    // to settle. The canonical composition is already fully known in that case.
    queueMicrotask(tryReportComposition)
  }, [accessories, placementSession, settlementPlan, settling, tryReportComposition])

  const handleRockBodySettled = useCallback((transform: PlacementTransform) => {
    finalRockRef.current = normalizeRockPose({
      position: [...transform.position],
      rotation: [...transform.rotation],
    })
    tryReportComposition()
  }, [tryReportComposition])

  const handleAccessoryGlobalSettled = useCallback((transform: WorldAccessoryTransform) => {
    finalAccessoriesRef.current.set(transform.instanceId, transform)
    tryReportComposition()
  }, [tryReportComposition])

  const handleAccessoryModelSettled = useCallback((instanceId: string, transform: PlacementTransform) => {
    if (settling && settlementPlan) {
      handleAccessoryGlobalSettled({
        instanceId,
        worldPosition: [...transform.position],
        worldRotation: [...transform.rotation],
        uniformScale: transform.scale,
      })
      return
    }
    onAccessorySettled?.(instanceId, transform)
  }, [handleAccessoryGlobalSettled, onAccessorySettled, settlementPlan, settling])

  return {
    handleRockBodySettled,
    handleAccessoryGlobalSettled,
    handleAccessoryModelSettled,
  }
}

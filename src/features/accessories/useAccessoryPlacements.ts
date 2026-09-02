import { useCallback, useEffect, useRef, useState } from 'react'

import type { StabilizedRockComposition } from '../rockMovement/rockMovementTypes'
import {
  createAccessoryPlacement,
  loadAccessoryPlacements,
  removeAccessoryPlacement,
} from './accessoryPlacementApi'
import {
  MAX_EQUIPPED_ACCESSORIES,
  defaultAccessoryTransform,
} from './accessoryPlacementRules'
import type {
  AccessoryCatalogItem,
  EquippedAccessoryInstance,
  StabilizeAccessoryPlacementResult,
} from './accessoryTypes'

export function useAccessoryPlacements(userRockId: string) {
  const [instances, setInstances] = useState<EquippedAccessoryInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canonicalInstancesRef = useRef<EquippedAccessoryInstance[]>([])

  const replaceCanonical = useCallback((next: EquippedAccessoryInstance[]) => {
    canonicalInstancesRef.current = next
    setInstances(next)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await loadAccessoryPlacements(userRockId)
      replaceCanonical(next)
      return next
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Les placements n’ont pas pu être relus.')
      throw nextError
    } finally {
      setLoading(false)
    }
  }, [replaceCanonical, userRockId])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void loadAccessoryPlacements(userRockId).then((next) => {
      if (!active) return
      canonicalInstancesRef.current = next
      setInstances(next)
    }).catch((nextError) => {
      if (active) setError(nextError instanceof Error ? nextError.message : 'Les placements n’ont pas pu être relus.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [userRockId])

  const place = useCallback(async (accessory: AccessoryCatalogItem) => {
    if (pendingId) throw new Error('Une opération de placement est déjà en cours.')
    if (instances.length >= MAX_EQUIPPED_ACCESSORIES) {
      throw new Error('Le Socle accepte au maximum huit accessoires simultanés.')
    }

    setPendingId(`new:${accessory.id}`)
    setError(null)
    try {
      const created = await createAccessoryPlacement({
        userRockId,
        accessory,
        eventKey: crypto.randomUUID(),
        transform: defaultAccessoryTransform(accessory, instances.length),
      })
      canonicalInstancesRef.current = [...canonicalInstancesRef.current, created]
      setInstances((current) => [...current, created])
      return created
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Le placement n’a pas pu être créé.')
      throw nextError
    } finally {
      setPendingId(null)
    }
  }, [instances.length, pendingId, userRockId])

  const acceptStabilizedAccessory = useCallback((result: StabilizeAccessoryPlacementResult) => {
    const apply = (items: EquippedAccessoryInstance[]) => items.map((instance) => instance.id === result.instanceId
      ? { ...instance, ...result }
      : instance)
    canonicalInstancesRef.current = apply(canonicalInstancesRef.current)
    setInstances((current) => apply(current))
    setError(null)
  }, [])

  const acceptComposition = useCallback((composition: StabilizedRockComposition) => {
    const settled = new Map(composition.accessories.map((item) => [item.instanceId, item]))
    let nextCanonical: EquippedAccessoryInstance[] = []
    setInstances((current) => {
      nextCanonical = current.map((instance) => {
        const transform = settled.get(instance.id)
        return transform ? {
          ...instance,
          ...transform,
          stabilizedAt: composition.stabilizedAt,
          updatedAt: composition.stabilizedAt,
        } : instance
      })
      return nextCanonical
    })
    queueMicrotask(() => {
      if (nextCanonical.length > 0 || canonicalInstancesRef.current.length === 0) {
        canonicalInstancesRef.current = nextCanonical
      }
    })
    setError(null)
  }, [])

  const remove = useCallback(async (instanceId: string) => {
    if (pendingId) return false
    setPendingId(instanceId)
    setError(null)
    try {
      await removeAccessoryPlacement({ instanceId, eventKey: crypto.randomUUID() })
      canonicalInstancesRef.current = canonicalInstancesRef.current.filter((instance) => instance.id !== instanceId)
      setInstances((current) => current.filter((instance) => instance.id !== instanceId))
      return true
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Le retrait n’a pas pu être enregistré.')
      return false
    } finally {
      setPendingId(null)
    }
  }, [pendingId])

  return {
    instances,
    loading,
    pendingId,
    error,
    maxInstances: MAX_EQUIPPED_ACCESSORIES,
    refresh,
    place,
    acceptStabilizedAccessory,
    acceptComposition,
    remove,
    clearError: () => setError(null),
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'

import { warmCompanionAssets } from '../../pwa/assetWarmup'
import { SERVER_RECONCILED_EVENT } from '../../pwa/pendingMutations'
import { readCachedAccessories, writeCachedAccessories } from '../../pwa/resilienceCache'
import type { StabilizedRockComposition } from '../rockMovement/rockMovementTypes'
import {
  AccessoryPlacementError,
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

function companionAssetUrls(instances: EquippedAccessoryInstance[]) {
  return instances.flatMap((instance) => [instance.modelPath, instance.previewPath])
}

export function useAccessoryPlacements(userRockId: string) {
  const [instances, setInstances] = useState<EquippedAccessoryInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canonicalInstancesRef = useRef<EquippedAccessoryInstance[]>([])
  const retryKeysRef = useRef(new Map<string, string>())

  const replaceCanonical = useCallback((next: EquippedAccessoryInstance[]) => {
    canonicalInstancesRef.current = next
    setInstances(next)
    void writeCachedAccessories(userRockId, next)
    void warmCompanionAssets(companionAssetUrls(next))
  }, [userRockId])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await loadAccessoryPlacements(userRockId)
      replaceCanonical(next)
      return next
    } catch (nextError) {
      const cached = await readCachedAccessories(userRockId)
      if (cached) {
        canonicalInstancesRef.current = cached
        setInstances(cached)
        void warmCompanionAssets(companionAssetUrls(cached))
        setError('Synchronisation indisponible. Les accessoires affichés correspondent au dernier état serveur connu.')
      } else {
        setError(nextError instanceof Error ? nextError.message : 'Les placements n’ont pas pu être relus.')
      }
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
      replaceCanonical(next)
    }).catch(async (nextError) => {
      if (!active) return
      const cached = await readCachedAccessories(userRockId)
      if (!active) return
      if (cached) {
        canonicalInstancesRef.current = cached
        setInstances(cached)
        void warmCompanionAssets(companionAssetUrls(cached))
        setError('Synchronisation indisponible. Les accessoires affichés correspondent au dernier état serveur connu.')
      } else {
        setError(nextError instanceof Error ? nextError.message : 'Les placements n’ont pas pu être relus.')
      }
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [replaceCanonical, userRockId])

  useEffect(() => {
    const handleReconciled = () => {
      retryKeysRef.current.clear()
      void refresh().catch(() => undefined)
    }
    window.addEventListener(SERVER_RECONCILED_EVENT, handleReconciled)
    return () => window.removeEventListener(SERVER_RECONCILED_EVENT, handleReconciled)
  }, [refresh])

  const place = useCallback(async (accessory: AccessoryCatalogItem) => {
    if (pendingId) throw new Error('Une opération de placement est déjà en cours.')
    if (instances.length >= MAX_EQUIPPED_ACCESSORIES) {
      throw new Error('Le Socle accepte au maximum huit accessoires simultanés.')
    }

    const retryKey = `create:${userRockId}:${accessory.id}`
    const eventKey = retryKeysRef.current.get(retryKey) ?? crypto.randomUUID()
    setPendingId(`new:${accessory.id}`)
    setError(null)
    try {
      const created = await createAccessoryPlacement({
        userRockId,
        accessory,
        eventKey,
        transform: defaultAccessoryTransform(accessory, instances.length),
      })
      retryKeysRef.current.delete(retryKey)
      const nextCanonical = canonicalInstancesRef.current.some((instance) => instance.id === created.id)
        ? canonicalInstancesRef.current
        : [...canonicalInstancesRef.current, created]
      replaceCanonical(nextCanonical)
      setInstances((current) => current.some((instance) => instance.id === created.id) ? current : [...current, created])
      return created
    } catch (nextError) {
      const retryable = nextError instanceof AccessoryPlacementError ? nextError.retryable : true
      if (retryable) retryKeysRef.current.set(retryKey, eventKey)
      else retryKeysRef.current.delete(retryKey)
      setError(nextError instanceof Error ? nextError.message : 'Le placement n’a pas pu être créé.')
      throw nextError
    } finally {
      setPendingId(null)
    }
  }, [instances.length, pendingId, replaceCanonical, userRockId])

  const acceptStabilizedAccessory = useCallback((result: StabilizeAccessoryPlacementResult) => {
    const apply = (items: EquippedAccessoryInstance[]) => items.map((instance) => instance.id === result.instanceId
      ? { ...instance, ...result }
      : instance)
    canonicalInstancesRef.current = apply(canonicalInstancesRef.current)
    setInstances((current) => apply(current))
    void writeCachedAccessories(userRockId, canonicalInstancesRef.current)
    setError(null)
  }, [userRockId])

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
        void writeCachedAccessories(userRockId, nextCanonical)
      }
    })
    setError(null)
  }, [userRockId])

  const remove = useCallback(async (instanceId: string) => {
    if (pendingId) return false
    const retryKey = `remove:${instanceId}`
    const eventKey = retryKeysRef.current.get(retryKey) ?? crypto.randomUUID()
    setPendingId(instanceId)
    setError(null)
    try {
      await removeAccessoryPlacement({ instanceId, eventKey })
      retryKeysRef.current.delete(retryKey)
      replaceCanonical(canonicalInstancesRef.current.filter((instance) => instance.id !== instanceId))
      return true
    } catch (nextError) {
      const retryable = nextError instanceof AccessoryPlacementError ? nextError.retryable : true
      if (retryable) retryKeysRef.current.set(retryKey, eventKey)
      else retryKeysRef.current.delete(retryKey)
      setError(nextError instanceof Error ? nextError.message : 'Le retrait n’a pas pu être enregistré.')
      return false
    } finally {
      setPendingId(null)
    }
  }, [pendingId, replaceCanonical])

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

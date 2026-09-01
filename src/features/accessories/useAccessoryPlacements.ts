import { useCallback, useEffect, useState } from 'react'

import {
  createAccessoryPlacement,
  loadAccessoryPlacements,
  removeAccessoryPlacement,
  updateAccessoryPlacement,
} from './accessoryPlacementApi'
import {
  MAX_EQUIPPED_ACCESSORIES,
  clampAccessoryTransform,
  defaultAccessoryTransform,
} from './accessoryPlacementRules'
import type { AccessoryCatalogItem, AccessoryTransform, EquippedAccessoryInstance } from './accessoryTypes'

export function useAccessoryPlacements(userRockId: string) {
  const [instances, setInstances] = useState<EquippedAccessoryInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await loadAccessoryPlacements(userRockId)
      setInstances(next)
      return next
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Les placements n’ont pas pu être relus.')
      throw nextError
    } finally {
      setLoading(false)
    }
  }, [userRockId])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void loadAccessoryPlacements(userRockId).then((next) => {
      if (active) setInstances(next)
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
      setInstances((current) => [...current, created])
      return created
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Le placement n’a pas pu être créé.')
      throw nextError
    } finally {
      setPendingId(null)
    }
  }, [instances.length, pendingId, userRockId])

  const update = useCallback(async (instanceId: string, transform: AccessoryTransform) => {
    if (pendingId) return
    const currentInstance = instances.find((instance) => instance.id === instanceId)
    if (!currentInstance) return

    const nextTransform = clampAccessoryTransform(transform, currentInstance.scaleMin, currentInstance.scaleMax)
    setPendingId(instanceId)
    setError(null)
    setInstances((current) => current.map((instance) => instance.id === instanceId
      ? { ...instance, ...nextTransform }
      : instance))

    try {
      const result = await updateAccessoryPlacement({ instanceId, transform: nextTransform })
      setInstances((current) => current.map((instance) => instance.id === instanceId
        ? { ...instance, ...result }
        : instance))
    } catch (nextError) {
      setInstances((current) => current.map((instance) => instance.id === instanceId ? currentInstance : instance))
      setError(nextError instanceof Error ? nextError.message : 'Le transform n’a pas pu être enregistré.')
    } finally {
      setPendingId(null)
    }
  }, [instances, pendingId])

  const remove = useCallback(async (instanceId: string) => {
    if (pendingId) return false
    setPendingId(instanceId)
    setError(null)
    try {
      await removeAccessoryPlacement({ instanceId, eventKey: crypto.randomUUID() })
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
    update,
    remove,
    clearError: () => setError(null),
  }
}

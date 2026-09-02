import { useCallback, useEffect, useState } from 'react'

import type { StabilizedRockComposition } from '../rockMovement/rockMovementTypes'
import {
  AccessoryPlacementError,
  createAccessoryPlacement,
  loadAccessoryPlacements,
  removeAccessoryPlacement,
  stabilizeAccessoryPlacement,
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
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await loadAccessoryPlacements(userRockId)
      setInstances(next)
      setDirtyIds(new Set())
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
    setDirtyIds(new Set())
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

  const draft = useCallback((instanceId: string, transform: AccessoryTransform) => {
    const currentInstance = instances.find((instance) => instance.id === instanceId)
    if (!currentInstance || pendingId) return
    const nextTransform = clampAccessoryTransform(transform, currentInstance.scaleMin, currentInstance.scaleMax)
    setInstances((current) => current.map((instance) => instance.id === instanceId
      ? { ...instance, ...nextTransform, physicsSettled: undefined }
      : instance))
    setDirtyIds((current) => {
      const next = new Set(current)
      next.add(instanceId)
      return next
    })
    setError(null)
  }, [instances, pendingId])

  const commitDrafts = useCallback(async () => {
    if (pendingId) return false
    const dirty = instances.filter((instance) => dirtyIds.has(instance.id))
    if (dirty.length === 0) return true

    setPendingId('accessory-edit')
    setError(null)
    try {
      const confirmed = new Map<string, Awaited<ReturnType<typeof updateAccessoryPlacement>>>()
      for (const instance of dirty) {
        const result = await updateAccessoryPlacement({
          instanceId: instance.id,
          transform: {
            localPosition: instance.localPosition,
            localRotation: instance.localRotation,
            uniformScale: instance.uniformScale,
          },
        })
        confirmed.set(instance.id, result)
      }

      setInstances((current) => current.map((instance) => {
        const result = confirmed.get(instance.id)
        return result
          ? { ...instance, ...result, stabilizedAt: null, physicsSettled: undefined }
          : instance
      }))
      setDirtyIds(new Set())
      return true
    } catch (nextError) {
      try {
        const canonical = await loadAccessoryPlacements(userRockId)
        setInstances(canonical)
        setDirtyIds(new Set())
      } catch {
        // Keep the visible draft if the canonical reread is also unavailable.
      }
      setError(nextError instanceof Error
        ? `${nextError.message} La session d’édition reste ouverte.`
        : 'Le brouillon n’a pas pu être confirmé ; la session d’édition reste ouverte.')
      return false
    } finally {
      setPendingId(null)
    }
  }, [dirtyIds, instances, pendingId, userRockId])

  const update = useCallback(async (instanceId: string, transform: AccessoryTransform) => {
    if (pendingId) return
    const currentInstance = instances.find((instance) => instance.id === instanceId)
    if (!currentInstance) return

    const nextTransform = clampAccessoryTransform(transform, currentInstance.scaleMin, currentInstance.scaleMax)
    const physicallySettled = transform.physicsSettled === true
    setPendingId(instanceId)
    setError(null)

    try {
      if (!physicallySettled) {
        const result = await updateAccessoryPlacement({ instanceId, transform: nextTransform })
        setInstances((current) => current.map((instance) => instance.id === instanceId
          ? { ...instance, ...result, stabilizedAt: null, physicsSettled: undefined }
          : instance))
        return
      }

      setInstances((current) => current.map((instance) => instance.id === instanceId
        ? { ...instance, ...nextTransform }
        : instance))

      const input = { instanceId, transform: nextTransform, eventKey: crypto.randomUUID() }
      let result
      try {
        result = await stabilizeAccessoryPlacement(input)
      } catch (firstError) {
        if (!(firstError instanceof AccessoryPlacementError) || !firstError.retryable) throw firstError
        result = await stabilizeAccessoryPlacement(input)
      }

      setInstances((current) => current.map((instance) => instance.id === instanceId
        ? { ...instance, ...result, physicsSettled: undefined }
        : instance))
    } catch (nextError) {
      setInstances((current) => current.map((instance) => instance.id === instanceId ? currentInstance : instance))
      setError(nextError instanceof Error
        ? `${nextError.message} Le dernier état serveur connu a été restauré.`
        : 'La pose n’a pas pu être confirmée ; le dernier état serveur connu a été restauré.')
    } finally {
      setPendingId(null)
    }
  }, [instances, pendingId])

  const acceptComposition = useCallback((composition: StabilizedRockComposition) => {
    const settled = new Map(composition.accessories.map((item) => [item.instanceId, item]))
    setInstances((current) => current.map((instance) => {
      const transform = settled.get(instance.id)
      return transform ? {
        ...instance,
        ...transform,
        stabilizedAt: composition.stabilizedAt,
        updatedAt: composition.stabilizedAt,
        physicsSettled: undefined,
      } : instance
    }))
    setDirtyIds(new Set())
    setError(null)
  }, [])

  const remove = useCallback(async (instanceId: string) => {
    if (pendingId) return false
    setPendingId(instanceId)
    setError(null)
    try {
      await removeAccessoryPlacement({ instanceId, eventKey: crypto.randomUUID() })
      setInstances((current) => current.filter((instance) => instance.id !== instanceId))
      setDirtyIds((current) => {
        const next = new Set(current)
        next.delete(instanceId)
        return next
      })
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
    dirtyCount: dirtyIds.size,
    error,
    maxInstances: MAX_EQUIPPED_ACCESSORIES,
    refresh,
    place,
    draft,
    commitDrafts,
    update,
    acceptComposition,
    remove,
    clearError: () => setError(null),
  }
}
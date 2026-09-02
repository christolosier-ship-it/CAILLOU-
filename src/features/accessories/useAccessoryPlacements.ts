import { useCallback, useEffect, useRef, useState } from 'react'

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
import type { AccessoryCatalogItem, AccessoryTransform, EquippedAccessoryInstance, StabilizeAccessoryPlacementResult } from './accessoryTypes'

export function useAccessoryPlacements(userRockId: string) {
  const [instances, setInstances] = useState<EquippedAccessoryInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set())
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
      setDirtyIds(new Set())
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
    setDirtyIds(new Set())
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

  const draft = useCallback((instanceId: string, transform: AccessoryTransform) => {
    const currentInstance = instances.find((instance) => instance.id === instanceId)
    if (!currentInstance || pendingId) return
    const nextTransform = clampAccessoryTransform(transform, currentInstance.scaleMin, currentInstance.scaleMax)
    setInstances((current) => current.map((instance) => instance.id === instanceId
      ? { ...instance, ...nextTransform, stabilizedAt: null, physicsSettled: undefined }
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
    if (dirtyIds.size === 0) return true

    // 10.75 correction: a placement draft remains strictly local until Rapier
    // has produced the final pose. Leaving Placement only arms the dynamic
    // settlement; no intermediate transform is written to Supabase here.
    setInstances((current) => current.map((instance) => dirtyIds.has(instance.id)
      ? { ...instance, stabilizedAt: null, physicsSettled: undefined }
      : instance))
    setDirtyIds(new Set())
    setError(null)
    return true
  }, [dirtyIds, pendingId])

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
        const nextInstance = { ...currentInstance, ...result, stabilizedAt: null, physicsSettled: undefined }
        canonicalInstancesRef.current = canonicalInstancesRef.current.map((instance) => instance.id === instanceId
          ? nextInstance
          : instance)
        setInstances((current) => current.map((instance) => instance.id === instanceId ? nextInstance : instance))
        return
      }

      const input = { instanceId, transform: nextTransform, eventKey: crypto.randomUUID() }
      let result
      try {
        result = await stabilizeAccessoryPlacement(input)
      } catch (firstError) {
        if (!(firstError instanceof AccessoryPlacementError) || !firstError.retryable) throw firstError
        result = await stabilizeAccessoryPlacement(input)
      }

      const nextInstance = { ...currentInstance, ...result, physicsSettled: undefined }
      canonicalInstancesRef.current = canonicalInstancesRef.current.map((instance) => instance.id === instanceId
        ? nextInstance
        : instance)
      setInstances((current) => current.map((instance) => instance.id === instanceId ? nextInstance : instance))
      setDirtyIds((current) => {
        const next = new Set(current)
        next.delete(instanceId)
        return next
      })
    } catch (nextError) {
      const canonical = canonicalInstancesRef.current.find((instance) => instance.id === instanceId)
      if (canonical) {
        setInstances((current) => current.map((instance) => instance.id === instanceId ? canonical : instance))
      }
      setError(nextError instanceof Error
        ? `${nextError.message} Le dernier état serveur connu a été restauré.`
        : 'La pose n’a pas pu être confirmée ; le dernier état serveur connu a été restauré.')
    } finally {
      setPendingId(null)
    }
  }, [instances, pendingId])

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
          physicsSettled: undefined,
        } : instance
      })
      return nextCanonical
    })
    queueMicrotask(() => {
      if (nextCanonical.length > 0 || canonicalInstancesRef.current.length === 0) {
        canonicalInstancesRef.current = nextCanonical
      }
    })
    setDirtyIds(new Set())
    setError(null)
  }, [])


const acceptStabilizedAccessory = useCallback((result: StabilizeAccessoryPlacementResult) => {
  const apply = (items: EquippedAccessoryInstance[]) => items.map((instance) => instance.id === result.instanceId
    ? { ...instance, ...result }
    : instance)
  canonicalInstancesRef.current = apply(canonicalInstancesRef.current)
  setInstances((current) => apply(current))
  setDirtyIds((current) => {
    const next = new Set(current)
    next.delete(result.instanceId)
    return next
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
    acceptStabilizedAccessory,
    acceptComposition,
    remove,
    clearError: () => setError(null),
  }
}

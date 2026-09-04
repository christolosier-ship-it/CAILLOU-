import { useCallback, useEffect, useRef, useState } from 'react'

import { supabase } from '../../lib/supabase/client'
import { SERVER_RECONCILED_EVENT } from '../../pwa/pendingMutations'
import { readCachedPermit, writeCachedPermit } from '../../pwa/resilienceCache'
import {
  RockMovementError,
  loadRockMovementPermit,
  purchaseRockMovementPermit,
} from './rockMovementApi'
import { permitSnapshotForRock } from './rockMovementPermitRules'
import type { RockMovementPermitSnapshot } from './rockMovementTypes'

export function useRockMovementPermit(userRockId: string) {
  const [snapshot, setSnapshot] = useState<RockMovementPermitSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryEventKey, setRetryEventKey] = useState<string | null>(null)
  const activeRockIdRef = useRef(userRockId)
  activeRockIdRef.current = userRockId

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user.id ?? null
    try {
      const next = await loadRockMovementPermit(userRockId)
      if (activeRockIdRef.current !== userRockId) return null
      setSnapshot(next)
      if (userId) void writeCachedPermit(userId, userRockId, next)
      if (next.unlockedAt) setRetryEventKey(null)
      return next
    } catch (nextError) {
      const cached = userId ? await readCachedPermit(userId, userRockId) : null
      if (activeRockIdRef.current !== userRockId) return null
      const scopedCached = permitSnapshotForRock(cached, userRockId)
      if (scopedCached) {
        setSnapshot(scopedCached)
        setError('Synchronisation indisponible. Le permis affiché correspond au dernier état serveur connu pour ce caillou.')
        return scopedCached
      }
      setSnapshot(null)
      setError(nextError instanceof Error ? nextError.message : 'Le permis de ce caillou n’a pas pu être vérifié.')
      return null
    } finally {
      if (activeRockIdRef.current === userRockId) setLoading(false)
    }
  }, [userRockId])

  useEffect(() => {
    setSnapshot((current) => permitSnapshotForRock(current, userRockId))
    setRetryEventKey(null)
    setError(null)
    void refresh()
  }, [refresh, userRockId])

  useEffect(() => {
    const handleReconciled = () => void refresh()
    window.addEventListener(SERVER_RECONCILED_EVENT, handleReconciled)
    return () => window.removeEventListener(SERVER_RECONCILED_EVENT, handleReconciled)
  }, [refresh])

  const purchase = useCallback(async () => {
    if (pending) return null
    setPending(true)
    setError(null)
    const eventKey = retryEventKey ?? crypto.randomUUID()
    try {
      const result = await purchaseRockMovementPermit(userRockId, eventKey)
      setRetryEventKey(null)

      const currentSnapshot = permitSnapshotForRock(snapshot, userRockId)
      if (activeRockIdRef.current === userRockId && currentSnapshot) {
        const next: RockMovementPermitSnapshot = {
          ...currentSnapshot,
          unlockedAt: result.unlockedAt,
          pricePaid: result.pricePaid,
          acquisitionSource: 'purchase',
        }
        setSnapshot(next)
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session) {
          void writeCachedPermit(sessionData.session.user.id, userRockId, next)
        }
      }
      return result
    } catch (nextError) {
      if (nextError instanceof RockMovementError && nextError.kind === 'already-unlocked') {
        setRetryEventKey(null)
        await refresh()
        return null
      }
      const retryable = nextError instanceof RockMovementError ? nextError.retryable : true
      setRetryEventKey(retryable ? eventKey : null)
      setError(nextError instanceof Error ? nextError.message : 'Le permis de ce caillou n’a pas pu être délivré.')
      return null
    } finally {
      setPending(false)
    }
  }, [pending, refresh, retryEventKey, snapshot, userRockId])

  const currentSnapshot = permitSnapshotForRock(snapshot, userRockId)
  const staleSnapshotVisible = snapshot !== null && currentSnapshot === null
  return {
    snapshot: currentSnapshot,
    loading: loading || staleSnapshotVisible,
    pending,
    error,
    unlocked: currentSnapshot?.unlockedAt != null,
    retrying: retryEventKey != null,
    refresh,
    purchase,
    clearError: () => setError(null),
  }
}

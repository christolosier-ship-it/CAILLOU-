import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../../lib/supabase/client'
import { SERVER_RECONCILED_EVENT } from '../../pwa/pendingMutations'
import { readCachedPermit, writeCachedPermit } from '../../pwa/resilienceCache'
import {
  RockMovementError,
  loadRockMovementPermit,
  purchaseRockMovementPermit,
} from './rockMovementApi'
import type { RockMovementPermitSnapshot } from './rockMovementTypes'

export function useRockMovementPermit() {
  const [snapshot, setSnapshot] = useState<RockMovementPermitSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryEventKey, setRetryEventKey] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user.id ?? null
    try {
      const next = await loadRockMovementPermit()
      setSnapshot(next)
      if (userId) void writeCachedPermit(userId, next)
      if (next.unlockedAt) setRetryEventKey(null)
      return next
    } catch (nextError) {
      const cached = userId ? await readCachedPermit(userId) : null
      if (cached) {
        setSnapshot(cached)
        setError('Synchronisation indisponible. Le permis affiché correspond au dernier état serveur connu.')
        return cached
      }
      setError(nextError instanceof Error ? nextError.message : 'Le permis n’a pas pu être vérifié.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

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
      let result
      try {
        result = await purchaseRockMovementPermit(eventKey)
      } catch (firstError) {
        if (!(firstError instanceof RockMovementError) || !firstError.retryable) throw firstError
        result = await purchaseRockMovementPermit(eventKey)
      }
      setRetryEventKey(null)
      setSnapshot((current) => current ? {
        ...current,
        unlockedAt: result.unlockedAt,
        pricePaid: result.pricePaid,
      } : current)
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData.session && snapshot) {
        void writeCachedPermit(sessionData.session.user.id, {
          ...snapshot,
          unlockedAt: result.unlockedAt,
          pricePaid: result.pricePaid,
        })
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
      setError(nextError instanceof Error ? nextError.message : 'Le permis n’a pas pu être délivré.')
      return null
    } finally {
      setPending(false)
    }
  }, [pending, refresh, retryEventKey, snapshot])

  return {
    snapshot,
    loading,
    pending,
    error,
    unlocked: snapshot?.unlockedAt != null,
    retrying: retryEventKey != null,
    refresh,
    purchase,
    clearError: () => setError(null),
  }
}

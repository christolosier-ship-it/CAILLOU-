import { useCallback, useEffect, useState } from 'react'

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
    try {
      const next = await loadRockMovementPermit()
      setSnapshot(next)
      if (next.unlockedAt) setRetryEventKey(null)
      return next
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Le permis n’a pas pu être vérifié.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
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
  }, [pending, refresh, retryEventKey])

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

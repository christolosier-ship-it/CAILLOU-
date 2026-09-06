import { useCallback, useEffect, useRef, useState } from 'react'
import { SERVER_RECONCILED_EVENT } from '../../pwa/pendingMutations'
import { getResilienceValue, putResilienceValue } from '../../pwa/resilienceCache'
import { FloorError, floorServices } from './floorApi'
import { floorCacheKey, selectedFloorMaterial } from './floorRules'
import type { FloorOperation, FloorServices, FloorSnapshot } from './floorTypes'

export function useFloors(userRockId: string, onBalanceChanged: (balance: number) => void, services: FloorServices = floorServices) {
  const [snapshot, setSnapshot] = useState<FloorSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<FloorOperation | null>(null)
  const [retry, setRetry] = useState<FloorOperation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [confirmed, setConfirmed] = useState(false)
  const rockRef = useRef(userRockId)
  rockRef.current = userRockId
  const retryRef = useRef(retry)
  retryRef.current = retry
  const inFlight = useRef(false)
  const requestVersion = useRef(0)

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current
    const current = () => rockRef.current === userRockId && requestVersion.current === version
    setLoading(true)
    const owner = await services.userId()
    try {
      if (!navigator.onLine) throw new Error('Hors ligne : dernier sol confirmé affiché.')
      const next = await services.load(userRockId)
      if (!current()) return
      setSnapshot(next)
      setConfirmed(true)
      const interrupted = retryRef.current
      const reconciled = interrupted && (interrupted.kind === 'purchase'
        ? next.items.some((item) => item.id === interrupted.floorId && item.acquiredAt)
        : next.selectedId === interrupted.floorId)
      if (reconciled) {
        retryRef.current = null
        setRetry(null)
      }
      // Keep an unresolved retry visible; clearing its error would hide the only action.
      if (!interrupted || reconciled) setError(null)
      await putResilienceValue(floorCacheKey(next.userId, userRockId), next)
    } catch (failure) {
      const cached = owner ? await getResilienceValue<FloorSnapshot>(floorCacheKey(owner, userRockId)) : null
      if (!current()) return
      if (cached?.userId === owner && cached?.userRockId === userRockId) setSnapshot(cached)
      setConfirmed(false)
      setError(failure instanceof Error ? failure.message : 'Les sols ne sont pas disponibles.')
    } finally {
      if (current()) setLoading(false)
    }
  }, [services, userRockId])

  useEffect(() => {
    setRetry(null)
    setFeedback(null)
    setConfirmed(false)
    void refresh()
    return () => { requestVersion.current += 1 }
  }, [refresh])
  useEffect(() => {
    const reconnect = () => { setOnline(navigator.onLine); if (!inFlight.current) void refresh() }
    const offline = () => { setOnline(false); setConfirmed(false) }
    window.addEventListener('online', reconnect)
    window.addEventListener('offline', offline)
    window.addEventListener(SERVER_RECONCILED_EVENT, reconnect)
    return () => {
      window.removeEventListener('online', reconnect)
      window.removeEventListener('offline', offline)
      window.removeEventListener(SERVER_RECONCILED_EVENT, reconnect)
    }
  }, [refresh])

  const submit = useCallback(async (operation: FloorOperation) => {
    if (inFlight.current || !navigator.onLine) return
    inFlight.current = true
    requestVersion.current += 1
    setPending(operation)
    setError(null)
    setFeedback(null)
    try {
      if (operation.kind === 'purchase') {
        const result = await services.purchase(operation.floorId, operation.eventKey)
        if (rockRef.current === userRockId) onBalanceChanged(result.balance)
      } else {
        const result = await services.select(userRockId, operation.floorId, operation.eventKey)
        if (rockRef.current === userRockId) {
          // Publish only the RPC-confirmed choice; a request draft never reaches the scene.
          setSnapshot((state) => {
            if (state?.userRockId !== userRockId) return state
            const next = { ...state, selectedId: result.floorId }
            void putResilienceValue(floorCacheKey(next.userId, userRockId), next)
            return next
          })
        }
      }
      if (rockRef.current !== userRockId) return
      setRetry(null)
      setFeedback(operation.kind === 'purchase'
        ? 'Sol acquis pour votre compte. Vous pouvez maintenant le sélectionner.'
        : 'Sol sélectionné pour ce caillou.')
      await refresh()
    } catch (failure) {
      if (rockRef.current !== userRockId) return
      const retryable = !(failure instanceof FloorError) || failure.retryable
      setRetry(retryable ? operation : null)
      if (!retryable) await refresh()
      setError(failure instanceof Error ? failure.message : 'Confirmation non reçue. Réessayez.')
    } finally {
      inFlight.current = false
      setPending(null)
    }
  }, [onBalanceChanged, refresh, services, userRockId])

  const currentSnapshot = snapshot?.userRockId === userRockId ? snapshot : null
  return {
    snapshot: currentSnapshot, material: selectedFloorMaterial(currentSnapshot), loading, pending,
    retry, error, feedback, online, confirmed, refresh,
    act: (kind: FloorOperation['kind'], floorId: string) => submit({ kind, floorId, eventKey: crypto.randomUUID() }),
    retryLast: () => retry ? submit(retry) : Promise.resolve(),
  }
}
export type FloorController = ReturnType<typeof useFloors>

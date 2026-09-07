import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { SERVER_RECONCILED_EVENT } from '../../pwa/pendingMutations'
import { getResilienceValue, putResilienceValue } from '../../pwa/resilienceCache'
import { PaintError, paintServices } from './paintApi'
import type { PaintServices, PaintSnapshot } from './paintApi'
import { NATURAL_APPEARANCE, paintCacheKey, paintDraftReducer, parseRockAppearance, sameAppearance } from './paintRules'
import type { RockAppearance } from './paintRules'

type Operation = { kind: 'purchase'; eventKey: string } | { kind: 'save'; eventKey: string; appearance: RockAppearance }
export function usePaint(rockId: string, onBalance: (balance: number) => void, services: PaintServices = paintServices) {
  const [snapshot, setSnapshot] = useState<PaintSnapshot | null>(null)
  const [appearanceState, dispatchAppearance] = useReducer(paintDraftReducer, { canonical: NATURAL_APPEARANCE, draft: null })
  const snapshotRef = useRef(snapshot); snapshotRef.current = snapshot
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState<Operation | null>(null)
  const [retry, setRetry] = useState<Operation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const scope = useRef(rockId); scope.current = rockId
  const balanceCallback = useRef(onBalance); balanceCallback.current = onBalance
  const retryRef = useRef(retry); retryRef.current = retry
  const inFlight = useRef(false)
  const epoch = useRef(0)

  const refresh = useCallback(async () => {
    const version = ++epoch.current
    const current = () => scope.current === rockId && epoch.current === version
    let owner: string | null = null
    setLoading(true)
    try {
      owner = await services.userId()
      if (!navigator.onLine) throw new PaintError('Hors ligne : dernier état confirmé affiché.', true)
      const next = await services.load(rockId)
      if (!current()) return
      setSnapshot(next); setConfirmed(true); balanceCallback.current(next.balance)
      dispatchAppearance({ type: 'synchronized', appearance: next.appearance })
      const interrupted = retryRef.current
      const reconciled = interrupted && (interrupted.kind === 'purchase' ? next.unlocked : sameAppearance(next.appearance, interrupted.appearance))
      if (reconciled) { setRetry(null); retryRef.current = null; if (interrupted.kind === 'save') dispatchAppearance({ type: 'confirmed', appearance: next.appearance }) }
      if (!interrupted || reconciled) setError(null)
      await putResilienceValue(paintCacheKey(next.userId, rockId), next)
    } catch (failure) {
      const cached = owner ? await getResilienceValue<PaintSnapshot>(paintCacheKey(owner, rockId)) : null
      if (!current()) return
      if (cached?.userId === owner && cached?.rockId === rockId) {
        try {
          const appearance = parseRockAppearance(cached.appearance)
          setSnapshot({ ...cached, appearance }); dispatchAppearance({ type: 'synchronized', appearance })
        } catch { /* Ignore invalid cache. */ }
      }
      setConfirmed(false)
      setError(failure instanceof Error ? failure.message : 'Synchronisation indisponible.')
    } finally { if (current()) setLoading(false) }
  }, [rockId, services])

  useEffect(() => {
    dispatchAppearance({ type: 'confirmed', appearance: NATURAL_APPEARANCE }); setRetry(null); retryRef.current = null; setFeedback(null); setConfirmed(false)
    void refresh()
    return () => { epoch.current++ }
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

  const submit = useCallback(async (operation: Operation) => {
    if (inFlight.current || !navigator.onLine) return false
    inFlight.current = true; epoch.current++; setPending(operation); setError(null); setFeedback(null)
    try {
      if (operation.kind === 'purchase') {
        const result = await services.purchase(rockId, operation.eventKey)
        if (scope.current === rockId) balanceCallback.current(result.balance)
      } else {
        const appearance = await services.save(rockId, operation.appearance, operation.eventKey)
        if (scope.current === rockId) {
          const previous = snapshotRef.current
          if (previous?.rockId === rockId) {
            const next = { ...previous, appearance }
            setSnapshot(next)
            await putResilienceValue(paintCacheKey(next.userId, rockId), next)
          }
          if (scope.current === rockId) dispatchAppearance({ type: 'confirmed', appearance })
        }
      }
      if (scope.current !== rockId) return false
      setRetry(null); retryRef.current = null
      setFeedback(operation.kind === 'purchase' ? 'Peinture acquise pour ce caillou.' : 'Apparence confirmée.')
      await refresh()
      return true
    } catch (failure) {
      if (scope.current !== rockId) return false
      const retryable = !(failure instanceof PaintError) || failure.retryable
      const interrupted = retryable ? operation : null
      setRetry(interrupted); retryRef.current = interrupted
      if (!retryable) await refresh()
      setError(failure instanceof Error ? failure.message : 'Confirmation non reçue.')
      return false
    } finally { inFlight.current = false; setPending(null) }
  }, [refresh, rockId, services])

  const current = snapshot?.rockId === rockId ? snapshot : null
  const preview = current ? appearanceState.draft : null
  const canonical = current?.appearance ?? NATURAL_APPEARANCE
  return {
    snapshot: current, appearance: preview ?? canonical, canonical, dirty: !!preview && !sameAppearance(preview, canonical),
    loading, confirmed, online, pending, retry, error, feedback, refresh,
    preview: (value: RockAppearance) => { if (current?.unlocked && !pending && !retry) dispatchAppearance({ type: 'preview', appearance: value }) },
    cancel: () => dispatchAppearance({ type: 'cancel' }),
    purchase: () => submit({ kind: 'purchase', eventKey: crypto.randomUUID() }),
    apply: () => current?.unlocked && confirmed && preview ? submit({ kind: 'save', appearance: preview, eventKey: crypto.randomUUID() }) : Promise.resolve(false),
    retryLast: () => retry ? submit(retry) : Promise.resolve(false),
  }
}
export type PaintController = ReturnType<typeof usePaint>

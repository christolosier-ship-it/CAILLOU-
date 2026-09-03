import type { Dispatch } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { RockSurfacePointerSample } from '../../scene/RockModel'
import type { ActiveRock } from '../adoption/adoptionTypes'
import { CaressMutationError, registerCaress } from '../caress/caressApi'
import { CARESS_CLIENT_COOLDOWN_MS, isValidCaress } from '../caress/caressRules'
import type { CaressMetrics } from '../caress/caressRules'
import type { RegisterCaressInput, RegisterCaressMutation, RockEconomySnapshot } from '../caress/caressTypes'
import { CleaningMutationError, registerCleaning } from '../cleaning/cleaningApi'
import { getDustAmount, hasVisibleDust, isValidCleaning } from '../cleaning/cleaningRules'
import type { CleaningMetrics } from '../cleaning/cleaningRules'
import type { RegisterCleaningInput, RegisterCleaningMutation } from '../cleaning/cleaningTypes'
import type { PedestalAction, PedestalInteractionMode } from './pedestalState'

interface ActiveSurfaceGesture {
  pointerId: number
  startedAt: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  minX: number
  maxX: number
  minY: number
  maxY: number
  pathLengthPx: number
  sampleCount: number
}

interface UsePedestalCareInput {
  activeRock: ActiveRock
  economy: RockEconomySnapshot
  mode: PedestalInteractionMode
  dispatchPedestal: Dispatch<PedestalAction>
  onServerStateChanged: () => Promise<void>
  registerCaressMutation?: RegisterCaressMutation | undefined
  registerCleaningMutation?: RegisterCleaningMutation | undefined
}

function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1)
}

function caressErrorPresentation(error: unknown) {
  if (error instanceof CaressMutationError) {
    return { message: error.message, retryable: error.retryable, refresh: !error.retryable }
  }

  return {
    message: 'La confirmation serveur n’est pas arrivée. La même caresse peut être renvoyée sans double crédit.',
    retryable: true,
    refresh: false,
  }
}

function cleaningErrorPresentation(error: unknown) {
  if (error instanceof CleaningMutationError) {
    return { message: error.message, retryable: error.retryable, refresh: !error.retryable }
  }

  return {
    message: 'La confirmation serveur n’est pas arrivée. Le même nettoyage peut être renvoyé sans doubler la statistique.',
    retryable: true,
    refresh: false,
  }
}

export function usePedestalCare({
  activeRock,
  economy,
  mode,
  dispatchPedestal,
  onServerStateChanged,
  registerCaressMutation,
  registerCleaningMutation,
}: UsePedestalCareInput) {
  const [caressPending, setCaressPending] = useState(false)
  const [caressFeedback, setCaressFeedback] = useState<string | null>(null)
  const [caressError, setCaressError] = useState<string | null>(null)
  const [retryInput, setRetryInput] = useState<RegisterCaressInput | null>(null)
  const [cleaningPending, setCleaningPending] = useState(false)
  const [cleaningFeedback, setCleaningFeedback] = useState<string | null>(null)
  const [cleaningError, setCleaningError] = useState<string | null>(null)
  const [cleaningRetryInput, setCleaningRetryInput] = useState<RegisterCleaningInput | null>(null)
  const [economyState, setEconomyState] = useState(economy)
  const [lastCleanedAtState, setLastCleanedAtState] = useState(activeRock.lastCleanedAt)
  const [dustRevision, setDustRevision] = useState(0)
  const gestureRef = useRef<ActiveSurfaceGesture | null>(null)
  const lastSuccessfulCaressAt = useRef(-Infinity)
  const feedbackTimerRef = useRef<number | null>(null)
  const caressMutation = registerCaressMutation ?? registerCaress
  const cleaningMutation = registerCleaningMutation ?? registerCleaning

  const caressMode = mode === 'caress'
  const cleaningMode = mode === 'cleaning'
  const dustAmount = useMemo(
    () => getDustAmount(lastCleanedAtState, activeRock.adoptedAt),
    [activeRock.adoptedAt, lastCleanedAtState],
  )
  const cleaningAvailable = hasVisibleDust(dustAmount)
  const mutationPending = caressPending
    || cleaningPending
    || retryInput !== null
    || cleaningRetryInput !== null

  useEffect(() => setEconomyState(economy), [economy])
  useEffect(() => setLastCleanedAtState(activeRock.lastCleanedAt), [activeRock.lastCleanedAt])
  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
  }, [])

  const scheduleFeedbackClear = useCallback(() => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = window.setTimeout(() => {
      setCaressFeedback(null)
      setCleaningFeedback(null)
    }, 1500)
  }, [])

  const showCaressSuccess = useCallback(() => {
    setCleaningFeedback(null)
    setCaressFeedback('+1 Lithon')
    scheduleFeedbackClear()
  }, [scheduleFeedbackClear])

  const showCleaningSuccess = useCallback(() => {
    setCaressFeedback(null)
    setCleaningFeedback('Surface remise dans un état réglementaire.')
    scheduleFeedbackClear()
  }, [scheduleFeedbackClear])

  const submitCaress = useCallback(async (input: RegisterCaressInput) => {
    if (caressPending) return
    setCaressPending(true)
    setCaressError(null)
    try {
      const result = await caressMutation(input)
      setEconomyState((current) => ({ ...current, ...result }))
      setRetryInput(null)
      lastSuccessfulCaressAt.current = performance.now()
      showCaressSuccess()
      navigator.vibrate?.(12)
    } catch (error) {
      const presentation = caressErrorPresentation(error)
      setCaressError(presentation.message)
      setRetryInput(presentation.retryable ? input : null)
      if (presentation.refresh) void onServerStateChanged()
    } finally {
      setCaressPending(false)
    }
  }, [caressMutation, caressPending, onServerStateChanged, showCaressSuccess])

  const submitCleaning = useCallback(async (input: RegisterCleaningInput) => {
    if (cleaningPending) return
    setCleaningPending(true)
    setCleaningError(null)
    try {
      const result = await cleaningMutation(input)
      setLastCleanedAtState(result.lastCleanedAt)
      setEconomyState((current) => ({ ...current, cleaningCount: result.cleaningCount }))
      setCleaningRetryInput(null)
      setDustRevision((current) => current + 1)
      dispatchPedestal({ type: 'return-to-orbit' })
      showCleaningSuccess()
      navigator.vibrate?.(16)
    } catch (error) {
      const presentation = cleaningErrorPresentation(error)
      setCleaningError(presentation.message)
      setCleaningRetryInput(presentation.retryable ? input : null)
      setDustRevision((current) => current + 1)
      if (presentation.refresh) void onServerStateChanged()
    } finally {
      setCleaningPending(false)
    }
  }, [cleaningMutation, cleaningPending, dispatchPedestal, onServerStateChanged, showCleaningSuccess])

  const handleSurfaceStart = useCallback((sample: RockSurfacePointerSample) => {
    const caressUnavailable = caressMode && (caressPending || retryInput)
    const cleaningUnavailable = cleaningMode && (cleaningPending || cleaningRetryInput || !cleaningAvailable)
    if ((!caressMode && !cleaningMode) || caressUnavailable || cleaningUnavailable || !sample.isPrimary) return

    gestureRef.current = {
      pointerId: sample.pointerId,
      startedAt: sample.timeStamp,
      startX: sample.clientX,
      startY: sample.clientY,
      lastX: sample.clientX,
      lastY: sample.clientY,
      minX: sample.clientX,
      maxX: sample.clientX,
      minY: sample.clientY,
      maxY: sample.clientY,
      pathLengthPx: 0,
      sampleCount: 1,
    }
    setCaressError(null)
    setCleaningError(null)
  }, [caressMode, caressPending, cleaningAvailable, cleaningMode, cleaningPending, cleaningRetryInput, retryInput])

  const handleSurfaceMove = useCallback((sample: RockSurfacePointerSample) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== sample.pointerId) return
    gesture.pathLengthPx += distance(gesture.lastX, gesture.lastY, sample.clientX, sample.clientY)
    gesture.lastX = sample.clientX
    gesture.lastY = sample.clientY
    gesture.minX = Math.min(gesture.minX, sample.clientX)
    gesture.maxX = Math.max(gesture.maxX, sample.clientX)
    gesture.minY = Math.min(gesture.minY, sample.clientY)
    gesture.maxY = Math.max(gesture.maxY, sample.clientY)
    gesture.sampleCount += 1
  }, [])

  const handleSurfaceEnd = useCallback((sample: RockSurfacePointerSample) => {
    const gesture = gestureRef.current
    gestureRef.current = null
    if (!gesture || gesture.pointerId !== sample.pointerId) return

    const pathLengthPx = gesture.pathLengthPx + distance(gesture.lastX, gesture.lastY, sample.clientX, sample.clientY)
    const sampleCount = gesture.sampleCount + 1
    const durationMs = Math.max(0, sample.timeStamp - gesture.startedAt)

    if (caressMode && !caressPending && !retryInput) {
      const metrics: CaressMetrics = {
        durationMs,
        pathLengthPx,
        directDistancePx: distance(gesture.startX, gesture.startY, sample.clientX, sample.clientY),
        sampleCount,
      }
      if (!isValidCaress(metrics)) return
      if (performance.now() - lastSuccessfulCaressAt.current < CARESS_CLIENT_COOLDOWN_MS) return
      if (import.meta.env.DEV) console.debug('[CAILLOU] caress gesture accepted', metrics)
      void submitCaress({ userRockId: activeRock.id, eventKey: crypto.randomUUID() })
      return
    }

    if (cleaningMode && !cleaningPending && !cleaningRetryInput && cleaningAvailable) {
      const minX = Math.min(gesture.minX, sample.clientX)
      const maxX = Math.max(gesture.maxX, sample.clientX)
      const minY = Math.min(gesture.minY, sample.clientY)
      const maxY = Math.max(gesture.maxY, sample.clientY)
      const metrics: CleaningMetrics = {
        durationMs,
        pathLengthPx,
        spanPx: Math.max(maxX - minX, maxY - minY),
        sampleCount,
      }
      if (!isValidCleaning(metrics)) {
        setDustRevision((current) => current + 1)
        return
      }
      if (import.meta.env.DEV) console.debug('[CAILLOU] cleaning gesture accepted', metrics)
      void submitCleaning({ userRockId: activeRock.id, eventKey: crypto.randomUUID() })
    }
  }, [
    activeRock.id,
    caressMode,
    caressPending,
    cleaningAvailable,
    cleaningMode,
    cleaningPending,
    cleaningRetryInput,
    retryInput,
    submitCaress,
    submitCleaning,
  ])

  const cancelSurfaceGesture = useCallback(() => {
    gestureRef.current = null
    if (cleaningMode) setDustRevision((current) => current + 1)
  }, [cleaningMode])

  const prepareExternalTransition = useCallback(() => {
    gestureRef.current = null
    if (cleaningMode) setDustRevision((current) => current + 1)
  }, [cleaningMode])

  const setBalance = useCallback((balance: number) => {
    setEconomyState((current) => ({ ...current, balance }))
  }, [])

  const status = cleaningPending
    ? 'Enregistrement du nettoyage…'
    : cleaningRetryInput
      ? 'Confirmation du nettoyage à reprendre.'
      : cleaningMode
        ? 'Mode nettoyage actif. Passez le doigt sur la poussière visible.'
        : caressPending
          ? 'Enregistrement de la caresse…'
          : retryInput
            ? 'Confirmation serveur à reprendre.'
            : caressMode
              ? 'Mode caresse actif. Faites glisser le doigt sur la surface du caillou.'
              : null

  return {
    economyState,
    setBalance,
    dustAmount,
    dustRevision,
    cleaningAvailable,
    mutationPending,
    caressMode,
    cleaningMode,
    caressPending,
    cleaningPending,
    caressFeedback,
    cleaningFeedback,
    caressError,
    cleaningError,
    retryInput,
    cleaningRetryInput,
    submitCaress,
    submitCleaning,
    handleSurfaceStart,
    handleSurfaceMove,
    handleSurfaceEnd,
    cancelSurfaceGesture,
    prepareExternalTransition,
    status,
  }
}

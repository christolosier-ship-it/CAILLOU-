import { BrushCleaning, ClipboardList, Gem, HandHeart, Move, Shirt, Trash2 } from 'lucide-react'
import type { Dispatch } from 'react'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import { getRockCatalogEntryById } from '../../content/rockCatalog'
import { PRODUCT_NAME } from '../../domain/foundation'
import { ShowroomScene } from '../../scene/ShowroomScene'
import type { RockLoadState, RockSurfacePointerSample } from '../../scene/RockModel'
import { useReducedMotion } from '../../utils/useReducedMotion'
import { AccessoryShop } from '../accessories/AccessoryShop'
import type { AccessoryCatalogItem, PurchaseAccessoryResult } from '../accessories/accessoryTypes'
import { useAccessoryPlacements } from '../accessories/useAccessoryPlacements'
import type { ActiveRock } from '../adoption/adoptionTypes'
import { CaressMutationError, registerCaress } from '../caress/caressApi'
import { CARESS_CLIENT_COOLDOWN_MS, isValidCaress } from '../caress/caressRules'
import type { CaressMetrics } from '../caress/caressRules'
import type { RegisterCaressInput, RegisterCaressMutation, RockEconomySnapshot } from '../caress/caressTypes'
import { CleaningMutationError, registerCleaning } from '../cleaning/cleaningApi'
import { getDustAmount, hasVisibleDust, isValidCleaning } from '../cleaning/cleaningRules'
import type { CleaningMetrics } from '../cleaning/cleaningRules'
import type { RegisterCleaningInput, RegisterCleaningMutation } from '../cleaning/cleaningTypes'
import { PlacementPanel } from '../placement/PlacementPanel'
import { persistAccessoryWorldTransform, persistRockCompositionWorld } from '../placement/placementPersistence'
import type { SettledWorldComposition } from '../placement/placementPersistence'
import {
  addPlacementSessionAccessory,
  buildPlacementSettlementPlan,
  createPlacementSession,
  removePlacementSessionAccessory,
  updatePlacementSession,
} from '../placement/placementSession'
import type { PlacementSessionState, PlacementSettlementPlan } from '../placement/placementSession'
import type { PlacementTarget, PlacementTool, PlacementTransform } from '../placement/placementTypes'
import type { RockPose } from '../rockMovement/rockMovementTypes'
import { useRockMovementPermit } from '../rockMovement/useRockMovementPermit'
import {
  derivePedestalCapabilities,
  INITIAL_PEDESTAL_STATE,
  pedestalReducer,
} from './pedestalState'
import type { PedestalAction, PedestalShopFocus, PedestalState } from './pedestalState'

export interface PedestalProps {
  activeRock: ActiveRock
  economy: RockEconomySnapshot
  username: string
  onServerStateChanged: () => Promise<void>
  onSignOut: () => Promise<void>
  registerCaressMutation?: RegisterCaressMutation | undefined
  registerCleaningMutation?: RegisterCleaningMutation | undefined
  pedestalState?: PedestalState | undefined
  dispatchPedestal?: Dispatch<PedestalAction> | undefined
}

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

const ACTIONS = [
  { label: 'Caresser', Icon: HandHeart },
  { label: 'Nettoyer', Icon: BrushCleaning },
  { label: 'Boutique', Icon: Shirt },
  { label: 'Jeter', Icon: Trash2 },
] as const

function lithonLabel(value: number) {
  return `${value} ${value === 1 ? 'Lithon' : 'Lithons'}`
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

export function Pedestal({
  activeRock,
  economy,
  username,
  onServerStateChanged,
  onSignOut,
  registerCaressMutation,
  registerCleaningMutation,
  pedestalState: controlledPedestalState,
  dispatchPedestal: controlledDispatchPedestal,
}: PedestalProps) {
  const rock = getRockCatalogEntryById(activeRock.specimenId)
  const [internalPedestalState, internalDispatchPedestal] = useReducer(pedestalReducer, INITIAL_PEDESTAL_STATE)
  const pedestalState = controlledPedestalState ?? internalPedestalState
  const dispatchPedestal = controlledDispatchPedestal ?? internalDispatchPedestal
  const [loadState, setLoadState] = useState<RockLoadState>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<string | null>(null)
  const [placementTarget, setPlacementTarget] = useState<PlacementTarget | null>(null)
  const [placementTool, setPlacementTool] = useState<PlacementTool>('position')
  const [placementSession, setPlacementSession] = useState<PlacementSessionState | null>(null)
  const [settlementPlan, setSettlementPlan] = useState<PlacementSettlementPlan | null>(null)
  const [accessoryRenderError, setAccessoryRenderError] = useState<string | null>(null)
  const [rockMovementError, setRockMovementError] = useState<string | null>(null)
  const [compositionPending, setCompositionPending] = useState(false)
  const [accessoryPersistenceCount, setAccessoryPersistenceCount] = useState(0)
  const accessoryPersistenceRef = useRef(new Set<string>())
  const [rockPose, setRockPose] = useState<RockPose>({
    position: [...activeRock.posePosition],
    rotation: [...activeRock.poseRotation],
  })
  const canonicalRockPoseRef = useRef<RockPose>(rockPose)
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
  const reducedMotion = useReducedMotion()
  const caressMutation = registerCaressMutation ?? registerCaress
  const cleaningMutation = registerCleaningMutation ?? registerCleaning
  const rockPermit = useRockMovementPermit()

  const {
    instances: accessoryInstances,
    loading: accessoryPlacementsLoading,
    pendingId: accessoryPendingId,
    error: accessoryPlacementError,
    maxInstances,
    refresh: refreshAccessoryPlacements,
    place: placeAccessory,
    acceptStabilizedAccessory,
    acceptComposition,
    remove: removeAccessory,
  } = useAccessoryPlacements(activeRock.id)
  const dustAmount = useMemo(
    () => getDustAmount(lastCleanedAtState, activeRock.adoptedAt),
    [activeRock.adoptedAt, lastCleanedAtState],
  )
  const cleaningAvailable = hasVisibleDust(dustAmount)
  const mode = pedestalState.interactionMode
  const accessoryShopOpen = pedestalState.overlay === 'shop'
  const shopFocus = pedestalState.shopFocus
  const caressMode = mode === 'caress'
  const cleaningMode = mode === 'cleaning'
  const placementMode = mode === 'placement'
  const settlingMode = mode === 'settling'
  const accessorySettling = settlingMode && settlementPlan !== null && !settlementPlan.rock
  const globalSettling = settlingMode && settlementPlan?.rock === true
  const mutationBlocked = caressPending
    || cleaningPending
    || retryInput !== null
    || cleaningRetryInput !== null
    || accessoryPendingId !== null
    || compositionPending
    || accessoryPersistenceCount > 0
    || accessorySettling
    || globalSettling
    || rockPermit.pending
  const capabilities = derivePedestalCapabilities(pedestalState, {
    mutationPending: mutationBlocked,
    cleaningAvailable,
  })
  const handleLoadState = useCallback((state: RockLoadState) => setLoadState(state), [])

  useEffect(() => setEconomyState(economy), [economy])
  useEffect(() => setLastCleanedAtState(activeRock.lastCleanedAt), [activeRock.lastCleanedAt])
  useEffect(() => {
    const canonical = {
      position: [...activeRock.posePosition] as RockPose['position'],
      rotation: [...activeRock.poseRotation] as RockPose['rotation'],
    }
    canonicalRockPoseRef.current = canonical
    if (!placementMode && !settlingMode) setRockPose(canonical)
  }, [
    activeRock.id,
    activeRock.posePosition,
    activeRock.poseRotation,
    placementMode,
    settlingMode,
  ])

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

  const toggleMode = useCallback((target: 'caress' | 'cleaning') => {
    const allowed = target === 'caress' ? capabilities.canCaress : capabilities.canClean
    if (!allowed) return
    gestureRef.current = null
    setPlacementTarget(null)
    setSelectedAccessoryId(null)
    setPlacementSession(null)
    setSettlementPlan(null)
    setRockPose(canonicalRockPoseRef.current)
    setRockMovementError(null)
    if (mode === 'cleaning') setDustRevision((revision) => revision + 1)
    dispatchPedestal({ type: 'toggle-interaction', mode: target })
  }, [capabilities.canCaress, capabilities.canClean, dispatchPedestal, mode])

  const openShop = useCallback((focus: PedestalShopFocus = 'default') => {
    if (!capabilities.canOpenShop) return
    gestureRef.current = null
    if (mode === 'cleaning') setDustRevision((revision) => revision + 1)
    setSelectedAccessoryId(null)
    setPlacementTarget(null)
    setPlacementSession(null)
    setSettlementPlan(null)
    setRockPose(canonicalRockPoseRef.current)
    dispatchPedestal({ type: 'open-overlay', overlay: 'shop', shopFocus: focus })
  }, [capabilities.canOpenShop, dispatchPedestal, mode])

  const handleAccessoryPurchased = useCallback((result: PurchaseAccessoryResult) => {
    setEconomyState((current) => ({ ...current, balance: result.balance }))
    void onServerStateChanged()
  }, [onServerStateChanged])

  const handlePlacementAdd = useCallback(async (item: AccessoryCatalogItem) => {
    const created = await placeAccessory(item)
    setAccessoryRenderError(null)
    setPlacementSession((current) => current ? addPlacementSessionAccessory(current, created) : current)
    setSelectedAccessoryId(created.id)
    setPlacementTarget({ kind: 'accessory', instanceId: created.id })
    setPlacementTool('position')
  }, [placeAccessory])

  const handleAccessorySelect = useCallback((instanceId: string) => {
    if (mutationBlocked || mode !== 'placement') return
    setSelectedAccessoryId(instanceId)
    setPlacementTarget({ kind: 'accessory', instanceId })
    setPlacementTool('position')
  }, [mode, mutationBlocked])

  const handleAccessoryRemove = useCallback((instanceId: string) => {
    if (mutationBlocked || mode !== 'placement') return
    void removeAccessory(instanceId).then((removed) => {
      if (!removed) return
      setPlacementSession((current) => current ? removePlacementSessionAccessory(current, instanceId) : current)
      setSelectedAccessoryId(null)
      setPlacementTarget(null)
      setPlacementTool('position')
    })
  }, [mode, mutationBlocked, removeAccessory])

  const openPlacement = useCallback(() => {
    if (mode === 'placement') {
      if (!capabilities.canExitPlacement) return
      gestureRef.current = null
      setSelectedAccessoryId(null)
      setPlacementTarget(null)
      setPlacementTool('position')
      setRockMovementError(null)
      setSettlementPlan(null)
      setPlacementSession(null)
      setRockPose(canonicalRockPoseRef.current)
      dispatchPedestal({ type: 'return-to-orbit' })
      return
    }
    if (!capabilities.canEnterPlacement) return
    gestureRef.current = null
    if (mode === 'cleaning') setDustRevision((revision) => revision + 1)
    setSelectedAccessoryId(null)
    setPlacementTarget(null)
    setPlacementTool('position')
    setRockMovementError(null)
    setSettlementPlan(null)
    setPlacementSession(createPlacementSession(rockPose, accessoryInstances))
    dispatchPedestal({ type: 'enter-placement' })
  }, [accessoryInstances, capabilities.canEnterPlacement, capabilities.canExitPlacement, dispatchPedestal, mode, rockPose])

  const selectRockForPlacement = useCallback(() => {
    if (mutationBlocked) return
    if (!rockPermit.unlocked) {
      openShop('permit')
      return
    }
    setSelectedAccessoryId(null)
    setPlacementTarget({ kind: 'rock' })
    setPlacementTool('position')
    setRockMovementError(null)
  }, [mutationBlocked, openShop, rockPermit.unlocked])

  const handlePlacementTool = useCallback((tool: PlacementTool) => {
    if (!placementTarget || mutationBlocked) return
    if (placementTarget.kind === 'rock' && tool === 'size') return
    setPlacementTool(tool)
  }, [mutationBlocked, placementTarget])

  const handleRockPlacementDraft = useCallback((pose: RockPose) => {
    setRockPose(pose)
    setPlacementSession((current) => current ? updatePlacementSession(current, { kind: 'rock' }, {
      position: [...pose.position],
      rotation: [...pose.rotation],
      scale: 1,
    }) : current)
  }, [])

  const handleAccessoryPlacementDraft = useCallback((instanceId: string, transform: PlacementTransform) => {
    setPlacementSession((current) => current
      ? updatePlacementSession(current, { kind: 'accessory', instanceId }, transform)
      : current)
  }, [])

  const handlePlacementDone = useCallback(() => {
    if (mutationBlocked || mode !== 'placement') return
    const plan = buildPlacementSettlementPlan(placementSession)
    if (!plan) {
      setPlacementSession(null)
      setPlacementTarget(null)
      setSelectedAccessoryId(null)
      dispatchPedestal({ type: 'return-to-orbit' })
      return
    }
    setSettlementPlan(plan)
    dispatchPedestal({ type: 'begin-settling' })
  }, [dispatchPedestal, mode, mutationBlocked, placementSession])

  const handleAccessorySettled = useCallback((instanceId: string, transform: PlacementTransform) => {
    if (settlingMode || accessoryPersistenceRef.current.has(instanceId)) return
    if (!accessoryInstances.some((instance) => instance.id === instanceId)) return
    accessoryPersistenceRef.current.add(instanceId)
    setAccessoryPersistenceCount(accessoryPersistenceRef.current.size)
    setAccessoryRenderError(null)

    void persistAccessoryWorldTransform({
      instanceId,
      transform,
      rockPose,
      eventKey: crypto.randomUUID(),
    }).then((result) => {
      acceptStabilizedAccessory(result)
    }).catch(async (error) => {
      setAccessoryRenderError(error instanceof Error
        ? `${error.message} Le dernier état serveur connu a été restauré.`
        : 'La pose finale n’a pas pu être confirmée ; le dernier état serveur connu a été restauré.')
      try {
        await refreshAccessoryPlacements()
      } catch {
        // Keep the last visible canonical state if the reread is offline.
      }
    }).finally(() => {
      accessoryPersistenceRef.current.delete(instanceId)
      setAccessoryPersistenceCount(accessoryPersistenceRef.current.size)
    })
  }, [
    acceptStabilizedAccessory,
    accessoryInstances,
    refreshAccessoryPlacements,
    rockPose,
    settlingMode,
  ])

  const handlePermitPurchase = useCallback(async () => {
    const result = await rockPermit.purchase()
    if (!result) return false
    setEconomyState((current) => ({ ...current, balance: result.balance }))
    navigator.vibrate?.(18)
    void onServerStateChanged()
    return true
  }, [onServerStateChanged, rockPermit])

  const handleCompositionSettled = useCallback((composition: SettledWorldComposition) => {
    if (compositionPending || !settlingMode || !settlementPlan) return
    setCompositionPending(true)
    setRockMovementError(null)

    const closeSuccessfulSession = async (rockPoseResult: RockPose) => {
      setRockPose(rockPoseResult)
      canonicalRockPoseRef.current = rockPoseResult
      setPlacementSession(null)
      setSettlementPlan(null)
      setPlacementTarget(null)
      setSelectedAccessoryId(null)
      setPlacementTool('position')
      dispatchPedestal({ type: 'return-to-orbit' })
      navigator.vibrate?.(20)
      await onServerStateChanged()
    }

    const restoreCanonicalSession = async (error: unknown) => {
      setRockMovementError(error instanceof Error
        ? `${error.message} Le dernier état serveur connu a été restauré.`
        : 'La manutention n’a pas pu être confirmée ; le dernier état serveur connu a été restauré.')
      setRockPose(canonicalRockPoseRef.current)
      setPlacementSession(null)
      setSettlementPlan(null)
      setPlacementTarget(null)
      setSelectedAccessoryId(null)
      setPlacementTool('position')
      try {
        await refreshAccessoryPlacements()
      } catch {
        // The visible canonical pose is still restored even if the accessory reread is offline.
      }
      dispatchPedestal({ type: 'return-to-orbit' })
      await onServerStateChanged()
    }

    const settledRockPose: RockPose = {
      position: [...composition.rockTransform.position],
      rotation: [...composition.rockTransform.rotation],
    }

    if (!settlementPlan.rock) {
      const dirtyIds = new Set(settlementPlan.accessoryIds)
      const dirtyAccessories = composition.accessories.filter(({ instanceId }) => dirtyIds.has(instanceId))
      void Promise.all(dirtyAccessories.map(({ instanceId, transform }) => persistAccessoryWorldTransform({
        instanceId,
        transform,
        rockPose: settledRockPose,
        eventKey: crypto.randomUUID(),
      }))).then(async (results) => {
        results.forEach(acceptStabilizedAccessory)
        await closeSuccessfulSession(settledRockPose)
      }).catch(restoreCanonicalSession).finally(() => {
        setCompositionPending(false)
      })
      return
    }

    void persistRockCompositionWorld({
      userRockId: activeRock.id,
      eventKey: crypto.randomUUID(),
      composition,
    }).then(async (result) => {
      acceptComposition(result)
      await closeSuccessfulSession(result.rockPose)
    }).catch(restoreCanonicalSession).finally(() => {
      setCompositionPending(false)
    })
  }, [
    acceptComposition,
    acceptStabilizedAccessory,
    activeRock.id,
    compositionPending,
    dispatchPedestal,
    onServerStateChanged,
    refreshAccessoryPlacements,
    settlementPlan,
    settlingMode,
  ])

  const handleAccessoryLoadState = useCallback((instanceId: string, state: 'loading' | 'ready' | 'error', message?: string) => {
    if (state === 'error') {
      setAccessoryRenderError(`L’instance ${instanceId.slice(0, 8)} n’a pas pu être chargée${message ? ` : ${message}` : '.'}`)
    } else if (state === 'ready') {
      setAccessoryRenderError(null)
    }
  }, [])

  const status = compositionPending
    ? 'Enregistrement atomique de la nouvelle composition…'
    : accessoryPersistenceCount > 0
      ? 'Enregistrement de la pose finale stabilisée…'
      : accessorySettling
        ? 'Rapier stabilise l’accessoire avant enregistrement…'
        : globalSettling
          ? 'Rapier arbitre la composition : gravité et collisions sont de nouveau actives…'
          : placementMode
            ? placementTarget?.kind === 'rock'
              ? placementTool === 'position'
                ? 'Placement du caillou : le canvas entier contrôle sa position. Le sol gris reste infranchissable.'
                : 'Placement du caillou : le canvas entier contrôle son orientation.'
              : placementTarget?.kind === 'accessory'
                ? placementTool === 'position'
                  ? 'Placement accessoire : position libre, intersections autorisées, sol gris infranchissable.'
                  : placementTool === 'orientation'
                    ? 'Placement accessoire : orientation libre depuis tout le canvas.'
                    : 'Placement accessoire : pincez pour ajuster la taille.'
                : 'Placement : choisissez d’abord une cible.'
            : accessoryPendingId
              ? 'Enregistrement du placement…'
              : accessoryPlacementsLoading
                ? 'Vérification des accessoires placés…'
                : cleaningPending
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
                            : rockMovementError ?? 'Votre caillou est prêt à ne rien faire à vos côtés.'

  const shellModeClass = caressMode
    ? ' is-caress-mode'
    : cleaningMode
      ? ' is-cleaning-mode'
      : placementMode
        ? ' is-placement-mode'
        : accessorySettling || globalSettling ? ' is-composition-settling' : ''

  return (
    <div className={`pedestal-shell${shellModeClass}`}>
      <header className="pedestal-topbar">
        <div className="pedestal-utilities">
          <button
            type="button"
            className="pedestal-utility"
            onClick={() => {
              if (capabilities.canOpenBio) dispatchPedestal({ type: 'open-overlay', overlay: 'bio' })
            }}
            disabled={!capabilities.canOpenBio}
            aria-label="Bio et statistiques"
            title="Bio et statistiques"
          >
            <ClipboardList size={24} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`pedestal-utility pedestal-utility-icon${placementMode ? ' is-active' : ''}`}
            onClick={openPlacement}
            disabled={placementMode ? !capabilities.canExitPlacement : !capabilities.canEnterPlacement}
            aria-label={placementMode ? 'Quitter Placement' : 'Ouvrir Placement'}
            aria-pressed={placementMode}
            title="Placement"
          >
            <Move size={22} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="pedestal-brand" aria-label={PRODUCT_NAME}>
          <span>{PRODUCT_NAME}</span>
          <small>{username}</small>
        </div>
        <output
          className="pedestal-balance"
          aria-label={`Solde : ${lithonLabel(economyState.balance)}`}
          title={lithonLabel(economyState.balance)}
        >
          <Gem size={22} strokeWidth={1.75} aria-hidden="true" />
          <span>{economyState.balance}</span>
        </output>
      </header>

      <main className="pedestal-main">
        <section
          className="pedestal-stage"
          aria-label={`Socle de ${activeRock.name}`}
          data-dust-amount={dustAmount.toFixed(3)}
          data-accessory-count={accessoryInstances.length}
          data-rock-mode={mode}
          data-placement-target={placementTarget?.kind === 'accessory' ? placementTarget.instanceId : placementTarget?.kind ?? ''}
          data-placement-tool={placementTool}
          data-rock-position={rockPose.position.join(',')}
          data-rock-rotation={rockPose.rotation.join(',')}
        >
          <div className="pedestal-identity">
            <p className="eyebrow">{rock.label}</p>
            <h1>{activeRock.name}</h1>
          </div>

          <ShowroomScene
            rock={rock}
            retryKey={retryKey}
            reducedMotion={reducedMotion}
            onLoadStateChange={handleLoadState}
            onInteractionChange={() => undefined}
            interactionMode={mode}
            rockPose={rockPose}
            onRockPoseDraft={handleRockPlacementDraft}
            onCompositionSettled={handleCompositionSettled}
            placementTarget={placementTarget}
            placementTool={placementTool}
            placementSession={placementSession}
            settlementPlan={settlementPlan}
            dustAmount={dustAmount}
            dustRevision={dustRevision}
            onSurfacePointerDown={handleSurfaceStart}
            onSurfacePointerMove={handleSurfaceMove}
            onSurfacePointerUp={handleSurfaceEnd}
            onSurfacePointerCancel={cancelSurfaceGesture}
            accessories={accessoryInstances}
            selectedAccessoryId={selectedAccessoryId}
            onAccessoryPlacementDraft={handleAccessoryPlacementDraft}
            onAccessorySettled={handleAccessorySettled}
            onAccessoryLoadStateChange={handleAccessoryLoadState}
          />

          {loadState !== 'ready' ? (
            <div className={`pedestal-fallback is-${loadState}`} aria-live="polite">
              <img src={rock.previewPath} alt="" aria-hidden="true" />
              <div>
                {loadState === 'loading' ? <p>Installation sur le Socle…</p> : (
                  <>
                    <p>Le modèle 3D n’a pas pu être installé.</p>
                    <button type="button" onClick={() => setRetryKey((current) => current + 1)}>Réessayer</button>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {caressFeedback ? (
            <output className="pedestal-caress-feedback" aria-live="polite">{caressFeedback}</output>
          ) : null}

          {cleaningFeedback ? (
            <output className="pedestal-cleaning-feedback" aria-live="polite">{cleaningFeedback}</output>
          ) : null}

          {caressError ? (
            <div className="pedestal-caress-error" role="alert">
              <span>{caressError}</span>
              {retryInput ? (
                <button type="button" disabled={caressPending} onClick={() => void submitCaress(retryInput)}>Réessayer</button>
              ) : null}
            </div>
          ) : null}

          {cleaningError ? (
            <div className="pedestal-cleaning-error" role="alert">
              <span>{cleaningError}</span>
              {cleaningRetryInput ? (
                <button type="button" disabled={cleaningPending} onClick={() => void submitCleaning(cleaningRetryInput)}>Réessayer</button>
              ) : null}
            </div>
          ) : null}

          {placementMode ? (
            <PlacementPanel
              rockName={activeRock.name}
              permitUnlocked={rockPermit.unlocked}
              permitLoading={rockPermit.loading}
              instances={accessoryInstances}
              selectedTarget={placementTarget}
              tool={placementTool}
              busy={mutationBlocked}
              message={accessoryPlacementError ?? accessoryRenderError ?? rockMovementError}
              maxInstances={maxInstances}
              onSelectRock={selectRockForPlacement}
              onOpenPermitShop={() => openShop('permit')}
              onSelectAccessory={handleAccessorySelect}
              onToolChange={handlePlacementTool}
              onAddOwned={handlePlacementAdd}
              onRemove={handleAccessoryRemove}
              onDone={handlePlacementDone}
            />
          ) : null}

          <p className="pedestal-status">{status}</p>
        </section>

        <nav className="pedestal-actions" aria-label="Actions du caillou">
          {ACTIONS.map(({ label, Icon }) => {
            const isCaress = label === 'Caresser'
            const isCleaning = label === 'Nettoyer'
            const isShop = label === 'Boutique'
            const isDiscard = label === 'Jeter'
            const isActive = (isCaress && caressMode)
              || (isCleaning && cleaningMode)
              || (isShop && accessoryShopOpen)
            const disabled = isCaress
              ? !capabilities.canCaress
              : isCleaning
                ? !capabilities.canClean
                : isShop
                  ? !capabilities.canOpenShop
                  : isDiscard ? !capabilities.canDiscard : true
            const ariaLabel = isCaress
              ? (caressMode ? 'Quitter le mode Caresser' : 'Activer le mode Caresser')
              : isCleaning
                ? (!cleaningAvailable
                    ? 'Nettoyer — surface déjà conforme'
                    : cleaningMode ? 'Quitter le mode Nettoyer' : 'Activer le mode Nettoyer')
                : isShop
                  ? (accessoryShopOpen ? 'Boutique ouverte' : 'Ouvrir la Boutique')
                  : isDiscard ? 'Jeter le caillou' : `${label} — fonctionnalité indisponible`

            return (
              <button
                key={label}
                type="button"
                className={isActive ? 'is-active' : undefined}
                disabled={disabled}
                aria-label={ariaLabel}
                aria-pressed={isCaress || isCleaning || isShop ? isActive : undefined}
                title={label}
                onClick={isCaress
                  ? () => toggleMode('caress')
                  : isCleaning
                    ? () => toggleMode('cleaning')
                    : isShop
                      ? () => openShop('default')
                      : isDiscard
                        ? () => dispatchPedestal({ type: 'open-overlay', overlay: 'discard' })
                        : undefined}
              >
                <Icon size={28} strokeWidth={1.75} aria-hidden="true" />
              </button>
            )
          })}
        </nav>
      </main>

      <footer className="pedestal-footer">
        <span>Présence stable.</span>
        <button type="button" onClick={() => void onSignOut()}>Déconnexion</button>
      </footer>

      {accessoryShopOpen ? (
        <AccessoryShop
          balance={economyState.balance}
          permit={rockPermit.snapshot}
          permitLoading={rockPermit.loading}
          permitPending={rockPermit.pending}
          permitError={rockPermit.error}
          permitRetrying={rockPermit.retrying}
          highlightPermit={shopFocus === 'permit'}
          interactionDisabled={!capabilities.canPurchase}
          onPermitPurchase={handlePermitPurchase}
          onBalanceChanged={(balance) => setEconomyState((current) => ({ ...current, balance }))}
          onPurchased={handleAccessoryPurchased}
          onClose={() => {
            if (!rockPermit.pending) {
              rockPermit.clearError()
              dispatchPedestal({ type: 'close-overlay' })
            }
          }}
        />
      ) : null}
    </div>
  )
}

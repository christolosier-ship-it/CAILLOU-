import { BrushCleaning, ClipboardList, Gem, HandHeart, Move, Shirt, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getRockCatalogEntryById } from '../../content/rockCatalog'
import { PRODUCT_NAME } from '../../domain/foundation'
import { ShowroomScene } from '../../scene/ShowroomScene'
import type { RockLoadState, RockSurfacePointerSample } from '../../scene/RockModel'
import { useReducedMotion } from '../../utils/useReducedMotion'
import { AccessoryShop } from '../accessories/AccessoryShop'
import type { AccessoryCatalogItem, AccessoryTransform, PurchaseAccessoryResult } from '../accessories/accessoryTypes'
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
import type { PlacementTarget, PlacementTool } from '../placement/placementTypes'
import { stabilizeRockComposition } from '../rockMovement/rockMovementApi'
import type { RockCompositionDraft, RockPose } from '../rockMovement/rockMovementTypes'
import { useRockMovementPermit } from '../rockMovement/useRockMovementPermit'

interface PedestalProps {
  activeRock: ActiveRock
  economy: RockEconomySnapshot
  username: string
  onServerStateChanged: () => Promise<void>
  onSignOut: () => Promise<void>
  registerCaressMutation?: RegisterCaressMutation | undefined
  registerCleaningMutation?: RegisterCleaningMutation | undefined
}

type PedestalMode = 'orbit' | 'caress' | 'cleaning' | 'placement' | 'composition-settle'
type ShopFocus = 'default' | 'permit'

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value))
}

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
}: PedestalProps) {
  const rock = getRockCatalogEntryById(activeRock.specimenId)
  const [loadState, setLoadState] = useState<RockLoadState>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const [bioOpen, setBioOpen] = useState(false)
  const [accessoryShopOpen, setAccessoryShopOpen] = useState(false)
  const [shopFocus, setShopFocus] = useState<ShopFocus>('default')
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<string | null>(null)
  const [placementTarget, setPlacementTarget] = useState<PlacementTarget | null>(null)
  const [placementTool, setPlacementTool] = useState<PlacementTool>('position')
  const [accessoryRenderError, setAccessoryRenderError] = useState<string | null>(null)
  const [rockMovementError, setRockMovementError] = useState<string | null>(null)
  const [compositionPending, setCompositionPending] = useState(false)
  const [mode, setMode] = useState<PedestalMode>('orbit')
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
    dirtyCount: accessoryDirtyCount,
    error: accessoryPlacementError,
    maxInstances,
    refresh: refreshAccessoryPlacements,
    place: placeAccessory,
    draft: draftAccessory,
    commitDrafts: commitAccessoryDrafts,
    update: updateAccessory,
    acceptComposition,
    remove: removeAccessory,
  } = useAccessoryPlacements(activeRock.id)
  const adoptionDate = useMemo(() => formatDate(activeRock.adoptedAt), [activeRock.adoptedAt])
  const lastCleaningDate = useMemo(
    () => lastCleanedAtState ? formatDate(lastCleanedAtState) : 'Non requis à ce jour',
    [lastCleanedAtState],
  )
  const dustAmount = useMemo(
    () => getDustAmount(lastCleanedAtState, activeRock.adoptedAt),
    [activeRock.adoptedAt, lastCleanedAtState],
  )
  const cleaningAvailable = hasVisibleDust(dustAmount)
  const caressMode = mode === 'caress'
  const cleaningMode = mode === 'cleaning'
  const placementMode = mode === 'placement'
  const globalSettling = mode === 'composition-settle'
  const mutationBlocked = caressPending
    || cleaningPending
    || retryInput !== null
    || cleaningRetryInput !== null
    || accessoryPendingId !== null
    || compositionPending
    || globalSettling
    || rockPermit.pending
  const handleLoadState = useCallback((state: RockLoadState) => setLoadState(state), [])

  useEffect(() => setEconomyState(economy), [economy])
  useEffect(() => setLastCleanedAtState(activeRock.lastCleanedAt), [activeRock.lastCleanedAt])
  useEffect(() => {
    const canonical = {
      position: [...activeRock.posePosition] as RockPose['position'],
      rotation: [...activeRock.poseRotation] as RockPose['rotation'],
    }
    canonicalRockPoseRef.current = canonical
    if (!(placementMode && placementTarget?.kind === 'rock') && !globalSettling) setRockPose(canonical)
  }, [
    activeRock.id,
    activeRock.posePosition,
    activeRock.poseRotation,
    globalSettling,
    placementMode,
    placementTarget,
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
      setMode('orbit')
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
  }, [cleaningMutation, cleaningPending, onServerStateChanged, showCleaningSuccess])

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
    if (mutationBlocked) return
    gestureRef.current = null
    setPlacementTarget(null)
    setSelectedAccessoryId(null)
    setRockMovementError(null)
    setAccessoryShopOpen(false)
    setMode((current) => {
      if (current === 'cleaning') setDustRevision((revision) => revision + 1)
      return current === target ? 'orbit' : target
    })
  }, [mutationBlocked])

  const openShop = useCallback((focus: ShopFocus = 'default') => {
    if (mutationBlocked) return
    void (async () => {
      if (mode === 'placement' && accessoryDirtyCount > 0 && !(await commitAccessoryDrafts())) return
      gestureRef.current = null
      if (mode === 'cleaning') setDustRevision((revision) => revision + 1)
      setSelectedAccessoryId(null)
      setPlacementTarget(null)
      setMode('orbit')
      setShopFocus(focus)
      setAccessoryShopOpen(true)
    })()
  }, [accessoryDirtyCount, commitAccessoryDrafts, mode, mutationBlocked])

  const handleAccessoryPurchased = useCallback((result: PurchaseAccessoryResult) => {
    setEconomyState((current) => ({ ...current, balance: result.balance }))
    void onServerStateChanged()
  }, [onServerStateChanged])

  const handlePlacementAdd = useCallback(async (item: AccessoryCatalogItem) => {
    const created = await placeAccessory(item)
    setAccessoryRenderError(null)
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

  const handleAccessoryDraft = useCallback((instanceId: string, transform: AccessoryTransform) => {
    if (mutationBlocked || mode !== 'placement') return
    draftAccessory(instanceId, transform)
  }, [draftAccessory, mode, mutationBlocked])

  const handleAccessoryPhysicsTransform = useCallback((instanceId: string, transform: AccessoryTransform) => {
    if (compositionPending || globalSettling) return
    void updateAccessory(instanceId, transform)
  }, [compositionPending, globalSettling, updateAccessory])

  const handleAccessoryRemove = useCallback((instanceId: string) => {
    if (mutationBlocked || mode !== 'placement') return
    void removeAccessory(instanceId).then((removed) => {
      if (!removed) return
      setSelectedAccessoryId(null)
      setPlacementTarget(null)
      setPlacementTool('position')
    })
  }, [mode, mutationBlocked, removeAccessory])

  const openPlacement = useCallback(() => {
    if (mutationBlocked) return
    gestureRef.current = null
    if (mode === 'cleaning') setDustRevision((revision) => revision + 1)
    setAccessoryShopOpen(false)
    setShopFocus('default')
    setSelectedAccessoryId(null)
    setPlacementTarget(null)
    setPlacementTool('position')
    setRockMovementError(null)
    setMode((current) => current === 'placement' ? 'orbit' : 'placement')
  }, [mode, mutationBlocked])

  const selectRockForPlacement = useCallback(() => {
    if (mutationBlocked) return
    if (!rockPermit.unlocked) {
      openShop('permit')
      return
    }
    canonicalRockPoseRef.current = rockPose
    setSelectedAccessoryId(null)
    setPlacementTarget({ kind: 'rock' })
    setPlacementTool('position')
    setRockMovementError(null)
  }, [mutationBlocked, openShop, rockPermit.unlocked, rockPose])

  const handlePlacementTool = useCallback((tool: PlacementTool) => {
    if (!placementTarget || mutationBlocked) return
    if (placementTarget.kind === 'rock' && tool === 'size') return
    setPlacementTool(tool)
  }, [mutationBlocked, placementTarget])

  const handlePlacementDone = useCallback(() => {
    if (mutationBlocked || mode !== 'placement') return
    if (placementTarget?.kind === 'rock') {
      setMode('composition-settle')
      return
    }
    void (async () => {
      const confirmed = await commitAccessoryDrafts()
      if (!confirmed) return
      setPlacementTarget(null)
      setSelectedAccessoryId(null)
      setPlacementTool('position')
      setMode('orbit')
    })()
  }, [commitAccessoryDrafts, mode, mutationBlocked, placementTarget])

  const handlePermitPurchase = useCallback(async () => {
    const result = await rockPermit.purchase()
    if (!result) return false
    setEconomyState((current) => ({ ...current, balance: result.balance }))
    navigator.vibrate?.(18)
    void onServerStateChanged()
    return true
  }, [onServerStateChanged, rockPermit])

  const handleCompositionSettled = useCallback((draft: RockCompositionDraft) => {
    if (compositionPending || mode !== 'composition-settle') return
    setCompositionPending(true)
    setRockMovementError(null)
    const eventKey = crypto.randomUUID()
    void stabilizeRockComposition(activeRock.id, eventKey, draft).then(async (result) => {
      acceptComposition(result)
      setRockPose(result.rockPose)
      canonicalRockPoseRef.current = result.rockPose
      setPlacementTarget(null)
      setSelectedAccessoryId(null)
      setPlacementTool('position')
      setMode('orbit')
      navigator.vibrate?.(20)
      await onServerStateChanged()
    }).catch(async (error) => {
      setRockMovementError(error instanceof Error
        ? `${error.message} Le dernier état serveur connu a été restauré.`
        : 'La manutention n’a pas pu être confirmée ; le dernier état serveur connu a été restauré.')
      setRockPose(canonicalRockPoseRef.current)
      setPlacementTarget(null)
      setSelectedAccessoryId(null)
      setPlacementTool('position')
      try {
        await refreshAccessoryPlacements()
      } catch {
        // The visible canonical pose is still restored even if the accessory reread is offline.
      }
      setMode('orbit')
      await onServerStateChanged()
    }).finally(() => {
      setCompositionPending(false)
    })
  }, [
    acceptComposition,
    activeRock.id,
    compositionPending,
    mode,
    onServerStateChanged,
    refreshAccessoryPlacements,
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
        : globalSettling ? ' is-composition-settling' : ''

  return (
    <div className={`pedestal-shell${shellModeClass}`}>
      <header className="pedestal-topbar">
        <div className="pedestal-utilities">
          <button
            type="button"
            className="pedestal-utility"
            onClick={() => setBioOpen(true)}
            aria-label="Bio et statistiques"
            title="Bio et statistiques"
          >
            <ClipboardList size={24} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`pedestal-utility pedestal-utility-icon${placementMode ? ' is-active' : ''}`}
            onClick={openPlacement}
            disabled={mutationBlocked && !placementMode}
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
            onRockPoseDraft={setRockPose}
            onCompositionSettled={handleCompositionSettled}
            placementTarget={placementTarget}
            placementTool={placementTool}
            dustAmount={dustAmount}
            dustRevision={dustRevision}
            onSurfacePointerDown={handleSurfaceStart}
            onSurfacePointerMove={handleSurfaceMove}
            onSurfacePointerUp={handleSurfaceEnd}
            onSurfacePointerCancel={cancelSurfaceGesture}
            accessories={accessoryInstances}
            selectedAccessoryId={selectedAccessoryId}
            onAccessoryTransformDraft={handleAccessoryDraft}
            onAccessoryTransformCommit={handleAccessoryPhysicsTransform}
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
            const isActive = (isCaress && caressMode)
              || (isCleaning && cleaningMode)
              || (isShop && accessoryShopOpen)
            const disabled = isCaress
              ? mutationBlocked
              : isCleaning
                ? mutationBlocked || !cleaningAvailable
                : isShop ? mutationBlocked : true
            const ariaLabel = isCaress
              ? (caressMode ? 'Quitter le mode Caresser' : 'Activer le mode Caresser')
              : isCleaning
                ? (!cleaningAvailable
                    ? 'Nettoyer — surface déjà conforme'
                    : cleaningMode ? 'Quitter le mode Nettoyer' : 'Activer le mode Nettoyer')
                : isShop
                  ? (accessoryShopOpen ? 'Boutique ouverte' : 'Ouvrir la Boutique')
                  : `${label} — fonctionnalité en préparation`

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
                    : isShop ? () => openShop('default') : undefined}
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

      {bioOpen ? (
        <div className="pedestal-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setBioOpen(false)
        }}>
          <section className="pedestal-dialog" role="dialog" aria-modal="true" aria-labelledby="pedestal-bio-title">
            <div className="pedestal-dialog-heading">
              <div>
                <p className="eyebrow">Dossier institutionnel</p>
                <h2 id="pedestal-bio-title">{activeRock.name}</h2>
              </div>
              <button type="button" onClick={() => setBioOpen(false)} aria-label="Fermer Bio / Stats">Fermer</button>
            </div>
            <dl>
              <div><dt>Spécimen</dt><dd>{String(rock.catalogIndex).padStart(2, '0')}</dd></div>
              <div><dt>Adopté le</dt><dd>{adoptionDate}</dd></div>
              <div><dt>Statut</dt><dd>Actif</dd></div>
              <div><dt>Caresses</dt><dd>{economyState.caressCount}</dd></div>
              <div><dt>Nettoyages</dt><dd>{economyState.cleaningCount}</dd></div>
              <div><dt>Dernier nettoyage</dt><dd>{lastCleaningDate}</dd></div>
              <div><dt>Lithons générés</dt><dd>{economyState.lithonsGenerated}</dd></div>
              <div><dt>Solde actuel</dt><dd>{lithonLabel(economyState.balance)}</dd></div>
              <div><dt>Accessoires placés</dt><dd>{accessoryInstances.length}</dd></div>
              <div><dt>Permis manutention</dt><dd>{rockPermit.unlocked ? 'Acquis' : 'Non acquis'}</dd></div>
              <div><dt>Déplacement spontané</dt><dd>0 m observé</dd></div>
            </dl>
          </section>
        </div>
      ) : null}

      {accessoryShopOpen ? (
        <AccessoryShop
          balance={economyState.balance}
          permit={rockPermit.snapshot}
          permitLoading={rockPermit.loading}
          permitPending={rockPermit.pending}
          permitError={rockPermit.error}
          permitRetrying={rockPermit.retrying}
          highlightPermit={shopFocus === 'permit'}
          onPermitPurchase={handlePermitPurchase}
          onBalanceChanged={(balance) => setEconomyState((current) => ({ ...current, balance }))}
          onPurchased={handleAccessoryPurchased}
          onClose={() => {
            if (!rockPermit.pending) {
              rockPermit.clearError()
              setAccessoryShopOpen(false)
              setShopFocus('default')
            }
          }}
        />
      ) : null}
    </div>
  )
}

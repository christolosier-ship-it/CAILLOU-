import { BrushCleaning, ClipboardList, Gem, HandHeart, Shirt, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getRockCatalogEntryById } from '../../content/rockCatalog'
import { PRODUCT_NAME } from '../../domain/foundation'
import { ShowroomScene } from '../../scene/ShowroomScene'
import type { RockLoadState, RockSurfacePointerSample } from '../../scene/RockModel'
import { useReducedMotion } from '../../utils/useReducedMotion'
import { AccessoryEditor } from '../accessories/AccessoryEditor'
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

interface PedestalProps {
  activeRock: ActiveRock
  economy: RockEconomySnapshot
  username: string
  onServerStateChanged: () => Promise<void>
  onSignOut: () => Promise<void>
  registerCaressMutation?: RegisterCaressMutation | undefined
  registerCleaningMutation?: RegisterCleaningMutation | undefined
}

type PedestalMode = 'orbit' | 'caress' | 'cleaning' | 'accessory'

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
  { label: 'Accessoire', Icon: Shirt },
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
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<string | null>(null)
  const [accessoryRenderError, setAccessoryRenderError] = useState<string | null>(null)
  const [mode, setMode] = useState<PedestalMode>('orbit')
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
  const {
    instances: accessoryInstances,
    loading: accessoryPlacementsLoading,
    pendingId: accessoryPendingId,
    error: accessoryPlacementError,
    maxInstances,
    place: placeAccessory,
    update: updateAccessory,
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
  const equippedCounts = useMemo(() => accessoryInstances.reduce<Record<string, number>>((counts, instance) => {
    counts[instance.accessoryId] = (counts[instance.accessoryId] ?? 0) + 1
    return counts
  }, {}), [accessoryInstances])
  const cleaningAvailable = hasVisibleDust(dustAmount)
  const caressMode = mode === 'caress'
  const cleaningMode = mode === 'cleaning'
  const accessoryMode = mode === 'accessory'
  const mutationBlocked = caressPending
    || cleaningPending
    || retryInput !== null
    || cleaningRetryInput !== null
    || accessoryPendingId !== null
  const handleLoadState = useCallback((state: RockLoadState) => setLoadState(state), [])

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
    setSelectedAccessoryId(null)
    setMode((current) => {
      if (current === 'cleaning') setDustRevision((revision) => revision + 1)
      return current === target ? 'orbit' : target
    })
  }, [mutationBlocked])

  const openAccessoryShop = useCallback(() => {
    if (mutationBlocked) return
    gestureRef.current = null
    if (mode === 'cleaning') setDustRevision((revision) => revision + 1)
    setMode('orbit')
    setAccessoryShopOpen(true)
  }, [mode, mutationBlocked])

  const handleAccessoryPurchased = useCallback((result: PurchaseAccessoryResult) => {
    setEconomyState((current) => ({ ...current, balance: result.balance }))
    void onServerStateChanged()
  }, [onServerStateChanged])

  const handleAccessoryPlace = useCallback(async (item: AccessoryCatalogItem) => {
    const created = await placeAccessory(item)
    setAccessoryRenderError(null)
    setSelectedAccessoryId(created.id)
    setAccessoryShopOpen(false)
    setMode('accessory')
  }, [placeAccessory])

  const handleAccessorySelect = useCallback((instanceId: string) => {
    if (mutationBlocked) return
    setAccessoryShopOpen(false)
    setSelectedAccessoryId(instanceId)
    setMode('accessory')
  }, [mutationBlocked])

  const handleAccessoryTransform = useCallback((instanceId: string, transform: AccessoryTransform) => {
    if (mutationBlocked) return
    void updateAccessory(instanceId, transform)
  }, [mutationBlocked, updateAccessory])

  const handleAccessoryRemove = useCallback((instanceId: string) => {
    if (mutationBlocked) return
    void removeAccessory(instanceId).then((removed) => {
      if (!removed) return
      const remaining = accessoryInstances.filter((instance) => instance.id !== instanceId)
      const nextSelected = remaining[0]?.id ?? null
      setSelectedAccessoryId(nextSelected)
      if (!nextSelected) setMode('orbit')
    })
  }, [accessoryInstances, mutationBlocked, removeAccessory])

  const handleAccessoryDone = useCallback(() => {
    if (mutationBlocked) return
    setSelectedAccessoryId(null)
    setMode('orbit')
  }, [mutationBlocked])

  const handleAccessoryLoadState = useCallback((instanceId: string, state: 'loading' | 'ready' | 'error', message?: string) => {
    if (state === 'error') {
      setAccessoryRenderError(`L’instance ${instanceId.slice(0, 8)} n’a pas pu être chargée${message ? ` : ${message}` : '.'}`)
    } else if (state === 'ready') {
      setAccessoryRenderError(null)
    }
  }, [])

  const status = accessoryPendingId
    ? 'Enregistrement du placement…'
    : accessoryPlacementsLoading
      ? 'Vérification des accessoires placés…'
      : accessoryMode
        ? 'Mode accessoire actif. Glissez l’objet ou utilisez les réglages X/Y/Z.'
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
                    : 'Votre caillou est prêt à ne rien faire à vos côtés.'

  const shellModeClass = caressMode
    ? ' is-caress-mode'
    : cleaningMode
      ? ' is-cleaning-mode'
      : accessoryMode ? ' is-accessory-mode' : ''

  return (
    <div className={`pedestal-shell${shellModeClass}`}>
      <header className="pedestal-topbar">
        <button
          type="button"
          className="pedestal-utility"
          onClick={() => setBioOpen(true)}
          aria-label="Bio et statistiques"
          title="Bio et statistiques"
        >
          <ClipboardList size={24} strokeWidth={1.75} aria-hidden="true" />
        </button>
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
            dustAmount={dustAmount}
            dustRevision={dustRevision}
            onSurfacePointerDown={handleSurfaceStart}
            onSurfacePointerMove={handleSurfaceMove}
            onSurfacePointerUp={handleSurfaceEnd}
            onSurfacePointerCancel={cancelSurfaceGesture}
            accessories={accessoryInstances}
            selectedAccessoryId={selectedAccessoryId}
            onAccessorySelect={handleAccessorySelect}
            onAccessoryTransformCommit={handleAccessoryTransform}
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
                <button type="button" disabled={caressPending} onClick={() => void submitCaress(retryInput)}>
                  Réessayer
                </button>
              ) : null}
            </div>
          ) : null}

          {cleaningError ? (
            <div className="pedestal-cleaning-error" role="alert">
              <span>{cleaningError}</span>
              {cleaningRetryInput ? (
                <button type="button" disabled={cleaningPending} onClick={() => void submitCleaning(cleaningRetryInput)}>
                  Réessayer
                </button>
              ) : null}
            </div>
          ) : null}

          {accessoryMode && selectedAccessoryId ? (
            <AccessoryEditor
              instances={accessoryInstances}
              selectedId={selectedAccessoryId}
              busy={accessoryPendingId !== null}
              message={accessoryPlacementError ?? accessoryRenderError}
              maxInstances={maxInstances}
              onSelect={handleAccessorySelect}
              onTransform={handleAccessoryTransform}
              onRemove={handleAccessoryRemove}
              onOpenShop={openAccessoryShop}
              onDone={handleAccessoryDone}
            />
          ) : null}

          <p className="pedestal-status">{status}</p>
        </section>

        <nav className="pedestal-actions" aria-label="Actions du caillou">
          {ACTIONS.map(({ label, Icon }) => {
            const isCaress = label === 'Caresser'
            const isCleaning = label === 'Nettoyer'
            const isAccessory = label === 'Accessoire'
            const isActive = (isCaress && caressMode)
              || (isCleaning && cleaningMode)
              || (isAccessory && (accessoryShopOpen || accessoryMode))
            const disabled = isCaress
              ? mutationBlocked
              : isCleaning
                ? mutationBlocked || !cleaningAvailable
                : isAccessory ? mutationBlocked : true
            const ariaLabel = isCaress
              ? (caressMode ? 'Quitter le mode Caresser' : 'Activer le mode Caresser')
              : isCleaning
                ? (!cleaningAvailable
                    ? 'Nettoyer — surface déjà conforme'
                    : cleaningMode ? 'Quitter le mode Nettoyer' : 'Activer le mode Nettoyer')
                : isAccessory
                  ? (accessoryShopOpen
                      ? 'Boutique d’accessoires ouverte'
                      : accessoryMode ? 'Gérer les accessoires placés' : 'Ouvrir la boutique d’accessoires')
                  : `${label} — fonctionnalité en préparation`

            return (
              <button
                key={label}
                type="button"
                className={isActive ? 'is-active' : undefined}
                disabled={disabled}
                aria-label={ariaLabel}
                aria-pressed={isCaress || isCleaning || isAccessory ? isActive : undefined}
                title={label}
                onClick={isCaress
                  ? () => toggleMode('caress')
                  : isCleaning
                    ? () => toggleMode('cleaning')
                    : isAccessory ? openAccessoryShop : undefined}
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
              <div><dt>Déplacement spontané</dt><dd>0 m observé</dd></div>
            </dl>
          </section>
        </div>
      ) : null}

      {accessoryShopOpen ? (
        <AccessoryShop
          balance={economyState.balance}
          placedCount={accessoryInstances.length}
          maxPlaced={maxInstances}
          equippedCounts={equippedCounts}
          onPlace={handleAccessoryPlace}
          onBalanceChanged={(balance) => setEconomyState((current) => ({ ...current, balance }))}
          onPurchased={handleAccessoryPurchased}
          onClose={() => setAccessoryShopOpen(false)}
        />
      ) : null}
    </div>
  )
}

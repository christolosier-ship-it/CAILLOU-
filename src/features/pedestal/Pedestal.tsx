import { BrushCleaning, ClipboardList, Gem, HandHeart, Shirt, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getRockCatalogEntryById } from '../../content/rockCatalog'
import { PRODUCT_NAME } from '../../domain/foundation'
import { ShowroomScene } from '../../scene/ShowroomScene'
import type { RockLoadState, RockSurfacePointerSample } from '../../scene/RockModel'
import { useReducedMotion } from '../../utils/useReducedMotion'
import type { ActiveRock } from '../adoption/adoptionTypes'
import { CaressMutationError, registerCaress } from '../caress/caressApi'
import {
  CARESS_CLIENT_COOLDOWN_MS,
  isValidCaress,
} from '../caress/caressRules'
import type {
  CaressMetrics,
} from '../caress/caressRules'
import type {
  RegisterCaressInput,
  RegisterCaressMutation,
  RockEconomySnapshot,
} from '../caress/caressTypes'

interface PedestalProps {
  activeRock: ActiveRock
  economy: RockEconomySnapshot
  username: string
  onServerStateChanged: () => Promise<void>
  onSignOut: () => Promise<void>
  registerCaressMutation?: RegisterCaressMutation
}

interface ActiveCaressGesture {
  pointerId: number
  startedAt: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  pathLengthPx: number
  sampleCount: number
}

const ACTIONS = [
  { label: 'Caresser', Icon: HandHeart },
  { label: 'Nettoyer', Icon: BrushCleaning },
  { label: 'Accessoire', Icon: Shirt },
  { label: 'Jeter', Icon: Trash2 },
] as const

function formatAdoptionDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value))
}

function lithonLabel(value: number) {
  return `${value} ${value === 1 ? 'Lithon' : 'Lithons'}`
}

function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1)
}

function errorPresentation(error: unknown) {
  if (error instanceof CaressMutationError) {
    return { message: error.message, retryable: error.retryable, refresh: !error.retryable }
  }

  return {
    message: 'La confirmation serveur n’est pas arrivée. La même caresse peut être renvoyée sans double crédit.',
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
}: PedestalProps) {
  const rock = getRockCatalogEntryById(activeRock.specimenId)
  const [loadState, setLoadState] = useState<RockLoadState>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const [bioOpen, setBioOpen] = useState(false)
  const [caressMode, setCaressMode] = useState(false)
  const [caressPending, setCaressPending] = useState(false)
  const [caressFeedback, setCaressFeedback] = useState<string | null>(null)
  const [caressError, setCaressError] = useState<string | null>(null)
  const [retryInput, setRetryInput] = useState<RegisterCaressInput | null>(null)
  const [economyState, setEconomyState] = useState(economy)
  const gestureRef = useRef<ActiveCaressGesture | null>(null)
  const lastSuccessfulCaressAt = useRef(-Infinity)
  const feedbackTimerRef = useRef<number | null>(null)
  const reducedMotion = useReducedMotion()
  const mutation = registerCaressMutation ?? registerCaress
  const adoptionDate = useMemo(() => formatAdoptionDate(activeRock.adoptedAt), [activeRock.adoptedAt])
  const handleLoadState = useCallback((state: RockLoadState) => setLoadState(state), [])

  useEffect(() => setEconomyState(economy), [economy])

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
  }, [])

  const showSuccess = useCallback(() => {
    setCaressFeedback('+1 Lithon')
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = window.setTimeout(() => setCaressFeedback(null), 1400)
  }, [])

  const submitCaress = useCallback(async (input: RegisterCaressInput) => {
    if (caressPending) return

    setCaressPending(true)
    setCaressError(null)

    try {
      const result = await mutation(input)
      setEconomyState(result)
      setRetryInput(null)
      lastSuccessfulCaressAt.current = performance.now()
      showSuccess()
      navigator.vibrate?.(12)
    } catch (error) {
      const presentation = errorPresentation(error)
      setCaressError(presentation.message)
      setRetryInput(presentation.retryable ? input : null)
      if (presentation.refresh) void onServerStateChanged()
    } finally {
      setCaressPending(false)
    }
  }, [caressPending, mutation, onServerStateChanged, showSuccess])

  const handleCaressStart = useCallback((sample: RockSurfacePointerSample) => {
    if (!caressMode || caressPending || retryInput || !sample.isPrimary) return

    gestureRef.current = {
      pointerId: sample.pointerId,
      startedAt: sample.timeStamp,
      startX: sample.clientX,
      startY: sample.clientY,
      lastX: sample.clientX,
      lastY: sample.clientY,
      pathLengthPx: 0,
      sampleCount: 1,
    }
    setCaressError(null)
  }, [caressMode, caressPending, retryInput])

  const handleCaressMove = useCallback((sample: RockSurfacePointerSample) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== sample.pointerId) return

    gesture.pathLengthPx += distance(gesture.lastX, gesture.lastY, sample.clientX, sample.clientY)
    gesture.lastX = sample.clientX
    gesture.lastY = sample.clientY
    gesture.sampleCount += 1
  }, [])

  const handleCaressEnd = useCallback((sample: RockSurfacePointerSample) => {
    const gesture = gestureRef.current
    gestureRef.current = null
    if (!gesture || gesture.pointerId !== sample.pointerId || !caressMode || caressPending || retryInput) return

    const metrics: CaressMetrics = {
      durationMs: Math.max(0, sample.timeStamp - gesture.startedAt),
      pathLengthPx: gesture.pathLengthPx + distance(gesture.lastX, gesture.lastY, sample.clientX, sample.clientY),
      directDistancePx: distance(gesture.startX, gesture.startY, sample.clientX, sample.clientY),
      sampleCount: gesture.sampleCount + 1,
    }

    if (!isValidCaress(metrics)) return
    if (performance.now() - lastSuccessfulCaressAt.current < CARESS_CLIENT_COOLDOWN_MS) return

    if (import.meta.env.DEV) {
      console.debug('[CAILLOU] caress gesture accepted', metrics)
    }

    void submitCaress({ userRockId: activeRock.id, eventKey: crypto.randomUUID() })
  }, [activeRock.id, caressMode, caressPending, retryInput, submitCaress])

  const cancelCaressGesture = useCallback(() => {
    gestureRef.current = null
  }, [])

  const status = caressPending
    ? 'Enregistrement de la caresse…'
    : retryInput
      ? 'Confirmation serveur à reprendre.'
      : caressMode
        ? 'Mode caresse actif. Faites glisser le doigt sur la surface du caillou.'
        : 'Votre caillou est prêt à ne rien faire à vos côtés.'

  return (
    <div className={`pedestal-shell${caressMode ? ' is-caress-mode' : ''}`}>
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
        <section className="pedestal-stage" aria-label={`Socle de ${activeRock.name}`}>
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
            interactionMode={caressMode ? 'caress' : 'orbit'}
            onSurfacePointerDown={handleCaressStart}
            onSurfacePointerMove={handleCaressMove}
            onSurfacePointerUp={handleCaressEnd}
            onSurfacePointerCancel={cancelCaressGesture}
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

          <p className="pedestal-status">{status}</p>
        </section>

        <nav className="pedestal-actions" aria-label="Actions du caillou">
          {ACTIONS.map(({ label, Icon }) => {
            const isCaress = label === 'Caresser'
            return (
              <button
                key={label}
                type="button"
                className={isCaress && caressMode ? 'is-active' : undefined}
                disabled={!isCaress || caressPending}
                aria-label={isCaress
                  ? (caressMode ? 'Quitter le mode Caresser' : 'Activer le mode Caresser')
                  : `${label} — fonctionnalité en préparation`}
                aria-pressed={isCaress ? caressMode : undefined}
                title={label}
                onClick={isCaress ? () => {
                  cancelCaressGesture()
                  setCaressMode((current) => !current)
                } : undefined}
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
              <div><dt>Lithons générés</dt><dd>{economyState.lithonsGenerated}</dd></div>
              <div><dt>Solde actuel</dt><dd>{lithonLabel(economyState.balance)}</dd></div>
              <div><dt>Déplacement spontané</dt><dd>0 m observé</dd></div>
            </dl>
          </section>
        </div>
      ) : null}
    </div>
  )
}

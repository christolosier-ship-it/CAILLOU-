import type { ComponentType } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { getRockCatalogEntryById } from '../../content/rockCatalog'
import { warmCompanionAssets } from '../../pwa/assetWarmup'
import { reconcilePendingMutations, SERVER_RECONCILED_EVENT } from '../../pwa/pendingMutations'
import { EmptyRockState } from '../adoption/EmptyRockState'
import type { ActiveRock } from '../adoption/adoptionTypes'
import { BioDialog } from '../bio/BioDialog'
import { loadRockBioSnapshot } from '../bio/bioApi'
import type { LoadRockBioSnapshot, RockBioSnapshot } from '../bio/bioTypes'
import type { RegisterCaressMutation, RockEconomySnapshot } from '../caress/caressTypes'
import type { RegisterCleaningMutation } from '../cleaning/cleaningTypes'
import { DiscardRockDialog } from '../discard/DiscardRockDialog'
import { DiscardRockError, discardActiveRock } from '../discard/discardApi'
import type { DiscardRockInput, DiscardRockMutation } from '../discard/discardTypes'
import { Pedestal } from './Pedestal'
import { shouldBlockStep11Controls } from './step11ControlRules'

export interface Step11PedestalBaseProps {
  activeRock: ActiveRock
  economy: RockEconomySnapshot
  username: string
  onServerStateChanged: () => Promise<void>
  onSignOut: () => Promise<void>
  registerCaressMutation?: RegisterCaressMutation | undefined
  registerCleaningMutation?: RegisterCleaningMutation | undefined
}

interface Step11PedestalProps extends Step11PedestalBaseProps {
  degraded?: boolean | undefined
  lastServerSyncAt?: string | null | undefined
  loadBioSnapshot?: LoadRockBioSnapshot | undefined
  discardRockMutation?: DiscardRockMutation | undefined
  PedestalComponent?: ComponentType<Step11PedestalBaseProps> | undefined
}

type NetworkState = 'online' | 'offline' | 'reconnecting'

function discardErrorPresentation(error: unknown) {
  if (error instanceof DiscardRockError) {
    return { message: error.message, retryable: error.retryable, refresh: !error.retryable }
  }
  return {
    message: 'La confirmation serveur n’est pas arrivée. La même opération peut être renvoyée sans double archivage.',
    retryable: true,
    refresh: false,
  }
}

function formatLastSync(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function Step11Pedestal({
  activeRock,
  economy,
  username,
  degraded = false,
  lastServerSyncAt = null,
  onServerStateChanged,
  onSignOut,
  registerCaressMutation,
  registerCleaningMutation,
  loadBioSnapshot,
  discardRockMutation,
  PedestalComponent = Pedestal,
}: Step11PedestalProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const interactionBlockedRef = useRef(false)
  const networkBlockedRef = useRef(degraded || (typeof navigator !== 'undefined' && !navigator.onLine))
  const [interactionBlocked, setInteractionBlocked] = useState(false)
  const [networkState, setNetworkState] = useState<NetworkState>(() =>
    degraded || (typeof navigator !== 'undefined' && !navigator.onLine) ? 'offline' : 'online')
  const [bioOpen, setBioOpen] = useState(false)
  const [bioSnapshot, setBioSnapshot] = useState<RockBioSnapshot | null>(null)
  const [bioLoading, setBioLoading] = useState(false)
  const [bioError, setBioError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [discardPending, setDiscardPending] = useState(false)
  const [discardError, setDiscardError] = useState<string | null>(null)
  const [discardRetryInput, setDiscardRetryInput] = useState<DiscardRockInput | null>(null)
  const [discardedVisual, setDiscardedVisual] = useState(false)

  const rock = getRockCatalogEntryById(activeRock.specimenId)
  const bioLoader = loadBioSnapshot ?? loadRockBioSnapshot
  const discardMutation = discardRockMutation ?? discardActiveRock
  const lastSyncLabel = formatLastSync(lastServerSyncAt)

  useEffect(() => {
    void warmCompanionAssets([rock.modelPath, rock.previewPath])
  }, [rock.modelPath, rock.previewPath])

  const reconcileNetwork = useCallback(async () => {
    if (!navigator.onLine) {
      networkBlockedRef.current = true
      setNetworkState('offline')
      return
    }
    networkBlockedRef.current = true
    setNetworkState('reconnecting')
    await reconcilePendingMutations()
    await onServerStateChanged()
    if (navigator.onLine) {
      networkBlockedRef.current = false
      setNetworkState('online')
    }
  }, [onServerStateChanged])

  useEffect(() => {
    if (degraded) {
      networkBlockedRef.current = true
      setNetworkState('offline')
    } else if (navigator.onLine && networkState !== 'reconnecting') {
      networkBlockedRef.current = false
      setNetworkState('online')
    }
  }, [degraded, networkState])

  useEffect(() => {
    const handleOffline = () => {
      networkBlockedRef.current = true
      setNetworkState('offline')
    }
    const handleOnline = () => void reconcileNetwork()
    const handleServerReconciled = () => void onServerStateChanged()
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    window.addEventListener(SERVER_RECONCILED_EVENT, handleServerReconciled)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener(SERVER_RECONCILED_EVENT, handleServerReconciled)
    }
  }, [onServerStateChanged, reconcileNetwork])

  const refreshBio = useCallback(async () => {
    setBioLoading(true)
    setBioError(null)
    try {
      setBioSnapshot(await bioLoader(activeRock.id))
    } catch (error) {
      setBioError(error instanceof Error ? error.message : 'Le dossier institutionnel n’a pas pu être relu.')
    } finally {
      setBioLoading(false)
    }
  }, [activeRock.id, bioLoader])

  const openBio = useCallback(() => {
    if (interactionBlockedRef.current) return
    setBioOpen(true)
    void refreshBio()
  }, [refreshBio])

  const submitDiscard = useCallback(async (input: DiscardRockInput) => {
    if (discardPending || networkBlockedRef.current) return
    setDiscardedVisual(true)
    setDiscardPending(true)
    setDiscardError(null)
    try {
      await discardMutation(input)
      setDiscardRetryInput(null)
      await onServerStateChanged()
    } catch (error) {
      const presentation = discardErrorPresentation(error)
      setDiscardError(presentation.message)
      setDiscardRetryInput(presentation.retryable ? input : null)
      if (presentation.refresh) {
        await onServerStateChanged()
        setDiscardedVisual(false)
      }
    } finally {
      setDiscardPending(false)
    }
  }, [discardMutation, discardPending, onServerStateChanged])

  const openDiscard = useCallback(() => {
    if (interactionBlockedRef.current || networkBlockedRef.current) return
    setDiscardError(null)
    setDiscardRetryInput(null)
    setDiscardOpen(true)
  }, [])

  const confirmDiscard = useCallback(() => {
    if (networkBlockedRef.current) {
      setDiscardOpen(false)
      return
    }
    const input = { userRockId: activeRock.id, eventKey: crypto.randomUUID() }
    setDiscardOpen(false)
    setDiscardRetryInput(input)
    void submitDiscard(input)
  }, [activeRock.id, submitDiscard])

  useEffect(() => {
    const host = hostRef.current
    if (!host || discardedVisual) return

    const bioButton = host.querySelector<HTMLButtonElement>('.pedestal-utility[aria-label="Bio et statistiques"]')
    const discardButton = Array.from(host.querySelectorAll<HTMLButtonElement>('.pedestal-actions button'))
      .find((button) => button.title === 'Jeter')

    if (!bioButton || !discardButton) return

    const handleBioClick = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      if (!interactionBlockedRef.current) openBio()
    }

    const handleDiscardClick = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      if (!interactionBlockedRef.current && !networkBlockedRef.current) openDiscard()
    }

    const handleNetworkGuard = (event: Event) => {
      if (!networkBlockedRef.current) return
      const target = event.target instanceof Element ? event.target : null
      const button = target?.closest('button')
      if (!button || !host.contains(button)) return
      const shell = host.querySelector<HTMLElement>('.pedestal-shell')
      const placementUtility = button.matches('.pedestal-utility[title="Placement"]')
      if (placementUtility && shell?.classList.contains('is-placement-mode')) return
      const sensitive = placementUtility
        || button.closest('.pedestal-actions') !== null
        || button.closest('.placement-panel') !== null
        || button.closest('.accessory-shop') !== null
      if (!sensitive) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }

    const handleNetworkPointer = (event: Event) => {
      if (!networkBlockedRef.current) return
      const shell = host.querySelector<HTMLElement>('.pedestal-shell')
      if (!shell?.classList.contains('is-caress-mode') && !shell?.classList.contains('is-cleaning-mode')) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }

    const syncControls = () => {
      const shell = host.querySelector<HTMLElement>('.pedestal-shell')
      const placementButton = host.querySelector<HTMLButtonElement>('.pedestal-utility[title="Placement"]')
      const blocked = shouldBlockStep11Controls(
        shell?.className ?? '',
        host.querySelector('.accessory-shop-backdrop') !== null,
        host.querySelector('.step11-dialog-backdrop') !== null,
        placementButton?.disabled ?? false,
      )

      interactionBlockedRef.current = blocked
      setInteractionBlocked((current) => current === blocked ? current : blocked)

      if (bioButton.disabled !== blocked) bioButton.disabled = blocked
      if (discardButton.disabled !== blocked) discardButton.disabled = blocked
      discardButton.setAttribute('aria-label', 'Jeter le caillou')
    }

    bioButton.addEventListener('click', handleBioClick, true)
    discardButton.addEventListener('click', handleDiscardClick, true)
    host.addEventListener('click', handleNetworkGuard, true)
    host.addEventListener('pointerdown', handleNetworkPointer, true)

    const observer = new MutationObserver(syncControls)
    observer.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'disabled'] })
    syncControls()

    return () => {
      observer.disconnect()
      bioButton.removeEventListener('click', handleBioClick, true)
      discardButton.removeEventListener('click', handleDiscardClick, true)
      host.removeEventListener('click', handleNetworkGuard, true)
      host.removeEventListener('pointerdown', handleNetworkPointer, true)
    }
  }, [discardedVisual, openBio, openDiscard])

  if (discardedVisual) {
    return (
      <EmptyRockState
        username={username}
        pending={discardPending}
        error={discardError}
        onRetry={discardRetryInput && !networkBlockedRef.current ? () => void submitDiscard(discardRetryInput) : undefined}
        onSignOut={onSignOut}
      />
    )
  }

  return (
    <div
      ref={hostRef}
      className="step11-pedestal-host"
      data-step11-blocked={interactionBlocked ? 'true' : 'false'}
      data-network-state={networkState}
    >
      {networkState !== 'online' || degraded ? (
        <aside className={`network-resilience-notice is-${networkState}`} role="status" aria-live="polite">
          <span>
            {networkState === 'reconnecting'
              ? 'Réconciliation avec Supabase en cours. Les opérations sensibles restent suspendues.'
              : `Synchronisation indisponible. Dernier état serveur connu affiché${lastSyncLabel ? ` (${lastSyncLabel})` : ''}. Le spécimen reste observable ; acquisitions et validations sont suspendues.`}
          </span>
          <button type="button" disabled={networkState === 'reconnecting'} onClick={() => void reconcileNetwork()}>
            {networkState === 'reconnecting' ? 'Réconciliation…' : 'Réessayer'}
          </button>
        </aside>
      ) : null}

      <PedestalComponent
        activeRock={activeRock}
        economy={economy}
        username={username}
        onServerStateChanged={onServerStateChanged}
        onSignOut={onSignOut}
        registerCaressMutation={registerCaressMutation}
        registerCleaningMutation={registerCleaningMutation}
      />

      {bioOpen ? (
        <BioDialog
          rockName={activeRock.name}
          rockLabel={rock.label}
          catalogIndex={rock.catalogIndex}
          activeRock={activeRock}
          snapshot={bioSnapshot}
          loading={bioLoading}
          error={bioError}
          onRetry={() => void refreshBio()}
          onClose={() => setBioOpen(false)}
        />
      ) : null}

      {discardOpen ? (
        <DiscardRockDialog
          rockName={activeRock.name}
          onCancel={() => setDiscardOpen(false)}
          onConfirm={confirmDiscard}
        />
      ) : null}
    </div>
  )
}

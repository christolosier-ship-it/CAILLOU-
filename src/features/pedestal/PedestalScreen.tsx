import { useCallback, useEffect, useReducer, useState } from 'react'

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
import { INITIAL_PEDESTAL_STATE, pedestalReducer } from './pedestalState'
import type { PedestalNetworkState } from './pedestalState'

export interface PedestalScreenProps {
  activeRock: ActiveRock
  economy: RockEconomySnapshot
  username: string
  degraded?: boolean | undefined
  lastServerSyncAt?: string | null | undefined
  onServerStateChanged: () => Promise<void>
  onSignOut: () => Promise<void>
  registerCaressMutation?: RegisterCaressMutation | undefined
  registerCleaningMutation?: RegisterCleaningMutation | undefined
  loadBioSnapshot?: LoadRockBioSnapshot | undefined
  discardRockMutation?: DiscardRockMutation | undefined
}

function initialNetworkState(degraded: boolean): PedestalNetworkState {
  return degraded || (typeof navigator !== 'undefined' && !navigator.onLine) ? 'offline' : 'online'
}

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

export function PedestalScreen({
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
}: PedestalScreenProps) {
  const [pedestalState, dispatchPedestal] = useReducer(pedestalReducer, {
    ...INITIAL_PEDESTAL_STATE,
    network: initialNetworkState(degraded),
  })
  const [bioSnapshot, setBioSnapshot] = useState<RockBioSnapshot | null>(null)
  const [bioLoading, setBioLoading] = useState(false)
  const [bioError, setBioError] = useState<string | null>(null)
  const [discardPending, setDiscardPending] = useState(false)
  const [discardError, setDiscardError] = useState<string | null>(null)
  const [discardRetryInput, setDiscardRetryInput] = useState<DiscardRockInput | null>(null)
  const [discardedVisual, setDiscardedVisual] = useState(false)

  const rock = getRockCatalogEntryById(activeRock.specimenId)
  const bioLoader = loadBioSnapshot ?? loadRockBioSnapshot
  const discardMutation = discardRockMutation ?? discardActiveRock
  const lastSyncLabel = formatLastSync(lastServerSyncAt)
  const bioOpen = pedestalState.overlay === 'bio'
  const discardOpen = pedestalState.overlay === 'discard'
  const networkBlocked = pedestalState.network !== 'online'

  useEffect(() => {
    void warmCompanionAssets([rock.modelPath, rock.previewPath])
  }, [rock.modelPath, rock.previewPath])

  const reconcileNetwork = useCallback(async () => {
    if (!navigator.onLine) {
      dispatchPedestal({ type: 'network-changed', network: 'offline' })
      return
    }

    dispatchPedestal({ type: 'network-changed', network: 'reconnecting' })
    await reconcilePendingMutations()
    await onServerStateChanged()

    dispatchPedestal({
      type: 'network-changed',
      network: navigator.onLine ? 'online' : 'offline',
    })
  }, [onServerStateChanged])

  useEffect(() => {
    if (degraded) {
      dispatchPedestal({ type: 'network-changed', network: 'offline' })
      return
    }
    if (navigator.onLine && pedestalState.network !== 'reconnecting') {
      dispatchPedestal({ type: 'network-changed', network: 'online' })
    }
  }, [degraded, pedestalState.network])

  useEffect(() => {
    const handleOffline = () => dispatchPedestal({ type: 'network-changed', network: 'offline' })
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

  useEffect(() => {
    if (bioOpen) void refreshBio()
  }, [bioOpen, refreshBio])

  const submitDiscard = useCallback(async (input: DiscardRockInput) => {
    if (discardPending || networkBlocked) return
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
  }, [discardMutation, discardPending, networkBlocked, onServerStateChanged])

  const confirmDiscard = useCallback(() => {
    if (networkBlocked) {
      dispatchPedestal({ type: 'close-overlay' })
      return
    }
    const input = { userRockId: activeRock.id, eventKey: crypto.randomUUID() }
    dispatchPedestal({ type: 'close-overlay' })
    setDiscardRetryInput(input)
    void submitDiscard(input)
  }, [activeRock.id, networkBlocked, submitDiscard])

  if (discardedVisual) {
    return (
      <EmptyRockState
        username={username}
        pending={discardPending}
        error={discardError}
        onRetry={discardRetryInput && !networkBlocked ? () => void submitDiscard(discardRetryInput) : undefined}
        onSignOut={onSignOut}
      />
    )
  }

  return (
    <div
      className="pedestal-screen-host"
      data-network-state={pedestalState.network}
      data-pedestal-overlay={pedestalState.overlay}
    >
      {pedestalState.network !== 'online' || degraded ? (
        <aside className={`network-resilience-notice is-${pedestalState.network}`} role="status" aria-live="polite">
          <span>
            {pedestalState.network === 'reconnecting'
              ? 'Réconciliation avec Supabase en cours. Les opérations sensibles restent suspendues.'
              : `Synchronisation indisponible. Dernier état serveur connu affiché${lastSyncLabel ? ` (${lastSyncLabel})` : ''}. Le spécimen reste observable ; acquisitions et validations sont suspendues.`}
          </span>
          <button
            type="button"
            disabled={pedestalState.network === 'reconnecting'}
            onClick={() => void reconcileNetwork()}
          >
            {pedestalState.network === 'reconnecting' ? 'Réconciliation…' : 'Réessayer'}
          </button>
        </aside>
      ) : null}

      <Pedestal
        activeRock={activeRock}
        economy={economy}
        username={username}
        onServerStateChanged={onServerStateChanged}
        onSignOut={onSignOut}
        registerCaressMutation={registerCaressMutation}
        registerCleaningMutation={registerCleaningMutation}
        pedestalState={pedestalState}
        dispatchPedestal={dispatchPedestal}
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
          onClose={() => dispatchPedestal({ type: 'close-overlay' })}
        />
      ) : null}

      {discardOpen ? (
        <DiscardRockDialog
          rockName={activeRock.name}
          onCancel={() => dispatchPedestal({ type: 'close-overlay' })}
          onConfirm={confirmDiscard}
        />
      ) : null}
    </div>
  )
}

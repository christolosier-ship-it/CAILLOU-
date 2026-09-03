import { BrushCleaning, ClipboardList, Gem, HandHeart, Move, Shirt, Trash2 } from 'lucide-react'
import type { Dispatch } from 'react'
import { useCallback, useReducer, useState } from 'react'

import { getRockCatalogEntryById } from '../../content/rockCatalog'
import { PRODUCT_NAME } from '../../domain/foundation'
import { ShowroomScene } from '../../scene/ShowroomScene'
import type { RockLoadState } from '../../scene/RockModel'
import { useReducedMotion } from '../../utils/useReducedMotion'
import { AccessoryShop } from '../accessories/AccessoryShop'
import type { PurchaseAccessoryResult } from '../accessories/accessoryTypes'
import type { ActiveRock } from '../adoption/adoptionTypes'
import type { RegisterCaressMutation, RockEconomySnapshot } from '../caress/caressTypes'
import type { RegisterCleaningMutation } from '../cleaning/cleaningTypes'
import { PlacementPanel } from '../placement/PlacementPanel'
import {
  derivePedestalCapabilities,
  INITIAL_PEDESTAL_STATE,
  pedestalReducer,
} from './pedestalState'
import type { PedestalAction, PedestalShopFocus, PedestalState } from './pedestalState'
import { usePedestalCare } from './usePedestalCare'
import { usePedestalPlacement } from './usePedestalPlacement'

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

const ACTIONS = [
  { label: 'Caresser', Icon: HandHeart },
  { label: 'Nettoyer', Icon: BrushCleaning },
  { label: 'Boutique', Icon: Shirt },
  { label: 'Jeter', Icon: Trash2 },
] as const

function lithonLabel(value: number) {
  return `${value} ${value === 1 ? 'Lithon' : 'Lithons'}`
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
  const reducedMotion = useReducedMotion()
  const mode = pedestalState.interactionMode
  const accessoryShopOpen = pedestalState.overlay === 'shop'
  const shopFocus = pedestalState.shopFocus

  const care = usePedestalCare({
    activeRock,
    economy,
    mode,
    dispatchPedestal,
    onServerStateChanged,
    registerCaressMutation,
    registerCleaningMutation,
  })

  const placement = usePedestalPlacement({
    activeRock,
    mode,
    dispatchPedestal,
    externalMutationPending: care.mutationPending,
    onServerStateChanged,
    onBalanceChanged: care.setBalance,
  })

  const capabilities = derivePedestalCapabilities(pedestalState, {
    mutationPending: placement.mutationPending,
    cleaningAvailable: care.cleaningAvailable,
  })

  const toggleCareMode = useCallback((target: 'caress' | 'cleaning') => {
    const allowed = target === 'caress' ? capabilities.canCaress : capabilities.canClean
    if (!allowed) return
    care.prepareExternalTransition()
    placement.resetDraft()
    dispatchPedestal({ type: 'toggle-interaction', mode: target })
  }, [
    capabilities.canCaress,
    capabilities.canClean,
    care.prepareExternalTransition,
    dispatchPedestal,
    placement.resetDraft,
  ])

  const openShop = useCallback((focus: PedestalShopFocus = 'default') => {
    if (!capabilities.canOpenShop) return
    care.prepareExternalTransition()
    placement.resetDraft()
    dispatchPedestal({ type: 'open-overlay', overlay: 'shop', shopFocus: focus })
  }, [
    capabilities.canOpenShop,
    care.prepareExternalTransition,
    dispatchPedestal,
    placement.resetDraft,
  ])

  const togglePlacement = useCallback(() => {
    if (placement.placementMode) {
      if (!capabilities.canExitPlacement) return
      care.prepareExternalTransition()
      placement.resetDraft()
      dispatchPedestal({ type: 'return-to-orbit' })
      return
    }
    if (!capabilities.canEnterPlacement) return
    care.prepareExternalTransition()
    placement.beginPlacement()
    dispatchPedestal({ type: 'enter-placement' })
  }, [
    capabilities.canEnterPlacement,
    capabilities.canExitPlacement,
    care.prepareExternalTransition,
    dispatchPedestal,
    placement,
  ])

  const selectRockForPlacement = useCallback(() => {
    const result = placement.selectRockForPlacement()
    if (result === 'permit-required') openShop('permit')
  }, [openShop, placement])

  const handleAccessoryPurchased = useCallback((result: PurchaseAccessoryResult) => {
    care.setBalance(result.balance)
    void onServerStateChanged()
  }, [care.setBalance, onServerStateChanged])

  const status = placement.status
    ?? care.status
    ?? placement.rockMovementError
    ?? 'Votre caillou est prêt à ne rien faire à vos côtés.'

  const shellModeClass = care.caressMode
    ? ' is-caress-mode'
    : care.cleaningMode
      ? ' is-cleaning-mode'
      : placement.placementMode
        ? ' is-placement-mode'
        : placement.accessorySettling || placement.globalSettling ? ' is-composition-settling' : ''

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
            className={`pedestal-utility pedestal-utility-icon${placement.placementMode ? ' is-active' : ''}`}
            onClick={togglePlacement}
            disabled={placement.placementMode ? !capabilities.canExitPlacement : !capabilities.canEnterPlacement}
            aria-label={placement.placementMode ? 'Quitter Placement' : 'Ouvrir Placement'}
            aria-pressed={placement.placementMode}
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
          aria-label={`Solde : ${lithonLabel(care.economyState.balance)}`}
          title={lithonLabel(care.economyState.balance)}
        >
          <Gem size={22} strokeWidth={1.75} aria-hidden="true" />
          <span>{care.economyState.balance}</span>
        </output>
      </header>

      <main className="pedestal-main">
        <section
          className="pedestal-stage"
          aria-label={`Socle de ${activeRock.name}`}
          data-dust-amount={care.dustAmount.toFixed(3)}
          data-accessory-count={placement.accessoryInstances.length}
          data-rock-mode={mode}
          data-placement-target={placement.placementTarget?.kind === 'accessory'
            ? placement.placementTarget.instanceId
            : placement.placementTarget?.kind ?? ''}
          data-placement-tool={placement.placementTool}
          data-rock-position={placement.rockPose.position.join(',')}
          data-rock-rotation={placement.rockPose.rotation.join(',')}
        >
          <div className="pedestal-identity">
            <p className="eyebrow">{rock.label}</p>
            <h1>{activeRock.name}</h1>
          </div>

          <ShowroomScene
            rock={rock}
            retryKey={retryKey}
            reducedMotion={reducedMotion}
            onLoadStateChange={setLoadState}
            onInteractionChange={() => undefined}
            interactionMode={mode}
            rockPose={placement.rockPose}
            onRockPoseDraft={placement.handleRockPlacementDraft}
            onCompositionSettled={placement.handleCompositionSettled}
            placementTarget={placement.placementTarget}
            placementTool={placement.placementTool}
            placementSession={placement.placementSession}
            settlementPlan={placement.settlementPlan}
            dustAmount={care.dustAmount}
            dustRevision={care.dustRevision}
            onSurfacePointerDown={care.handleSurfaceStart}
            onSurfacePointerMove={care.handleSurfaceMove}
            onSurfacePointerUp={care.handleSurfaceEnd}
            onSurfacePointerCancel={care.cancelSurfaceGesture}
            accessories={placement.accessoryInstances}
            selectedAccessoryId={placement.selectedAccessoryId}
            onAccessoryPlacementDraft={placement.handleAccessoryPlacementDraft}
            onAccessorySettled={placement.handleAccessorySettled}
            onAccessoryLoadStateChange={placement.handleAccessoryLoadState}
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

          {care.caressFeedback ? (
            <output className="pedestal-caress-feedback" aria-live="polite">{care.caressFeedback}</output>
          ) : null}

          {care.cleaningFeedback ? (
            <output className="pedestal-cleaning-feedback" aria-live="polite">{care.cleaningFeedback}</output>
          ) : null}

          {care.caressError ? (
            <div className="pedestal-caress-error" role="alert">
              <span>{care.caressError}</span>
              {care.retryInput ? (
                <button
                  type="button"
                  disabled={care.caressPending}
                  onClick={() => void care.submitCaress(care.retryInput!)}
                >
                  Réessayer
                </button>
              ) : null}
            </div>
          ) : null}

          {care.cleaningError ? (
            <div className="pedestal-cleaning-error" role="alert">
              <span>{care.cleaningError}</span>
              {care.cleaningRetryInput ? (
                <button
                  type="button"
                  disabled={care.cleaningPending}
                  onClick={() => void care.submitCleaning(care.cleaningRetryInput!)}
                >
                  Réessayer
                </button>
              ) : null}
            </div>
          ) : null}

          {placement.placementMode ? (
            <PlacementPanel
              rockName={activeRock.name}
              permitUnlocked={placement.rockPermit.unlocked}
              permitLoading={placement.rockPermit.loading}
              instances={placement.accessoryInstances}
              selectedTarget={placement.placementTarget}
              tool={placement.placementTool}
              busy={placement.mutationPending}
              message={placement.message}
              maxInstances={placement.maxInstances}
              onSelectRock={selectRockForPlacement}
              onOpenPermitShop={() => openShop('permit')}
              onSelectAccessory={placement.handleAccessorySelect}
              onToolChange={placement.handlePlacementTool}
              onAddOwned={placement.handlePlacementAdd}
              onRemove={placement.handleAccessoryRemove}
              onDone={placement.handlePlacementDone}
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
            const isActive = (isCaress && care.caressMode)
              || (isCleaning && care.cleaningMode)
              || (isShop && accessoryShopOpen)
            const disabled = isCaress
              ? !capabilities.canCaress
              : isCleaning
                ? !capabilities.canClean
                : isShop
                  ? !capabilities.canOpenShop
                  : isDiscard ? !capabilities.canDiscard : true
            const ariaLabel = isCaress
              ? (care.caressMode ? 'Quitter le mode Caresser' : 'Activer le mode Caresser')
              : isCleaning
                ? (!care.cleaningAvailable
                    ? 'Nettoyer — surface déjà conforme'
                    : care.cleaningMode ? 'Quitter le mode Nettoyer' : 'Activer le mode Nettoyer')
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
                  ? () => toggleCareMode('caress')
                  : isCleaning
                    ? () => toggleCareMode('cleaning')
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
          balance={care.economyState.balance}
          permit={placement.rockPermit.snapshot}
          permitLoading={placement.rockPermit.loading}
          permitPending={placement.rockPermit.pending}
          permitError={placement.rockPermit.error}
          permitRetrying={placement.rockPermit.retrying}
          highlightPermit={shopFocus === 'permit'}
          interactionDisabled={!capabilities.canPurchase}
          onPermitPurchase={placement.handlePermitPurchase}
          onBalanceChanged={care.setBalance}
          onPurchased={handleAccessoryPurchased}
          onClose={() => {
            if (!placement.rockPermit.pending) {
              placement.rockPermit.clearError()
              dispatchPedestal({ type: 'close-overlay' })
            }
          }}
        />
      ) : null}
    </div>
  )
}

import { Check, Gem, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { RockMovementPermitSnapshot } from '../rockMovement/rockMovementTypes'
import { AccessoryPurchaseError, loadAccessoryShop, purchaseAccessory } from './accessoryApi'
import { formatLithons, getPurchaseAvailability } from './accessoryRules'
import type {
  AccessoryCatalogItem,
  AccessoryShopSnapshot,
  PurchaseAccessoryInput,
  PurchaseAccessoryMutation,
  PurchaseAccessoryResult,
} from './accessoryTypes'

interface AccessoryShopProps {
  balance: number
  onBalanceChanged: (balance: number) => void
  onPurchased: (result: PurchaseAccessoryResult) => void
  onClose: () => void
  permit: RockMovementPermitSnapshot | null
  permitLoading: boolean
  permitPending: boolean
  permitError: string | null
  permitRetrying?: boolean
  highlightPermit?: boolean
  interactionDisabled?: boolean
  onPermitPurchase: () => Promise<boolean>
  loadShop?: () => Promise<AccessoryShopSnapshot>
  purchaseMutation?: PurchaseAccessoryMutation
}

function purchaseErrorPresentation(error: unknown) {
  if (error instanceof AccessoryPurchaseError) {
    return { message: error.message, retryable: error.retryable }
  }
  return {
    message: 'La confirmation serveur n’est pas arrivée. Le même achat peut être renvoyé sans double débit.',
    retryable: true,
  }
}

function accessoryLicense(provenance: AccessoryCatalogItem['provenance']) {
  if (provenance && typeof provenance === 'object' && !Array.isArray(provenance)) {
    const license = provenance.license
    if (typeof license === 'string' && license.trim()) return license
  }
  return 'Licence vérifiée'
}

export function AccessoryShop({
  balance,
  onBalanceChanged,
  onPurchased,
  onClose,
  permit,
  permitLoading,
  permitPending,
  permitError,
  permitRetrying = false,
  highlightPermit = false,
  interactionDisabled = false,
  onPermitPurchase,
  loadShop = loadAccessoryShop,
  purchaseMutation = purchaseAccessory,
}: AccessoryShopProps) {
  const [items, setItems] = useState<AccessoryCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [purchaseFeedback, setPurchaseFeedback] = useState<string | null>(null)
  const [retryInput, setRetryInput] = useState<PurchaseAccessoryInput | null>(null)
  const busy = pendingId !== null || permitPending
  const mutationBlocked = busy || interactionDisabled

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const snapshot = await loadShop()
      setItems(snapshot.items)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Le catalogue n’est pas disponible.')
    } finally {
      setLoading(false)
    }
  }, [loadShop])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  const submitPurchase = useCallback(async (input: PurchaseAccessoryInput) => {
    if (mutationBlocked) return
    setPendingId(input.accessoryId)
    setPurchaseError(null)
    setPurchaseFeedback(null)

    try {
      const result = await purchaseMutation(input)
      setItems((current) => current.map((item) => item.id === result.accessoryId
        ? { ...item, purchasedAt: result.purchasedAt }
        : item))
      setRetryInput(null)
      setPurchaseFeedback('Acquisition enregistrée. L’accessoire appartient désormais à votre compte et peut être instancié depuis Placement.')
      onBalanceChanged(result.balance)
      onPurchased(result)
      navigator.vibrate?.(14)
    } catch (error) {
      const presentation = purchaseErrorPresentation(error)
      setPurchaseError(presentation.message)
      setRetryInput(presentation.retryable ? input : null)
      if (error instanceof AccessoryPurchaseError && error.kind === 'already-owned') {
        void refresh()
      }
    } finally {
      setPendingId(null)
    }
  }, [mutationBlocked, onBalanceChanged, onPurchased, purchaseMutation, refresh])

  const submitPermitPurchase = useCallback(async () => {
    if (mutationBlocked || permitLoading || !permit || permit.unlockedAt) return
    setPurchaseError(null)
    setPurchaseFeedback(null)
    const success = await onPermitPurchase()
    if (success) {
      setPurchaseFeedback('Permis de manutention minérale délivré. Le caillou est désormais disponible dans Placement.')
      navigator.vibrate?.(16)
    }
  }, [mutationBlocked, onPermitPurchase, permit, permitLoading])

  const permitOwned = permit?.unlockedAt != null
  const permitAffordable = permit ? balance >= permit.priceLithons : false

  return (
    <div
      className="accessory-shop-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <section className="accessory-shop" role="dialog" aria-modal="true" aria-labelledby="accessory-shop-title">
        <header className="accessory-shop-heading">
          <div>
            <p className="eyebrow">Registre des acquisitions</p>
            <h2 id="accessory-shop-title">Boutique</h2>
            <p>Accessoires et autorisations permanentes. Ici on acquiert. Le déplacement des objets reste exclusivement dans Placement.</p>
          </div>
          <button
            type="button"
            className="accessory-shop-close"
            autoFocus={!highlightPermit}
            onClick={onClose}
            disabled={busy}
            aria-label="Fermer la Boutique"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="accessory-shop-balance" aria-label={`Solde disponible : ${formatLithons(balance)}`}>
          <Gem size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>Solde disponible</span>
          <strong>{formatLithons(balance)}</strong>
        </div>

        <section className="shop-section" aria-labelledby="shop-services-title">
          <header className="shop-section-heading">
            <p className="eyebrow">Autorisations / services</p>
            <h3 id="shop-services-title">Fonctionnalités permanentes</h3>
          </header>

          <article className={`feature-card${highlightPermit ? ' is-highlighted' : ''}`} data-feature-id={permit?.featureId ?? 'rock_movement'}>
            <div className="feature-card-icon" aria-hidden="true"><ShieldCheck size={34} strokeWidth={1.55} /></div>
            <div className="feature-card-copy">
              <div>
                <p>Autorisation interne</p>
                <h4>{permit?.name ?? 'Permis de manutention minérale'}</h4>
              </div>
              <p>{permit?.description ?? 'Autorise la transformation persistante de la position et de l’orientation du caillou.'}</p>
              <dl>
                <div><dt>Prix serveur</dt><dd>{permit ? formatLithons(permit.priceLithons) : 'Vérification…'}</dd></div>
                <div><dt>Propriété</dt><dd>Permanente au compte</dd></div>
              </dl>
              <button
                type="button"
                className={permitOwned ? 'accessory-buy is-secondary' : 'accessory-buy'}
                autoFocus={highlightPermit && !permitOwned}
                disabled={mutationBlocked || permitLoading || !permit || permitOwned || !permitAffordable}
                onClick={() => void submitPermitPurchase()}
              >
                {permitLoading
                  ? 'Vérification…'
                  : permitOwned
                    ? 'Acquis'
                    : permitPending
                      ? 'Confirmation…'
                      : !permitAffordable
                        ? `Solde insuffisant · ${formatLithons(permit?.priceLithons ?? 0)}`
                        : permitRetrying ? 'Renvoyer la même opération' : `Acquérir · ${formatLithons(permit?.priceLithons ?? 0)}`}
              </button>
              {permitError ? <p className="feature-card-error" role="alert">{permitError}</p> : null}
            </div>
          </article>
        </section>

        <section className="shop-section" aria-labelledby="shop-accessories-title">
          <header className="shop-section-heading">
            <p className="eyebrow">Accessoires</p>
            <h3 id="shop-accessories-title">Objets homologués</h3>
          </header>

          {loading ? (
            <div className="accessory-shop-state" aria-live="polite">Consultation du registre…</div>
          ) : loadError ? (
            <div className="accessory-shop-state is-error" role="alert">
              <span>{loadError}</span>
              <button type="button" onClick={() => void refresh()}>
                <RefreshCw size={18} aria-hidden="true" /> Réessayer
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="accessory-shop-state">Aucun accessoire homologué pour le moment.</div>
          ) : (
            <div className="accessory-shop-grid">
              {items.map((item) => {
                const pending = pendingId === item.id
                const availability = getPurchaseAvailability({
                  balance,
                  priceLithons: item.priceLithons,
                  purchasedAt: item.purchasedAt,
                  pending: mutationBlocked,
                })

                return (
                  <article className="accessory-card" key={item.id}>
                    <div className="accessory-card-preview">
                      <img src={item.previewPath} alt={`Aperçu : ${item.name}`} />
                      {item.purchasedAt ? (
                        <span className="accessory-card-owned"><Check size={15} aria-hidden="true" /> Acquis</span>
                      ) : null}
                    </div>
                    <div className="accessory-card-copy">
                      <div>
                        <p>{item.category}</p>
                        <h3>{item.name}</h3>
                      </div>
                      <p>{item.description}</p>
                      <dl>
                        <div><dt>Prix fixe</dt><dd>{formatLithons(item.priceLithons)}</dd></div>
                        <div><dt>Licence</dt><dd>{accessoryLicense(item.provenance)}</dd></div>
                      </dl>

                      {item.purchasedAt ? (
                        <button type="button" className="accessory-buy is-secondary" disabled>Possédé · utiliser Placement</button>
                      ) : (
                        <button
                          type="button"
                          className={availability.allowed ? 'accessory-buy' : 'accessory-buy is-secondary'}
                          disabled={!availability.allowed}
                          onClick={() => void submitPurchase({ accessoryId: item.id, eventKey: crypto.randomUUID() })}
                        >
                          {pending ? 'Confirmation…' : availability.label}
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {purchaseError ? (
          <div className="accessory-shop-error" role="alert">
            <span>{purchaseError}</span>
            {retryInput ? (
              <button type="button" disabled={mutationBlocked} onClick={() => void submitPurchase(retryInput)}>
                Renvoyer la même opération
              </button>
            ) : null}
          </div>
        ) : null}

        {purchaseFeedback ? (
          <output className="accessory-shop-feedback" aria-live="polite">
            <Check size={17} aria-hidden="true" /> {purchaseFeedback}
          </output>
        ) : null}

        <footer className="accessory-shop-footer">
          <ShieldCheck size={19} strokeWidth={1.75} aria-hidden="true" />
          <span>Prix et propriétés sont vérifiés côté serveur. Aucun paiement réel. Aucun placement n’est créé depuis la Boutique.</span>
        </footer>
      </section>
    </div>
  )
}

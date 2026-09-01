import { Check, Gem, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

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
  onPlace?: (item: AccessoryCatalogItem) => Promise<void>
  placedCount?: number
  maxPlaced?: number
  equippedCounts?: Record<string, number>
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
  onPlace,
  placedCount = 0,
  maxPlaced = 8,
  equippedCounts = {},
  loadShop = loadAccessoryShop,
  purchaseMutation = purchaseAccessory,
}: AccessoryShopProps) {
  const [items, setItems] = useState<AccessoryCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [placingId, setPlacingId] = useState<string | null>(null)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [purchaseFeedback, setPurchaseFeedback] = useState<string | null>(null)
  const [placementError, setPlacementError] = useState<string | null>(null)
  const [retryInput, setRetryInput] = useState<PurchaseAccessoryInput | null>(null)
  const busy = pendingId !== null || placingId !== null

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
    if (busy) return
    setPendingId(input.accessoryId)
    setPurchaseError(null)
    setPlacementError(null)
    setPurchaseFeedback(null)

    try {
      const result = await purchaseMutation(input)
      setItems((current) => current.map((item) => item.id === result.accessoryId
        ? { ...item, purchasedAt: result.purchasedAt }
        : item))
      setRetryInput(null)
      setPurchaseFeedback('Acquisition enregistrée. L’accessoire appartient désormais à votre compte.')
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
  }, [busy, onBalanceChanged, onPurchased, purchaseMutation, refresh])

  const submitPlacement = useCallback(async (item: AccessoryCatalogItem) => {
    if (!onPlace || busy || placedCount >= maxPlaced) return
    setPlacingId(item.id)
    setPurchaseError(null)
    setPurchaseFeedback(null)
    setPlacementError(null)
    try {
      await onPlace(item)
      navigator.vibrate?.(10)
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : 'Le placement n’a pas pu être créé.')
    } finally {
      setPlacingId(null)
    }
  }, [busy, maxPlaced, onPlace, placedCount])

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
            <p className="eyebrow">Collection du Socle</p>
            <h2 id="accessory-shop-title">Accessoires</h2>
            <p>Objets cosmétiques homologués, acquis définitivement avec des Lithons puis placés librement sur le caillou.</p>
          </div>
          <button
            type="button"
            className="accessory-shop-close"
            autoFocus
            onClick={onClose}
            disabled={busy}
            aria-label="Fermer la boutique d’accessoires"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="accessory-shop-balance" aria-label={`Solde disponible : ${formatLithons(balance)}`}>
          <Gem size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>Solde disponible</span>
          <strong>{formatLithons(balance)}</strong>
        </div>

        <p className="accessory-shop-placement-count">
          {placedCount}/{maxPlaced} instances actuellement placées sur ce caillou.
        </p>

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
              const placing = placingId === item.id
              const equippedCount = equippedCounts[item.id] ?? 0
              const availability = getPurchaseAvailability({
                balance,
                priceLithons: item.priceLithons,
                purchasedAt: item.purchasedAt,
                pending: busy,
              })
              const placementAllowed = Boolean(onPlace) && !busy && placedCount < maxPlaced

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
                      <button
                        type="button"
                        className="accessory-buy"
                        disabled={!placementAllowed}
                        onClick={() => void submitPlacement(item)}
                      >
                        {placing ? 'Placement…' : placedCount >= maxPlaced ? 'Limite atteinte' : 'Placer sur le caillou'}
                      </button>
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

                    {item.purchasedAt ? (
                      <p className="accessory-card-note">
                        {equippedCount > 0
                          ? `${equippedCount} instance${equippedCount > 1 ? 's' : ''} déjà placée${equippedCount > 1 ? 's' : ''}.`
                          : 'Dans votre collection — prêt pour le placement libre.'}
                      </p>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {purchaseError ? (
          <div className="accessory-shop-error" role="alert">
            <span>{purchaseError}</span>
            {retryInput ? (
              <button type="button" disabled={busy} onClick={() => void submitPurchase(retryInput)}>
                Renvoyer la même opération
              </button>
            ) : null}
          </div>
        ) : null}

        {placementError ? <div className="accessory-shop-error" role="alert">{placementError}</div> : null}

        {purchaseFeedback ? (
          <output className="accessory-shop-feedback" aria-live="polite">
            <Check size={17} aria-hidden="true" /> {purchaseFeedback}
          </output>
        ) : null}

        <footer className="accessory-shop-footer">
          <ShieldCheck size={19} strokeWidth={1.75} aria-hidden="true" />
          <span>Prix, propriété et placements sont vérifiés par le registre. Aucun paiement réel.</span>
        </footer>
      </section>
    </div>
  )
}

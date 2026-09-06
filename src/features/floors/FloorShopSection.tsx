import { Check, RefreshCw } from 'lucide-react'
import { formatLithons } from '../accessories/accessoryRules'
import { floorAction } from './floorRules'
import type { FloorController } from './useFloors'
import '../../styles/floors.css'

export function FloorShopSection({ floors, balance, disabled }: {
  floors: FloorController; balance: number; disabled: boolean
}) {
  const blocked = disabled || floors.loading || !!floors.pending || !!floors.retry || !floors.online || !floors.confirmed
  return (
    <section className="shop-section" aria-labelledby="shop-floors-title">
      <header className="shop-section-heading">
        <p className="eyebrow">Biens permanents · un sol à la fois</p>
        <h3 id="shop-floors-title">Sols</h3>
        <p>Une autre matière sous ses pieds. Chaque sol reste à vous, même après un changement de caillou.</p>
      </header>
      {!floors.online ? <p className="floor-notice" role="status">Hors ligne · dernier sol confirmé. Reconnectez-vous pour acheter ou sélectionner.</p> : null}
      {floors.loading ? <p role="status">Vérification des sols…</p> : null}
      {floors.error ? <div className="floor-notice" role="alert">
        <p>{floors.error}</p>
        <button type="button" className="accessory-buy is-secondary" disabled={disabled || !!floors.pending || !floors.online}
          onClick={() => void (floors.retry ? floors.retryLast() : floors.refresh())}>
          <RefreshCw size={16} aria-hidden="true" /> {floors.retry ? 'Réessayer la même opération' : 'Actualiser les sols'}
        </button>
      </div> : null}
      {floors.feedback ? <p className="floor-notice" role="status">{floors.feedback}</p> : null}
      <div className="floor-grid">
        {floors.snapshot?.items.map((item) => {
          const action = floorAction(item, floors.snapshot?.selectedId ?? 'base', balance)
          const pending = floors.pending?.floorId === item.id
          const selected = action === 'selected'
          const unavailable = action === 'unavailable' || action === 'insufficient' || selected
          return (
            <article key={item.id} className={`floor-card${selected ? ' is-selected' : ''}`} data-floor-id={item.id}>
              {item.previewPath
                ? <img className="floor-swatch" src={item.previewPath} alt={`Matière : ${item.name}`} loading="lazy" width="256" height="256" />
                : <div className="floor-swatch" style={{ background: item.material.color }} aria-hidden="true" />}
              <div className="floor-card-copy">
                <span className="floor-ownership">{selected ? <><Check size={14} aria-hidden="true" /> Sélectionné</> : item.acquiredAt ? 'Possédé' : item.priceLithons === 0 ? 'Gratuit' : 'Disponible'}</span>
                <h4>{item.name}</h4>
                <p>{item.description}</p>
                <button type="button" className={`accessory-buy${item.acquiredAt ? ' is-secondary' : ''}`}
                  disabled={blocked || unavailable} aria-pressed={item.acquiredAt ? selected : undefined}
                  onClick={() => void floors.act(item.acquiredAt ? 'select' : 'purchase', item.id)}>
                  {pending ? 'Confirmation…' : selected ? 'Sélectionné' : action === 'select' ? 'Sélectionner'
                    : action === 'free' ? 'Obtenir gratuitement' : action === 'insufficient' ? 'Solde insuffisant'
                      : action === 'unavailable' ? 'Indisponible' : `Acheter · ${formatLithons(item.priceLithons)}`}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

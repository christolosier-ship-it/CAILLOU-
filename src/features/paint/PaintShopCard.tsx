import { Paintbrush } from 'lucide-react'
import { formatLithons } from '../accessories/accessoryRules'
import type { PaintController } from './usePaint'

export function PaintShopCard({ paint, balance, disabled, highlight }: { paint: PaintController; balance: number; disabled: boolean; highlight: boolean }) {
  const feature = paint.snapshot?.feature
  const owned = !!paint.snapshot?.unlocked
  const insufficient = feature ? balance < feature.price : false
  return <article className={`feature-card${highlight ? ' is-highlighted' : ''}`} data-feature-id="rock_paint">
    <div className="feature-card-icon" aria-hidden="true"><Paintbrush size={34} /></div>
    <div className="feature-card-copy"><div><p>Personnalisation réversible</p><h4>{feature?.name ?? 'Peinture minérale'}</h4></div>
      <p>{feature?.description ?? 'Couleur et finition, avec retour à la roche naturelle.'}</p>
      <dl><div><dt>Prix serveur</dt><dd>{feature ? formatLithons(feature.price) : 'Vérification…'}</dd></div><div><dt>Portée</dt><dd>Ce caillou uniquement</dd></div></dl>
      <button type="button" className={`accessory-buy${owned ? ' is-secondary' : ''}`} autoFocus={highlight && !owned}
        disabled={disabled || paint.loading || !paint.confirmed || !paint.online || owned || insufficient || !feature?.active}
        onClick={() => void (paint.retry ? paint.retryLast() : paint.purchase())}>
        {paint.pending ? 'Confirmation…' : paint.loading ? 'Vérification…' : owned ? 'Acquise pour ce caillou' : !feature?.active ? 'Indisponible'
          : insufficient ? 'Solde insuffisant' : paint.retry ? 'Réessayer la même opération' : `Acquérir pour ce caillou · ${formatLithons(feature.price)}`}
      </button>
      {owned ? <p>Ouvrez Peinture depuis le Socle pour choisir couleur et finition.</p> : null}
      {paint.error ? <p className="feature-card-error" role="alert">{paint.error}</p> : null}
      {paint.error && !paint.retry ? <button type="button" className="accessory-buy is-secondary" disabled={disabled || paint.loading || !paint.online} onClick={() => void paint.refresh()}>Actualiser</button> : null}
    </div>
  </article>
}

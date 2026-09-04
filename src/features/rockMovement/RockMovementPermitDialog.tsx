import { Gem, LockKeyhole } from 'lucide-react'

import type { RockMovementPermitSnapshot } from './rockMovementTypes'

interface RockMovementPermitDialogProps {
  snapshot: RockMovementPermitSnapshot | null
  balance: number
  loading: boolean
  pending: boolean
  error: string | null
  onPurchase: () => void
  onClose: () => void
}

export function RockMovementPermitDialog({
  snapshot,
  balance,
  loading,
  pending,
  error,
  onPurchase,
  onClose,
}: RockMovementPermitDialogProps) {
  const price = snapshot?.priceLithons ?? 1000
  const canAfford = balance >= price

  return (
    <div className="pedestal-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !pending) onClose()
    }}>
      <section className="pedestal-dialog rock-permit-dialog" role="dialog" aria-modal="true" aria-labelledby="rock-permit-title">
        <div className="pedestal-dialog-heading">
          <div>
            <p className="eyebrow">Autorisation exceptionnelle</p>
            <h2 id="rock-permit-title">Permis de manutention minérale</h2>
          </div>
          <button type="button" onClick={onClose} disabled={pending}>Fermer</button>
        </div>

        <div className="rock-permit-emblem" aria-hidden="true">
          <LockKeyhole size={34} strokeWidth={1.5} />
        </div>

        <p>{snapshot?.description ?? 'Autorise la manutention réglementaire du caillou dans les six degrés de liberté.'}</p>
        <p className="rock-permit-note">Achat lié à ce caillou uniquement. Il ne sera pas transféré au suivant. Les déplacements ultérieurs de ce caillou ne sont pas refacturés.</p>

        <div className="rock-permit-price">
          <span>Tarif réglementaire</span>
          <strong><Gem size={20} aria-hidden="true" /> {price} Lithons</strong>
        </div>

        {error ? <p className="rock-permit-error" role="alert">{error}</p> : null}

        <button
          type="button"
          className="rock-permit-purchase"
          disabled={loading || pending || !snapshot || !canAfford}
          onClick={onPurchase}
        >
          {pending ? 'Enregistrement…' : canAfford ? 'Acheter pour ce caillou' : `Il manque ${Math.max(0, price - balance)} Lithons`}
        </button>
      </section>
    </div>
  )
}

import type { ActiveRock } from '../adoption/adoptionTypes'
import { formatRockAge, lithonLabel } from './bioRules'
import type { RockBioSnapshot } from './bioTypes'

interface BioDialogProps {
  rockName: string
  rockLabel: string
  catalogIndex: number
  activeRock: ActiveRock
  snapshot: RockBioSnapshot | null
  loading: boolean
  error: string | null
  onRetry: () => void
  onClose: () => void
}

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

function formatDate(value: string) {
  return DATE_FORMAT.format(new Date(value))
}

export function BioDialog({
  rockName,
  rockLabel,
  catalogIndex,
  activeRock,
  snapshot,
  loading,
  error,
  onRetry,
  onClose,
}: BioDialogProps) {
  return (
    <div className="pedestal-dialog-backdrop step11-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="pedestal-dialog bio-dialog" role="dialog" aria-modal="true" aria-labelledby="pedestal-bio-title">
        <div className="pedestal-dialog-heading">
          <div>
            <p className="eyebrow">Dossier institutionnel</p>
            <h2 id="pedestal-bio-title">{rockName}</h2>
            <p className="bio-specimen-label">{rockLabel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer Bio / Stats">Fermer</button>
        </div>

        {loading && !snapshot ? (
          <p className="bio-loading" role="status">Consultation des registres…</p>
        ) : error && !snapshot ? (
          <div className="bio-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={onRetry}>Réessayer</button>
          </div>
        ) : snapshot ? (
          <div className="bio-sections">
            {error ? (
              <div className="bio-error bio-error-inline" role="alert">
                <p>{error}</p>
                <button type="button" onClick={onRetry}>Actualiser</button>
              </div>
            ) : null}

            <section aria-labelledby="bio-identity-title">
              <h3 id="bio-identity-title">Identité</h3>
              <dl>
                <div><dt>Spécimen</dt><dd>{String(catalogIndex).padStart(2, '0')}</dd></div>
                <div><dt>Adopté le</dt><dd>{formatDate(activeRock.adoptedAt)}</dd></div>
                <div><dt>Ancienneté</dt><dd>{formatRockAge(activeRock.adoptedAt)}</dd></div>
                <div><dt>Dernière pose stabilisée</dt><dd>{activeRock.poseStabilizedAt ? formatDate(activeRock.poseStabilizedAt) : 'Non documentée'}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="bio-register-title">
              <h3 id="bio-register-title">Registre</h3>
              <dl>
                <div><dt>Caresses</dt><dd>{snapshot.caressCount}</dd></div>
                <div><dt>Nettoyages</dt><dd>{snapshot.cleaningCount}</dd></div>
                <div><dt>Dernier nettoyage</dt><dd>{activeRock.lastCleanedAt ? formatDate(activeRock.lastCleanedAt) : 'Non requis à ce jour'}</dd></div>
                <div><dt>Lithons générés par ce caillou</dt><dd>{snapshot.lithonsGenerated}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="bio-account-title">
              <h3 id="bio-account-title">Compte</h3>
              <dl>
                <div><dt>Solde actuel</dt><dd>{lithonLabel(snapshot.balance)}</dd></div>
                <div><dt>Lithons gagnés</dt><dd>{snapshot.lifetimeEarned}</dd></div>
                <div><dt>Lithons dépensés</dt><dd>{snapshot.lifetimeSpent}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="bio-composition-title">
              <h3 id="bio-composition-title">Composition et autorisations</h3>
              <dl>
                <div><dt>Types d’accessoires possédés</dt><dd>{snapshot.ownedAccessoryCount}</dd></div>
                <div><dt>Instances actuellement placées</dt><dd>{snapshot.equippedAccessoryCount}</dd></div>
                <div><dt>Déblocages permanents</dt><dd>{snapshot.permanentUnlockCount}</dd></div>
                <div><dt>Permis de manutention</dt><dd>{snapshot.rockMovementUnlocked ? 'Acquis' : 'Non acquis'}</dd></div>
              </dl>
            </section>

            <section className="bio-editorial" aria-labelledby="bio-editorial-title">
              <div><h3 id="bio-editorial-title">Indicateurs éditoriaux</h3><p>Non scientifiques.</p></div>
              <dl>
                <div><dt>Mobilité spontanée</dt><dd>Non constatée</dd></div>
                <div><dt>Présence minérale</dt><dd>Conforme</dd></div>
              </dl>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  )
}

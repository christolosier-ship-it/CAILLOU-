import { BrushCleaning, ClipboardList, Gem, HandHeart, Shirt, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { getRockCatalogEntryById } from '../../content/rockCatalog'
import { PRODUCT_NAME } from '../../domain/foundation'
import { ShowroomScene } from '../../scene/ShowroomScene'
import type { RockLoadState } from '../../scene/RockModel'
import { useReducedMotion } from '../../utils/useReducedMotion'
import type { ActiveRock } from '../adoption/adoptionTypes'

interface PedestalProps {
  activeRock: ActiveRock
  username: string
  onSignOut: () => Promise<void>
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

export function Pedestal({ activeRock, username, onSignOut }: PedestalProps) {
  const rock = getRockCatalogEntryById(activeRock.specimenId)
  const [loadState, setLoadState] = useState<RockLoadState>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const [bioOpen, setBioOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const adoptionDate = useMemo(() => formatAdoptionDate(activeRock.adoptedAt), [activeRock.adoptedAt])
  const handleLoadState = useCallback((state: RockLoadState) => setLoadState(state), [])

  return (
    <div className="pedestal-shell">
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
        <button
          type="button"
          className="pedestal-future"
          disabled
          aria-label="Lithons — fonctionnalité à venir"
          title="Lithons"
        >
          <Gem size={24} strokeWidth={1.75} aria-hidden="true" />
        </button>
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

          <p className="pedestal-status">Votre caillou est prêt à ne rien faire à vos côtés.</p>
        </section>

        <nav className="pedestal-actions" aria-label="Actions du caillou">
          {ACTIONS.map(({ label, Icon }) => (
            <button
              key={label}
              type="button"
              disabled
              aria-label={`${label} — fonctionnalité en préparation`}
              title={label}
            >
              <Icon size={28} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ))}
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
              <div><dt>Déplacement spontané</dt><dd>0 m observé</dd></div>
              <div><dt>Mesures détaillées</dt><dd>Non encore consolidées</dd></div>
            </dl>
          </section>
        </div>
      ) : null}
    </div>
  )
}

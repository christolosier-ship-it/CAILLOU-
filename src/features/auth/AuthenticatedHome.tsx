import { PRODUCT_NAME } from '../../domain/foundation'
import { FoundationScene } from '../../scene/FoundationScene'

interface AuthenticatedHomeProps {
  username: string
  destination: 'showroom' | 'socle'
  onSignOut: () => Promise<void>
}

export function AuthenticatedHome({ username, destination, onSignOut }: AuthenticatedHomeProps) {
  return (
    <div className="app-shell authenticated-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">{destination === 'showroom' ? 'Showroom' : 'Socle'}</p>
          <h1>{PRODUCT_NAME}</h1>
        </div>
        <div className="account-chip">
          <span>{username}</span>
          <button type="button" onClick={() => void onSignOut()}>Déconnexion</button>
        </div>
      </header>

      <main className="foundation-layout">
        <section className="foundation-copy">
          <p className="eyebrow">Session restaurée</p>
          <h2>{destination === 'showroom' ? 'Choisissez votre caillou.' : 'Votre caillou vous attend.'}</h2>
          <p>
            {destination === 'showroom'
              ? 'Aucun caillou actif n’est associé à ce compte. Le parcours vous amène donc au showroom.'
              : 'Un caillou actif est associé à ce compte. Le parcours vous amène donc au Socle.'}
          </p>
        </section>

        <section className="foundation-scene" aria-label="Aperçu minéral provisoire">
          <div className="scene-heading">
            <div>
              <p className="eyebrow">{destination === 'showroom' ? 'Destination validée' : 'Destination restaurée'}</p>
              <h2>{destination === 'showroom' ? 'Showroom en préparation' : 'Socle en préparation'}</h2>
            </div>
            <p>La vraie expérience 3D arrive dans les étapes dédiées.</p>
          </div>
          <FoundationScene />
        </section>
      </main>
    </div>
  )
}

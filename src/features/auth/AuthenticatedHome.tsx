import { PRODUCT_NAME } from '../../domain/foundation'
import { Showroom } from '../showroom/Showroom'

interface AuthenticatedHomeProps {
  username: string
  destination: 'showroom' | 'socle'
  onSignOut: () => Promise<void>
}

export function AuthenticatedHome({ username, destination, onSignOut }: AuthenticatedHomeProps) {
  if (destination === 'showroom') {
    return <Showroom username={username} onSignOut={onSignOut} />
  }

  return (
    <div className="app-shell authenticated-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Socle</p>
          <h1>{PRODUCT_NAME}</h1>
        </div>
        <div className="account-chip">
          <span>{username}</span>
          <button type="button" onClick={() => void onSignOut()}>Déconnexion</button>
        </div>
      </header>

      <main className="foundation-layout">
        <section className="foundation-copy">
          <p className="eyebrow">Destination restaurée</p>
          <h2>Votre caillou vous attend.</h2>
          <p>Un caillou actif est associé à ce compte. Le Socle complet sera relié au parcours d’adoption lors de l’étape suivante.</p>
        </section>
      </main>
    </div>
  )
}

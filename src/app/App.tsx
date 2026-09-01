import { AuthenticatedHome } from '../features/auth/AuthenticatedHome'
import { AuthScreen } from '../features/auth/AuthScreen'
import { useAuthSession } from '../features/auth/useAuthSession'

export function App() {
  const { state, refresh, signOut } = useAuthSession()

  if (state.status === 'loading') {
    return (
      <main className="session-loading" aria-live="polite">
        <p className="eyebrow">CAILLOU™</p>
        <p>Retrouver votre session…</p>
      </main>
    )
  }

  if (state.status === 'signed-out') {
    return state.message ? (
      <AuthScreen message={state.message} onAuthenticated={refresh} />
    ) : (
      <AuthScreen onAuthenticated={refresh} />
    )
  }

  if (state.status === 'offline') {
    return (
      <main className="session-loading session-offline">
        <p className="eyebrow">Session locale retrouvée</p>
        <h1>{state.username ? `Bonjour ${state.username}.` : 'Connexion interrompue.'}</h1>
        <p>Internet est nécessaire pour vérifier l’état canonique de votre caillou.</p>
        <div className="session-actions">
          <button type="button" onClick={() => void refresh()}>Réessayer</button>
          <button type="button" onClick={() => void signOut()}>Déconnexion</button>
        </div>
      </main>
    )
  }

  return (
    <AuthenticatedHome
      destination={state.destination}
      activeRock={state.activeRock}
      economy={state.economy}
      username={state.username}
      onServerStateChanged={refresh}
      onSignOut={signOut}
    />
  )
}

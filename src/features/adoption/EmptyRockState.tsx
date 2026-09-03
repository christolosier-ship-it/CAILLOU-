interface EmptyRockStateProps {
  username: string
  pending?: boolean
  error?: string | null
  onRetry?: (() => void) | undefined
  onAdopt?: (() => void) | undefined
  onSignOut: () => Promise<void>
}

export function EmptyRockState({
  username,
  pending = false,
  error = null,
  onRetry,
  onAdopt,
  onSignOut,
}: EmptyRockStateProps) {
  return (
    <main className="empty-rock-shell">
      <section className="empty-rock-card" aria-live="polite">
        <p className="eyebrow">{pending || error ? 'Mise à jour du registre' : 'Dossier minéral'}</p>
        <h1>Aucun caillou actuellement sous votre responsabilité.</h1>
        <p>
          {pending
            ? 'Le Socle est désormais vide. Confirmation serveur en cours.'
            : 'Vos Lithons, acquisitions et autorisations permanentes restent enregistrés.'}
        </p>
        {error ? (
          <div className="empty-rock-error" role="alert">
            <p>{error}</p>
            {onRetry ? <button type="button" onClick={onRetry}>Réessayer la confirmation</button> : null}
          </div>
        ) : null}
        {!pending && !error && onAdopt ? (
          <button type="button" className="empty-rock-primary" onClick={onAdopt}>Adopter un nouveau caillou</button>
        ) : null}
      </section>
      <footer className="empty-rock-footer">
        <span>{username}</span>
        <button type="button" onClick={() => void onSignOut()}>Déconnexion</button>
      </footer>
    </main>
  )
}

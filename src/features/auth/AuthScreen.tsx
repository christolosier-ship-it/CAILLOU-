import { useState, type FormEvent } from 'react'

import { PRODUCT_NAME } from '../../domain/foundation'
import { AuthBrokerError, loginWithPseudo, registerWithPseudo } from './authApi'
import { validatePassword, validateUsername } from './authRules'

interface AuthScreenProps {
  message?: string
  onAuthenticated: () => Promise<void>
}

type Mode = 'login' | 'register'

export function AuthScreen({ message, onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(message ?? null)
  const [pending, setPending] = useState(false)

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode)
    setPassword('')
    setError(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!navigator.onLine) {
      setError('Réseau indisponible. La connexion au compte nécessite Internet.')
      return
    }

    if (mode === 'register') {
      const usernameError = validateUsername(username)
      const passwordError = validatePassword(password)
      if (usernameError || passwordError) {
        setError(usernameError ?? passwordError)
        return
      }
    } else if (!username.trim() || !password) {
      setError('Saisissez votre pseudo et votre mot de passe.')
      return
    }

    setPending(true)
    try {
      if (mode === 'register') await registerWithPseudo(username, password)
      else await loginWithPseudo(username, password)
      setPassword('')
      await onAuthenticated()
    } catch (caught) {
      setError(caught instanceof AuthBrokerError ? caught.message : 'Authentification impossible pour le moment.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro" aria-labelledby="auth-title">
        <p className="eyebrow">{PRODUCT_NAME}</p>
        <h1 id="auth-title">Un compte. Un caillou. Rien de superflu.</h1>
        <p>
          Votre identité ici tient en deux choses : un pseudo et un mot de passe. Aucun email à saisir,
          aucun identifiant technique à connaître.
        </p>
      </section>

      <section className="auth-card" aria-label="Authentification">
        <div className="auth-tabs" role="tablist" aria-label="Mode d’authentification">
          <button className={mode === 'login' ? 'is-active' : ''} type="button" onClick={() => changeMode('login')}>
            Connexion
          </button>
          <button className={mode === 'register' ? 'is-active' : ''} type="button" onClick={() => changeMode('register')}>
            Créer un compte
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Pseudo</span>
            <input
              autoCapitalize="none"
              autoComplete="username"
              maxLength={24}
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Pierre Quartz"
              spellCheck={false}
              value={username}
            />
          </label>

          <label>
            <span>Mot de passe</span>
            <input
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              maxLength={128}
              minLength={mode === 'register' ? 10 : undefined}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === 'register' ? '10 caractères minimum' : 'Votre mot de passe'}
              type="password"
              value={password}
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit" disabled={pending} type="submit">
            {pending ? 'Un instant…' : mode === 'register' ? 'Créer mon compte' : 'Entrer'}
          </button>
        </form>

        {mode === 'register' && (
          <p className="auth-footnote">
            Le pseudo est votre identifiant de connexion et reste fixe en V1. Sans email ni téléphone,
            la récupération automatique du mot de passe n’est pas disponible.
          </p>
        )}
      </section>
    </main>
  )
}

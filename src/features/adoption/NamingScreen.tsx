import { useCallback, useRef, useState } from 'react'

import type { RockCatalogEntry } from '../../content/rockCatalog'
import { PRODUCT_NAME } from '../../domain/foundation'
import { ShowroomScene } from '../../scene/ShowroomScene'
import type { RockLoadState } from '../../scene/RockModel'
import { useReducedMotion } from '../../utils/useReducedMotion'
import { adoptRock } from './adoptionApi'
import { normalizeRockName, ROCK_NAME_MAX_LENGTH, validateRockName } from './adoptionRules'
import type { ActiveRock, AdoptRockMutation } from './adoptionTypes'

interface NamingScreenProps {
  rock: RockCatalogEntry
  username: string
  onCancel: () => void
  onAdopted: (rock: ActiveRock) => Promise<void>
  onSignOut: () => Promise<void>
  mutation?: AdoptRockMutation
}

export function NamingScreen({
  rock,
  username,
  onCancel,
  onAdopted,
  onSignOut,
  mutation = adoptRock,
}: NamingScreenProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadState, setLoadState] = useState<RockLoadState>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const eventKey = useRef(crypto.randomUUID())
  const reducedMotion = useReducedMotion()

  const handleLoadState = useCallback((state: RockLoadState) => setLoadState(state), [])

  function handleNameChange(value: string) {
    setName(value)
    setError(null)
    eventKey.current = crypto.randomUUID()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const validation = validateRockName(name)
    if (validation) {
      setError(validation)
      return
    }

    const normalizedName = normalizeRockName(name)
    setName(normalizedName)
    setSubmitting(true)
    setError(null)

    try {
      const adopted = await mutation({ rock, name: normalizedName, eventKey: eventKey.current })
      await onAdopted(adopted)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'L’adoption n’a pas pu être confirmée.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="naming-shell">
      <header className="naming-header">
        <div>
          <p className="eyebrow">Procédure d’adoption</p>
          <h1>{PRODUCT_NAME}</h1>
        </div>
        <div className="account-chip">
          <span>{username}</span>
          <button type="button" onClick={() => void onSignOut()}>Déconnexion</button>
        </div>
      </header>

      <main className="naming-main">
        <section className="naming-stage" aria-label={`Vue 3D de ${rock.label}`}>
          <ShowroomScene
            rock={rock}
            retryKey={retryKey}
            reducedMotion={reducedMotion}
            onLoadStateChange={handleLoadState}
            onInteractionChange={() => undefined}
          />
          {loadState !== 'ready' ? (
            <div className={`naming-fallback is-${loadState}`} aria-live="polite">
              <img src={rock.previewPath} alt="" aria-hidden="true" />
              <div>
                {loadState === 'loading' ? <p>Maintien du spécimen sous observation…</p> : (
                  <>
                    <p>La vue 3D est momentanément indisponible.</p>
                    <button type="button" onClick={() => setRetryKey((current) => current + 1)}>Réessayer</button>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </section>

        <section className="naming-panel" aria-labelledby="naming-title">
          <p className="eyebrow">{rock.label}</p>
          <h2 id="naming-title">Attribuez-lui un nom.</h2>
          <p>Le spécimen ne changera pas physiquement. Son identité administrative, elle, sera mise à jour avec le sérieux nécessaire.</p>

          <form onSubmit={(event) => void handleSubmit(event)} noValidate>
            <label htmlFor="rock-name">Nom du caillou</label>
            <input
              id="rock-name"
              name="rock-name"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              maxLength={ROCK_NAME_MAX_LENGTH + 8}
              autoComplete="off"
              autoFocus
              aria-describedby="rock-name-help rock-name-error"
              aria-invalid={Boolean(error)}
              disabled={submitting}
            />
            <div className="naming-field-meta">
              <span id="rock-name-help">1 à {ROCK_NAME_MAX_LENGTH} caractères après normalisation.</span>
              <span>{[...normalizeRockName(name)].length} / {ROCK_NAME_MAX_LENGTH}</span>
            </div>
            {error ? <p id="rock-name-error" className="naming-error" role="alert">{error}</p> : <span id="rock-name-error" />}

            <div className="naming-actions">
              <button type="button" className="naming-secondary" onClick={onCancel} disabled={submitting}>Revenir au showroom</button>
              <button type="submit" className="naming-primary" disabled={submitting}>
                {submitting ? 'Enregistrement…' : 'Confirmer l’adoption'}
              </button>
            </div>
          </form>
          <p className="naming-note">En cas de coupure réseau, la même demande peut être rejouée sans créer un second caillou.</p>
        </section>
      </main>
    </div>
  )
}

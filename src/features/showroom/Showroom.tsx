import { useCallback, useEffect, useMemo, useState } from 'react'

import { getRelativeRockIndex, getRockCatalogEntry } from '../../content/rockCatalog'
import type { RockCatalogEntry } from '../../content/rockCatalog'
import { PRODUCT_NAME } from '../../domain/foundation'
import { ShowroomScene } from '../../scene/ShowroomScene'
import type { RockLoadState } from '../../scene/RockModel'
import { useReducedMotion } from '../../utils/useReducedMotion'

interface ShowroomProps {
  username: string
  onSignOut: () => Promise<void>
  onAdopt?: (rock: RockCatalogEntry) => void
}

export function Showroom({ username, onSignOut, onAdopt }: ShowroomProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loadState, setLoadState] = useState<RockLoadState>('loading')
  const [loadMessage, setLoadMessage] = useState<string | undefined>()
  const [retryKey, setRetryKey] = useState(0)
  const [isRotating, setIsRotating] = useState(false)
  const reducedMotion = useReducedMotion()
  const selectedRock = getRockCatalogEntry(selectedIndex + 1)

  const formattedIndex = useMemo(
    () => String(selectedRock.catalogIndex).padStart(2, '0'),
    [selectedRock.catalogIndex],
  )

  const selectRelative = useCallback((delta: number) => {
    if (isRotating) return
    setLoadState('loading')
    setLoadMessage(undefined)
    setSelectedIndex((current) => getRelativeRockIndex(current, delta))
  }, [isRotating])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        selectRelative(-1)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        selectRelative(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectRelative])

  useEffect(() => {
    const stopRotation = () => setIsRotating(false)
    window.addEventListener('pointerup', stopRotation)
    window.addEventListener('pointercancel', stopRotation)
    return () => {
      window.removeEventListener('pointerup', stopRotation)
      window.removeEventListener('pointercancel', stopRotation)
    }
  }, [])

  const handleLoadState = useCallback((state: RockLoadState, message?: string) => {
    setLoadState(state)
    setLoadMessage(message)
  }, [])

  return (
    <div className="showroom-shell">
      <header className="showroom-header">
        <div>
          <p className="eyebrow">Showroom des spécimens</p>
          <h1>{PRODUCT_NAME}</h1>
        </div>
        <div className="account-chip showroom-account">
          <span>{username}</span>
          <button type="button" onClick={() => void onSignOut()}>Déconnexion</button>
        </div>
      </header>

      <main className="showroom-main">
        <section className="showroom-stage" aria-label={`Vue 3D de ${selectedRock.label}`}>
          <ShowroomScene
            rock={selectedRock}
            retryKey={retryKey}
            reducedMotion={reducedMotion}
            onLoadStateChange={handleLoadState}
            onInteractionChange={setIsRotating}
          />

          <button
            type="button"
            className="showroom-nav showroom-nav-previous"
            onClick={() => selectRelative(-1)}
            disabled={isRotating}
            aria-label="Afficher le spécimen précédent"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            className="showroom-nav showroom-nav-next"
            onClick={() => selectRelative(1)}
            disabled={isRotating}
            aria-label="Afficher le spécimen suivant"
          >
            <span aria-hidden="true">›</span>
          </button>

          {loadState !== 'ready' ? (
            <div className={`showroom-fallback is-${loadState}`} aria-live="polite">
              <img src={selectedRock.previewPath} alt="" aria-hidden="true" />
              <div className="showroom-fallback-copy">
                {loadState === 'loading' ? (
                  <>
                    <span className="showroom-loader" aria-hidden="true" />
                    <p>Installation du spécimen…</p>
                  </>
                ) : (
                  <>
                    <p>Le modèle 3D n’a pas pu être installé.</p>
                    <button type="button" onClick={() => setRetryKey((current) => current + 1)}>Réessayer</button>
                    {loadMessage ? <span className="sr-only">Détail technique : {loadMessage}</span> : null}
                  </>
                )}
              </div>
            </div>
          ) : null}

          <p className="showroom-gesture-hint">Faire glisser pour examiner · pincer ou faire défiler pour zoomer</p>
        </section>

        <section className="showroom-details" aria-labelledby="showroom-specimen-title">
          <div className="showroom-counter" aria-live="polite" aria-atomic="true">
            <span>{formattedIndex}</span>
            <span aria-hidden="true">/</span>
            <span>20</span>
          </div>
          <p className="eyebrow">Catalogue permanent</p>
          <h2 id="showroom-specimen-title">{selectedRock.label}</h2>
          <p className="showroom-description">{selectedRock.description}</p>
          <dl className="showroom-observations">
            <div><dt>Triangles</dt><dd>10 000</dd></div>
            <div><dt>Mobilité spontanée</dt><dd>Non observée</dd></div>
            <div><dt>Statut</dt><dd>Disponible à l’observation</dd></div>
          </dl>
          <button
            type="button"
            className="showroom-adopt"
            disabled={!onAdopt}
            onClick={() => onAdopt?.(selectedRock)}
          >
            Adopter ce caillou
          </button>
        </section>
      </main>
    </div>
  )
}

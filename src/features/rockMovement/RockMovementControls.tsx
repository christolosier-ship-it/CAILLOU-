import { Move3d, Rotate3d } from 'lucide-react'

export type RockMovementMode = 'rock-position' | 'rock-orientation'

interface RockMovementControlsProps {
  mode: RockMovementMode
  busy: boolean
  message?: string | null
  onModeChange: (mode: RockMovementMode) => void
  onDone: () => void
}

export function RockMovementControls({
  mode,
  busy,
  message,
  onModeChange,
  onDone,
}: RockMovementControlsProps) {
  return (
    <section className="rock-movement-controls" aria-label="Manutention du caillou">
      <header>
        <div>
          <p className="eyebrow">Manutention autorisée</p>
          <h2>{mode === 'rock-position' ? 'Position' : 'Orientation'}</h2>
        </div>
        <button type="button" onClick={onDone} disabled={busy}>Terminer</button>
      </header>

      <div className="rock-movement-tabs" role="group" aria-label="Type de manipulation">
        <button
          type="button"
          className={mode === 'rock-position' ? 'is-active' : undefined}
          aria-pressed={mode === 'rock-position'}
          disabled={busy}
          onClick={() => onModeChange('rock-position')}
        >
          <Move3d size={20} aria-hidden="true" />
          Position
        </button>
        <button
          type="button"
          className={mode === 'rock-orientation' ? 'is-active' : undefined}
          aria-pressed={mode === 'rock-orientation'}
          disabled={busy}
          onClick={() => onModeChange('rock-orientation')}
        >
          <Rotate3d size={20} aria-hidden="true" />
          Orientation
        </button>
      </div>

      <p className="rock-movement-hint">
        {mode === 'rock-position'
          ? 'Un doigt déplace le caillou dans la vue. Pincez à deux doigts pour agir sur la profondeur.'
          : 'Un doigt incline librement le caillou. Tournez deux doigts pour le faire pivoter autour de la vue.'}
      </p>
      {message ? <p className="rock-movement-message" role="status">{message}</p> : null}
    </section>
  )
}

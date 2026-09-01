import type { AccessoryAxis } from './accessoryPlacementRules'
import {
  ACCESSORY_NUDGE_STEP,
  ACCESSORY_ROTATION_STEP,
  ACCESSORY_SCALE_STEP,
  nudgeAccessoryTransform,
  rotateAccessoryTransform,
  scaleAccessoryTransform,
} from './accessoryPlacementRules'
import type { AccessoryTransform, EquippedAccessoryInstance } from './accessoryTypes'

interface AccessoryEditorProps {
  instances: EquippedAccessoryInstance[]
  selectedId: string | null
  busy: boolean
  message: string | null
  maxInstances: number
  onSelect: (instanceId: string) => void
  onTransform: (instanceId: string, transform: AccessoryTransform) => void
  onRemove: (instanceId: string) => void
  onOpenShop: () => void
  onDone: () => void
}

const AXES: AccessoryAxis[] = ['x', 'y', 'z']

function axisLabel(axis: AccessoryAxis) {
  return axis.toUpperCase()
}

export function AccessoryEditor({
  instances,
  selectedId,
  busy,
  message,
  maxInstances,
  onSelect,
  onTransform,
  onRemove,
  onOpenShop,
  onDone,
}: AccessoryEditorProps) {
  const selected = instances.find((instance) => instance.id === selectedId) ?? instances[0] ?? null
  if (!selected) return null

  const transform: AccessoryTransform = {
    localPosition: selected.localPosition,
    localRotation: selected.localRotation,
    uniformScale: selected.uniformScale,
  }

  const applyNudge = (axis: AccessoryAxis, direction: -1 | 1) => {
    onTransform(selected.id, nudgeAccessoryTransform(transform, axis, ACCESSORY_NUDGE_STEP * direction))
  }

  const applyRotation = (axis: AccessoryAxis, direction: -1 | 1) => {
    onTransform(selected.id, rotateAccessoryTransform(transform, axis, ACCESSORY_ROTATION_STEP * direction))
  }

  const applyScale = (direction: -1 | 1) => {
    onTransform(
      selected.id,
      scaleAccessoryTransform(transform, ACCESSORY_SCALE_STEP * direction, selected.scaleMin, selected.scaleMax),
    )
  }

  return (
    <section
      className="accessory-editor"
      aria-label="Placement libre des accessoires"
      data-selected-accessory={selected.id}
      data-position={selected.localPosition.join(',')}
      data-rotation={selected.localRotation.join(',')}
      data-scale={selected.uniformScale.toFixed(3)}
    >
      <header className="accessory-editor-heading">
        <div>
          <p className="eyebrow">Placement libre</p>
          <h2>{selected.name}</h2>
          <p>{instances.length}/{maxInstances} instances sur ce caillou</p>
        </div>
        <button type="button" onClick={onDone} disabled={busy}>Terminer</button>
      </header>

      <div className="accessory-editor-instances" aria-label="Accessoires placés">
        {instances.map((instance, index) => (
          <button
            key={instance.id}
            type="button"
            className={instance.id === selected.id ? 'is-selected' : undefined}
            aria-pressed={instance.id === selected.id}
            aria-label={`Sélectionner ${instance.name} ${index + 1}`}
            disabled={busy}
            onClick={() => onSelect(instance.id)}
          >
            <img src={instance.previewPath} alt="" aria-hidden="true" />
            <span>{instance.name}</span>
          </button>
        ))}
      </div>

      <p className="accessory-editor-hint">
        Faites glisser l’objet pour un déplacement large. Les commandes X/Y/Z donnent le réglage précis, y compris en profondeur.
      </p>

      <div className="accessory-editor-control-grid">
        <fieldset>
          <legend>Position</legend>
          {AXES.map((axis) => (
            <div className="accessory-axis-row" key={`move-${axis}`}>
              <span>{axisLabel(axis)}</span>
              <button
                type="button"
                aria-label={`Déplacer ${axisLabel(axis)} négatif`}
                disabled={busy}
                onClick={() => applyNudge(axis, -1)}
              >−</button>
              <button
                type="button"
                aria-label={`Déplacer ${axisLabel(axis)} positif`}
                disabled={busy}
                onClick={() => applyNudge(axis, 1)}
              >+</button>
            </div>
          ))}
        </fieldset>

        <fieldset>
          <legend>Rotation fine</legend>
          {AXES.map((axis) => (
            <div className="accessory-axis-row" key={`rotate-${axis}`}>
              <span>{axisLabel(axis)}</span>
              <button
                type="button"
                aria-label={`Tourner ${axisLabel(axis)} négatif`}
                disabled={busy}
                onClick={() => applyRotation(axis, -1)}
              >−</button>
              <button
                type="button"
                aria-label={`Tourner ${axisLabel(axis)} positif`}
                disabled={busy}
                onClick={() => applyRotation(axis, 1)}
              >+</button>
            </div>
          ))}
        </fieldset>
      </div>

      <div className="accessory-editor-scale">
        <span>Taille</span>
        <button
          type="button"
          aria-label="Réduire l’accessoire"
          disabled={busy || selected.uniformScale <= selected.scaleMin}
          onClick={() => applyScale(-1)}
        >−</button>
        <output>{selected.uniformScale.toFixed(2)}×</output>
        <button
          type="button"
          aria-label="Agrandir l’accessoire"
          disabled={busy || selected.uniformScale >= selected.scaleMax}
          onClick={() => applyScale(1)}
        >+</button>
      </div>

      {message ? <p className="accessory-editor-message" role="status">{message}</p> : null}

      <footer className="accessory-editor-footer">
        <button type="button" onClick={onOpenShop} disabled={busy || instances.length >= maxInstances}>
          Ajouter un accessoire
        </button>
        <button
          type="button"
          className="is-danger"
          aria-label={`Retirer ${selected.name} du caillou`}
          onClick={() => onRemove(selected.id)}
          disabled={busy}
        >
          Retirer du caillou
        </button>
      </footer>
    </section>
  )
}

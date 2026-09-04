import { useEffect, useMemo, useState } from 'react'

import { loadAccessoryShop } from '../accessories/accessoryApi'
import { availableOwnedAccessories } from '../accessories/accessoryPlacementRules'
import type { AccessoryCatalogItem, AccessoryShopSnapshot, EquippedAccessoryInstance } from '../accessories/accessoryTypes'
import type { PlacementTarget, PlacementTool } from './placementTypes'

interface PlacementPanelProps {
  rockName: string
  permitUnlocked: boolean
  permitLoading: boolean
  instances: EquippedAccessoryInstance[]
  selectedTarget: PlacementTarget | null
  cameraSelected?: boolean
  lastObjectTarget?: PlacementTarget | null
  tool: PlacementTool
  busy: boolean
  message: string | null
  maxInstances: number
  onSelectRock: () => void
  onSelectCamera?: () => void
  onOpenPermitShop: () => void
  onSelectAccessory: (instanceId: string) => void
  onToolChange: (tool: PlacementTool) => void
  onAddOwned: (item: AccessoryCatalogItem) => Promise<void>
  onRemove: (instanceId: string) => void
  onCancel: () => void
  onDone: () => void
  loadShop?: () => Promise<AccessoryShopSnapshot>
}

export function PlacementPanel({
  rockName,
  permitUnlocked,
  permitLoading,
  instances,
  selectedTarget,
  cameraSelected = false,
  lastObjectTarget = null,
  tool,
  busy,
  message,
  maxInstances,
  onSelectRock,
  onSelectCamera,
  onOpenPermitShop,
  onSelectAccessory,
  onToolChange,
  onAddOwned,
  onRemove,
  onCancel,
  onDone,
  loadShop = loadAccessoryShop,
}: PlacementPanelProps) {
  const [owned, setOwned] = useState<AccessoryCatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setCatalogLoading(true)
    setCatalogError(null)
    void loadShop().then((snapshot) => {
      if (active) setOwned(snapshot.items.filter((item) => item.purchasedAt != null))
    }).catch((error) => {
      if (active) setCatalogError(error instanceof Error ? error.message : 'La collection possédée n’a pas pu être relue.')
    }).finally(() => {
      if (active) setCatalogLoading(false)
    })
    return () => {
      active = false
    }
  }, [loadShop])

  const availableOwned = useMemo(() => availableOwnedAccessories(owned, instances), [instances, owned])
  const selectedAccessory = selectedTarget?.kind === 'accessory'
    ? instances.find((instance) => instance.id === selectedTarget.instanceId) ?? null
    : null
  const capabilities = selectedTarget?.profile.capabilities ?? null
  const canAdd = instances.length < maxInstances && !busy && addingId === null
  const lastObjectLabel = lastObjectTarget?.kind === 'rock'
    ? rockName
    : lastObjectTarget?.kind === 'accessory'
      ? instances.find((instance) => instance.id === lastObjectTarget.instanceId)?.name ?? 'accessoire'
      : null

  const addOwned = async (item: AccessoryCatalogItem) => {
    if (!canAdd) return
    setAddingId(item.id)
    setCatalogError(null)
    try {
      await onAddOwned(item)
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'L’objet n’a pas pu être ajouté au draft.')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <section className="placement-panel" aria-label="Placement du caillou et des accessoires">
      <header className="placement-panel-heading">
        <div>
          <p className="eyebrow">Placement</p>
          <h2>{cameraSelected ? 'Caméra sélectionnée' : selectedTarget ? 'Cible sélectionnée' : 'Choisir une cible'}</h2>
          <p>{instances.length}/{maxInstances} accessoires dans le draft</p>
        </div>
        <button className="placement-finish" type="button" onClick={onDone} disabled={busy || addingId !== null}>Terminer</button>
        <button className="placement-cancel" type="button" onClick={onCancel} disabled={busy || addingId !== null}>Annuler</button>
      </header>

      <div className="placement-targets" aria-label="Objets disponibles">
        <button
          type="button"
          className={selectedTarget?.kind === 'rock' ? 'is-selected' : undefined}
          aria-pressed={selectedTarget?.kind === 'rock'}
          disabled={busy || permitLoading}
          onClick={permitUnlocked ? onSelectRock : onOpenPermitShop}
        >
          <span>
            <strong>{rockName}</strong>
            <small>Caillou</small>
          </span>
          <em>{permitLoading ? 'Vérification…' : permitUnlocked ? 'Disponible' : 'Permis requis pour ce caillou · Boutique'}</em>
        </button>

        {instances.map((instance) => (
          <button
            key={instance.id}
            type="button"
            className={selectedTarget?.kind === 'accessory' && selectedTarget.instanceId === instance.id ? 'is-selected' : undefined}
            aria-pressed={selectedTarget?.kind === 'accessory' && selectedTarget.instanceId === instance.id}
            disabled={busy}
            onClick={() => onSelectAccessory(instance.id)}
          >
            <img src={instance.previewPath} alt="" aria-hidden="true" />
            <span>
              <strong>{instance.name}</strong>
              <small>{instance.category} · Placée</small>
            </span>
          </button>
        ))}
      </div>

      {onSelectCamera ? (
        <div className="placement-targets" aria-label="Point de vue">
          <button
            type="button"
            className={cameraSelected ? 'is-selected' : undefined}
            aria-pressed={cameraSelected}
            disabled={busy}
            onClick={onSelectCamera}
          >
            <span>
              <strong>Caméra</strong>
              <small>Point de vue</small>
            </span>
            <em>Orbite · zoom</em>
          </button>
        </div>
      ) : null}

      {selectedTarget && capabilities ? (
        <div className="placement-tools" role="group" aria-label="Type de manipulation">
          {capabilities.canPosition ? (
            <button
              type="button"
              className={tool === 'position' ? 'is-active' : undefined}
              aria-pressed={tool === 'position'}
              disabled={busy}
              onClick={() => onToolChange('position')}
            >Position</button>
          ) : null}
          {capabilities.canRotate ? (
            <button
              type="button"
              className={tool === 'orientation' ? 'is-active' : undefined}
              aria-pressed={tool === 'orientation'}
              disabled={busy}
              onClick={() => onToolChange('orientation')}
            >Orientation</button>
          ) : null}
          {capabilities.canScale ? (
            <button
              type="button"
              className={tool === 'size' ? 'is-active' : undefined}
              aria-pressed={tool === 'size'}
              disabled={busy}
              onClick={() => onToolChange('size')}
            >Taille</button>
          ) : null}
        </div>
      ) : null}

      <p className="placement-hint">
        {cameraSelected
          ? `Caméra active : glissez pour tourner autour de la scène et pincez pour zoomer.${lastObjectLabel ? ` Dernière cible : ${lastObjectLabel}. Touchez-la dans la scène ou la liste pour reprendre.` : ''}`
          : !selectedTarget
            ? 'Touchez directement un objet dans la scène ou choisissez-le dans la liste. Ensuite, tout le canvas devient sa surface de contrôle.'
            : tool === 'position'
              ? 'Un doigt déplace dans le plan de vue. Deux doigts agissent sur la profondeur. Les collisions restent actives.'
              : tool === 'orientation'
                ? 'Un doigt oriente librement. Tournez deux doigts pour pivoter autour de la vue.'
                : 'Pincez à deux doigts pour redimensionner dans les limites homologuées.'}
      </p>

      <details className="placement-owned">
        <summary>Ajouter un objet possédé</summary>
        {catalogLoading ? <p>Lecture de la collection…</p> : catalogError ? <p role="alert">{catalogError}</p> : owned.length === 0 ? (
          <p>Aucun accessoire possédé à ajouter.</p>
        ) : availableOwned.length === 0 ? (
          <p>Tous les accessoires possédés sont déjà placés.</p>
        ) : (
          <div className="placement-owned-grid">
            {availableOwned.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={!canAdd}
                onClick={() => void addOwned(item)}
              >
                <img src={item.previewPath} alt="" aria-hidden="true" />
                <span>{item.name}</span>
                <small>{addingId === item.id ? 'Ajout au draft…' : instances.length >= maxInstances ? 'Limite atteinte' : 'Disponible · ajouter au draft'}</small>
              </button>
            ))}
          </div>
        )}
      </details>

      {selectedAccessory ? (
        <button
          type="button"
          className="placement-remove"
          disabled={busy}
          onClick={() => onRemove(selectedAccessory.id)}
        >Retirer {selectedAccessory.name} du draft</button>
      ) : null}

      {message ? <p className="placement-message" role="status">{message}</p> : null}
    </section>
  )
}

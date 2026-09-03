interface DiscardRockDialogProps {
  rockName: string
  onCancel: () => void
  onConfirm: () => void
}

export function DiscardRockDialog({ rockName, onCancel, onConfirm }: DiscardRockDialogProps) {
  return (
    <div className="pedestal-dialog-backdrop step11-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel()
    }}>
      <section
        className="pedestal-dialog discard-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-rock-title"
        aria-describedby="discard-rock-description"
      >
        <p className="eyebrow">Fin de responsabilité minérale</p>
        <h2 id="discard-rock-title">Jeter {rockName} ?</h2>
        <p id="discard-rock-description">
          Cette opération mettra fin à la composition minérale active. Le caillou et son historique resteront archivés.
          Vos Lithons, acquisitions et autorisations permanentes sont conservés. Les accessoires actuellement placés seront déséquipés.
        </p>
        <div className="discard-actions">
          <button type="button" className="discard-cancel" autoFocus onClick={onCancel}>Annuler</button>
          <button type="button" className="discard-confirm" onClick={onConfirm}>Jeter {rockName}</button>
        </div>
      </section>
    </div>
  )
}

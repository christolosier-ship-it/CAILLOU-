import { useEffect, useRef } from 'react'
import { LockKeyhole, X } from 'lucide-react'
import { NATURAL_APPEARANCE, PAINT_FINISHES, PAINT_PALETTE } from './paintRules'
import type { PaintFinish } from './paintRules'
import type { PaintController } from './usePaint'
import '../../styles/paint.css'

export function PaintPanel({ paint, onClose, onShop }: { paint: PaintController; onClose: () => void; onShop: () => void }) {
  const panel = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose); closeRef.current = onClose
  const busy = !!paint.pending
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); closeRef.current() } }
    window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('keydown', escape); previous?.focus() }
  }, [busy])
  const color = paint.appearance.color ?? PAINT_PALETTE[0].color
  const finish = paint.appearance.mode === 'solid' ? paint.appearance.finish : 'matte'
  const choose = (nextColor: string, nextFinish: PaintFinish = finish) => paint.preview({ version: 1, mode: 'solid', color: nextColor, finish: nextFinish })
  const locked = !paint.snapshot?.unlocked
  return <section ref={panel} className="paint-panel" role="dialog" aria-labelledby="paint-title" tabIndex={-1}>
    <header><div><p className="eyebrow">Traitement de surface</p><h2 id="paint-title">Peinture</h2></div>
      <button type="button" aria-label="Fermer la peinture" disabled={busy} onClick={onClose}><X size={20} /></button></header>
    {paint.loading ? <p role="status">Vérification de l’autorisation…</p> : null}
    {locked ? <div className="paint-locked"><LockKeyhole size={22} /><p>Peinture est verrouillée pour ce caillou. Son acquisition ne sera pas transférée au suivant.</p>
      <button type="button" onClick={onShop} disabled={!paint.online || paint.loading}>Voir Peinture en Boutique</button></div> : <>
      <fieldset disabled={busy || !!paint.retry}><legend>Couleur</legend><div className="paint-palette">
        {PAINT_PALETTE.map((swatch) => <button key={swatch.color} type="button" style={{ backgroundColor: swatch.color }}
          aria-label={swatch.name} title={swatch.name} aria-pressed={paint.appearance.mode === 'solid' && color === swatch.color} onClick={() => choose(swatch.color)} />)}
        <label className="paint-custom">Personnalisée<input aria-label="Couleur personnalisée" type="color" value={color} onChange={(e) => choose(e.target.value)} /></label>
      </div></fieldset>
      <fieldset disabled={busy || !!paint.retry}><legend>Finition</legend><div className="paint-finishes">
        {PAINT_FINISHES.map((item) => <button type="button" key={item.id} aria-pressed={paint.appearance.mode === 'solid' && finish === item.id} onClick={() => choose(color, item.id)}>{item.label}</button>)}
      </div></fieldset>
      <button type="button" className="paint-natural" aria-pressed={paint.appearance.mode === 'natural'} disabled={busy || !!paint.retry} onClick={() => paint.preview(NATURAL_APPEARANCE)}>Roche naturelle</button>
      <p className="paint-hint" role="status">{paint.dirty ? 'Aperçu local · non enregistré' : 'Dernier état confirmé'}{!paint.online ? ' · hors ligne' : ''}</p>
      <footer><button type="button" disabled={busy} onClick={onClose}>Annuler</button><button type="button" className="paint-apply" disabled={!paint.dirty || busy || !!paint.retry || !paint.online || !paint.confirmed} onClick={() => void paint.apply()}>{busy ? 'Confirmation…' : 'Appliquer'}</button></footer>
    </>}
    {paint.error ? <div className="paint-error" role="alert"><p>{paint.error}</p><button type="button" disabled={busy || !paint.online} onClick={() => void (paint.retry ? paint.retryLast() : paint.refresh())}>{paint.retry ? 'Réessayer la même opération' : 'Actualiser'}</button></div> : null}
    {paint.feedback ? <p role="status">{paint.feedback}</p> : null}
  </section>
}

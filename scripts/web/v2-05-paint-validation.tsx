import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Mesh } from 'three'
import type { Object3D, MeshStandardMaterial } from 'three'
import { getRockCatalogEntryById } from '../../src/content/rockCatalog'
import { AccessoryShop } from '../../src/features/accessories/AccessoryShop'
import { PaintPanel } from '../../src/features/paint/PaintPanel'
import { PaintError } from '../../src/features/paint/paintApi'
import type { PaintServices } from '../../src/features/paint/paintApi'
import { NATURAL_APPEARANCE } from '../../src/features/paint/paintRules'
import type { RockAppearance } from '../../src/features/paint/paintRules'
import { usePaint } from '../../src/features/paint/usePaint'
import { PlacementPhysicsWorld } from '../../src/features/placement/PlacementPhysicsWorld'
import type { PlacementTransform } from '../../src/features/placement/placementTypes'
import { RockSceneObject } from '../../src/scene/RockSceneObject'
import type { RockLoadState } from '../../src/scene/RockModel'
import '../../src/styles/global.css'
import '../../src/styles/accessories.css'
import '../../src/styles/adoption.css'
import '../../src/styles/showroom.css'

interface Server { balance: number; unlocks: string[]; appearances: Record<string, RockAppearance>; receipts: Record<string, unknown>; saves: number; purchases: number }
const read = (): Server => JSON.parse(localStorage.getItem('paint-server') ?? 'null') ?? { balance: 1000, unlocks: [], appearances: {}, receipts: {}, saves: 0, purchases: 0 }
const write = (s: Server) => localStorage.setItem('paint-server', JSON.stringify(s))
const services: PaintServices = {
  async userId() { return 'paint-browser-owner' },
  async load(rockId) { const s = read(); return { userId: 'paint-browser-owner', rockId, balance: s.balance, unlocked: s.unlocks.includes(rockId), appearance: s.appearances[rockId] ?? NATURAL_APPEARANCE, feature: { name: 'Peinture minérale', description: 'Couleur et finition réversibles. Ce caillou uniquement.', price: 250, active: true } } },
  async purchase(rockId, key) {
    const s = read()
    if (s.receipts[key]) return s.receipts[key] as { balance: number }
    if (s.unlocks.includes(rockId)) throw new PaintError('Déjà acquis', false)
    if (s.balance < 250) throw new PaintError('Solde insuffisant', false)
    s.unlocks.push(rockId); s.balance -= 250; s.purchases++; s.receipts[key] = { balance: s.balance }; write(s)
    return { balance: s.balance }
  },
  async save(rockId, appearance, key) {
    const s = read()
    if (!s.unlocks.includes(rockId)) throw new PaintError('Autorisation requise', false)
    if (s.receipts[key]) return s.appearances[rockId]!
    s.appearances[rockId] = appearance; s.receipts[key] = true; s.saves++; write(s)
    if (sessionStorage.getItem('paint-fail-once')) { sessionStorage.removeItem('paint-fail-once'); throw new PaintError('Confirmation non reçue.', true) }
    return appearance
  },
}
const EMPTY_TRANSFORM: PlacementTransform = { position: [0,0,0], rotation: [0,0,0,1], scale: 1 }
const loadAccessories = async () => ({ items: [] })
const ignore = () => {}
function Probe({ object }: { object: Object3D | null }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    window.__paintProbe = () => {
      const materials: { id: string; color: string; map: boolean; roughness: number; version: number }[] = []
      let dust = 0
      object?.traverse((child) => {
        if (!(child instanceof Mesh)) return
        if (child.name === 'CAILLOU_DUST_OVERLAY') { dust++; return }
        for (const m of (Array.isArray(child.material) ? child.material : [child.material]) as MeshStandardMaterial[]) materials.push({ id: m.uuid, color: m.color.getHexString(), map: !!m.map, roughness: m.roughness, version: m.version })
      })
      return { object: object?.uuid, collider: scene.getObjectByName('CAILLOU_DYNAMIC_HULL_COLLIDER')?.uuid,
        textures: gl.info.memory.textures, geometries: gl.info.memory.geometries, programs: gl.info.programs?.length, materials, dust }
    }
    return () => { delete window.__paintProbe }
  }, [object, gl, scene])
  return null
}
declare global { interface Window { __paintProbe?: () => Record<string, unknown> } }
function App() {
  const [rockId, setRockId] = useState(localStorage.getItem('paint-rock') ?? 'rock-a')
  const [specimen, setSpecimen] = useState('rock-016')
  const [balance, setBalance] = useState(read().balance)
  const [panel, setPanel] = useState(true); const [shop, setShop] = useState(false)
  const [object, setObject] = useState<Object3D | null>(null)
  const [loadState, setLoadState] = useState<RockLoadState>('loading')
  const [dust, setDust] = useState(.6)
  const [transform, setTransform] = useState(EMPTY_TRANSFORM)
  const [settling, setSettling] = useState(false)
  const paint = usePaint(rockId, setBalance, services)
  const settled = useCallback((next: PlacementTransform) => { setTransform(next); setSettling(false) }, [])
  const close = () => { paint.cancel(); setPanel(false) }
  return <div className={`pedestal-shell${panel ? ' is-paint-mode' : ''}`}>
    <header style={{ padding: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button id="open-paint" onClick={() => setPanel(true)}>Peinture</button>
      <button id="next-rock" onClick={() => { localStorage.setItem('paint-rock','rock-b'); setRockId('rock-b') }}>Nouveau caillou</button>
      <select id="specimen" aria-label="Spécimen" value={specimen} onChange={(e) => { setLoadState('loading'); setObject(null); setSpecimen(e.target.value) }}>{Array.from({ length: 20 }, (_, i) => `rock-${String(i+1).padStart(3,'0')}`).map((id) => <option key={id}>{id}</option>)}</select>
      <button id="drop-rock" onClick={() => { setTransform({ ...EMPTY_TRANSFORM, position: [0,1,0] }); setSettling(true) }}>Chute</button>
      <button id="dust-toggle" onClick={() => setDust((v) => v ? 0 : .6)}>Poussière</button>
    </header>
    <output id="paint-state" data-mode={paint.appearance.mode} data-color={paint.appearance.color ?? ''} data-finish={paint.appearance.finish}
      data-canonical={paint.canonical.mode} data-dirty={paint.dirty} data-unlocked={!!paint.snapshot?.unlocked} data-pending={!!paint.pending}
      data-load={loadState} data-ready={!!paint.snapshot && !paint.loading} data-settling={settling} data-y={transform.position[1]} data-saves={read().saves} data-online={paint.online}>
      {rockId} · {balance} Lithons
    </output>
    <section className="pedestal-stage" style={{ height: 760, minHeight: 760 }}>
      <div className="showroom-canvas"><Canvas shadows frameloop={settling ? 'always' : 'demand'} camera={{ position: [3.1,2.15,4.4], fov: 32 }} gl={{ preserveDrawingBuffer: true }}>
        <color attach="background" args={['#e5e1d8']} /><ambientLight intensity={.58} />
        <directionalLight position={[4.5,5.5,4.2]} intensity={2.45} castShadow /><directionalLight position={[-4.2,2.4,-2.5]} intensity={.72} />
        <Suspense fallback={null}><PlacementPhysicsWorld paused={!object}>
          <RockSceneObject rock={getRockCatalogEntryById(specimen)} retryKey={0} appearance={paint.appearance} bodyState={settling ? 'settling' : 'fixed'} transform={transform}
            dustAmount={dust} dustRevision={0} cleaningActive={false} surfaceInteractionActive={false} onLoadStateChange={setLoadState} onObjectReady={setObject}
            onPlacementGeometryReady={ignore} onSettled={settled} />
          <Probe object={object} />
        </PlacementPhysicsWorld></Suspense>
      </Canvas></div>
      {panel ? <PaintPanel paint={paint} onClose={close} onShop={() => { close(); setShop(true) }} /> : null}
    </section>
    {shop ? <AccessoryShop paint={paint} highlightPaint balance={balance} onBalanceChanged={setBalance} onPurchased={ignore} onClose={() => setShop(false)}
      permit={null} permitLoading={false} permitPending={false} permitError={null} onPermitPurchase={async () => false} loadShop={loadAccessories} /> : null}
  </div>
}
createRoot(document.getElementById('root')!).render(<App />)

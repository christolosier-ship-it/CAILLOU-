import { useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { getRockCatalogEntryById } from '../../src/content/rockCatalog'
import type { EquippedAccessoryInstance } from '../../src/features/accessories/accessoryTypes'
import { worldCompositionToPersistence } from '../../src/features/placement/placementPersistence'
import type { SettledWorldComposition } from '../../src/features/placement/placementPersistence'
import { buildPlacementSettlementPlan, createPlacementSession, updatePlacementSession } from '../../src/features/placement/placementSession'
import type { PlacementSessionState, PlacementSettlementPlan } from '../../src/features/placement/placementSession'
import type { PlacementTarget, PlacementTool } from '../../src/features/placement/placementTypes'
import type { RockCompositionDraft, RockPose } from '../../src/features/rockMovement/rockMovementTypes'
import { ShowroomScene } from '../../src/scene/ShowroomScene'
import '../../src/styles/global.css'
import '../../src/styles/showroom.css'
import '../../src/styles/adoption.css'
import '../../src/styles/accessories.css'
import '../../src/styles/accessory-placement.css'
import '../../src/styles/rock-movement.css'

const rock = getRockCatalogEntryById('rock-012')
const INITIAL_POSE: RockPose = {
  position: [0, 0.52, 0],
  rotation: [0, 0, 0, 1],
}
const ROCK_TARGET: PlacementTarget = { kind: 'rock' }

const INSTANCE: EquippedAccessoryInstance = {
  id: '105e0000-0000-4000-8000-000000000001',
  userRockId: '105e0000-0000-4000-8000-000000000099',
  accessoryId: 'monocle',
  category: 'visage',
  name: 'Monocle',
  modelPath: '/assets/accessories/monocle/model.glb',
  previewPath: '/assets/accessory-previews/monocle.png',
  scaleMin: 0.65,
  scaleMax: 1.35,
  triangleCount: 665,
  dimensions: [0.440386, 0.626706, 0.725703],
  physics: {
    enabled: true,
    dynamic: true,
    collider: 'convexHull',
    mass: 0.18,
    friction: 0.68,
    restitution: 0.06,
    linearDamping: 1.6,
    angularDamping: 2.1,
    gravityScale: 0.9,
    ccd: true,
  },
  equippedAt: '2026-09-02T09:00:00.000Z',
  updatedAt: '2026-09-02T09:00:00.000Z',
  stabilizedAt: '2026-09-02T09:00:00.000Z',
  localPosition: [0, 0.2, 0.72],
  localRotation: [0, 0, 0, 1],
  uniformScale: 1,
}

type Mode = 'placement' | 'settling' | 'orbit'

function Fixture() {
  const [mode, setMode] = useState<Mode>('placement')
  const [tool, setTool] = useState<PlacementTool>('position')
  const [pose, setPose] = useState<RockPose>(INITIAL_POSE)
  const [placementSession, setPlacementSession] = useState<PlacementSessionState>(() => createPlacementSession(INITIAL_POSE, [INSTANCE]))
  const [settlementPlan, setSettlementPlan] = useState<PlacementSettlementPlan | null>(null)
  const [settled, setSettled] = useState<RockCompositionDraft | null>(null)
  const [rockReady, setRockReady] = useState(false)
  const [accessoryReady, setAccessoryReady] = useState(false)

  const handleRockLoadState = useCallback((state: 'loading' | 'ready' | 'error') => {
    setRockReady(state === 'ready')
  }, [])

  const handleAccessoryLoadState = useCallback((_: string, state: 'loading' | 'ready' | 'error') => {
    setAccessoryReady(state === 'ready')
  }, [])


const handleRockDraft = useCallback((nextPose: RockPose) => {
  setPose(nextPose)
  setPlacementSession((current) => updatePlacementSession(current, ROCK_TARGET, {
    position: [...nextPose.position],
    rotation: [...nextPose.rotation],
    scale: 1,
  }))
}, [])

const handleSettled = useCallback((world: SettledWorldComposition) => {
  const draft = worldCompositionToPersistence(world)
  setSettled(draft)
  setPose(draft.rockPose)
  setPlacementSession(createPlacementSession(draft.rockPose, [
    { ...INSTANCE, ...(draft.accessories[0] ?? {}) },
  ]))
  setSettlementPlan(null)
  setMode('orbit')
}, [])

const requestSettlement = useCallback(() => {
  const plan = buildPlacementSettlementPlan(placementSession)
  if (!plan) return
  setSettlementPlan(plan)
  setMode('settling')
}, [placementSession])

  return (
    <div className={`pedestal-shell${mode === 'placement' ? ' is-placement-mode' : mode === 'settling' ? ' is-composition-settling' : ''}`}>
      <main className="pedestal-main">
        <section className="pedestal-stage">
          <ShowroomScene
            rock={rock}
            retryKey={0}
            reducedMotion={false}
            onLoadStateChange={handleRockLoadState}
            onInteractionChange={() => undefined}
            interactionMode={mode}
            rockPose={pose}
            onRockPoseDraft={handleRockDraft}
            onCompositionSettled={handleSettled}
            placementTarget={mode === 'orbit' ? null : ROCK_TARGET}
            placementTool={tool}
            placementSession={placementSession}
            settlementPlan={settlementPlan}
            accessories={[INSTANCE]}
            onAccessoryLoadStateChange={handleAccessoryLoadState}
          />
          <div className="rock-e2e-controls" style={{ position: 'absolute', zIndex: 30, left: 12, bottom: 12, display: 'flex', gap: 8 }}>
            <button type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => { setMode('placement'); setTool('position') }}>Position</button>
            <button type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => { setMode('placement'); setTool('orientation') }}>Orientation</button>
            <button type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={requestSettlement}>Lâcher</button>
          </div>
        </section>
      </main>
      <output
        id="rock-movement-e2e-state"
        hidden
        data-mode={mode}
        data-tool={tool}
        data-rock-ready={String(rockReady)}
        data-accessory-ready={String(accessoryReady)}
        data-settled={String(settled !== null)}
        data-rock-position={JSON.stringify(pose.position)}
        data-rock-rotation={JSON.stringify(pose.rotation)}
        data-accessories={JSON.stringify(settled?.accessories ?? [])}
      />
    </div>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing rock movement E2E fixture root')
createRoot(root).render(<Fixture />)
from pathlib import Path

# --- Rock movement fixture ---
path = Path('scripts/web/rock-movement-e2e-validation.tsx')
text = path.read_text()
text = text.replace(
    "import type { SettledWorldComposition } from '../../src/features/placement/placementPersistence'\n",
    "import type { SettledWorldComposition } from '../../src/features/placement/placementPersistence'\nimport { buildPlacementSettlementPlan, createPlacementSession, updatePlacementSession } from '../../src/features/placement/placementSession'\nimport type { PlacementSessionState, PlacementSettlementPlan } from '../../src/features/placement/placementSession'\n",
    1,
)
text = text.replace(
    "  const [settled, setSettled] = useState<RockCompositionDraft | null>(null)\n",
    "  const [placementSession, setPlacementSession] = useState<PlacementSessionState>(() => createPlacementSession(INITIAL_POSE, [INSTANCE]))\n  const [settlementPlan, setSettlementPlan] = useState<PlacementSettlementPlan | null>(null)\n  const [settled, setSettled] = useState<RockCompositionDraft | null>(null)\n",
    1,
)
old = """const handleSettled = useCallback((world: SettledWorldComposition) => {
  const draft = worldCompositionToPersistence(world)
  setSettled(draft)
  setPose(draft.rockPose)
  setMode('orbit')
}, [])
"""
new = """const handleRockDraft = useCallback((nextPose: RockPose) => {
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
"""
if old not in text:
    raise SystemExit('rock fixture settled anchor missing')
text = text.replace(old, new, 1)
text = text.replace('            onRockPoseDraft={setPose}\n', '            onRockPoseDraft={handleRockDraft}\n', 1)
text = text.replace(
    '            placementTool={tool}\n            accessories={[INSTANCE]}\n',
    '            placementTool={tool}\n            placementSession={placementSession}\n            settlementPlan={settlementPlan}\n            accessories={[INSTANCE]}\n',
    1,
)
text = text.replace(
    '<button type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => setMode(\'settling\')}>Lâcher</button>',
    '<button type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={requestSettlement}>Lâcher</button>',
    1,
)
path.write_text(text)

# --- Multi-accessory fixture ---
path = Path('scripts/web/accessory-placement-e2e-validation.tsx')
text = path.read_text()
text = text.replace(
    "import { worldAccessoryToPersistence } from '../../src/features/placement/placementPersistence'\n",
    "import { worldAccessoryToPersistence } from '../../src/features/placement/placementPersistence'\nimport type { SettledWorldComposition } from '../../src/features/placement/placementPersistence'\nimport { buildPlacementSettlementPlan, createPlacementSession, removePlacementSessionAccessory, updatePlacementSession } from '../../src/features/placement/placementSession'\nimport type { PlacementSessionState, PlacementSettlementPlan } from '../../src/features/placement/placementSession'\n",
    1,
)
text = text.replace(
    "  const [draftCount, setDraftCount] = useState(0)\n  const [saveCount, setSaveCount] = useState(0)\n",
    "  const [draftCount, setDraftCount] = useState(0)\n  const [placementSession, setPlacementSession] = useState<PlacementSessionState>(() => createPlacementSession(DEFAULT_ROCK_POSE, INITIAL_INSTANCES))\n  const [settlementPlan, setSettlementPlan] = useState<PlacementSettlementPlan | null>(null)\n  const [saveCount, setSaveCount] = useState(0)\n",
    1,
)
old_draft = """  const handleDraft = useCallback(() => {
    setDraftCount((current) => current + 1)
  }, [])

  const handleSettled = useCallback((instanceId: string, transform: PlacementTransform) => {
    const persisted = worldAccessoryToPersistence(instanceId, transform, DEFAULT_ROCK_POSE)
    const commit = (current: EquippedAccessoryInstance[]) => current.map((instance) => instance.id === instanceId
      ? {
          ...instance,
          ...persisted,
          updatedAt: '2026-09-02T20:00:00.000Z',
          stabilizedAt: '2026-09-02T20:00:00.000Z',
        }
      : instance)
    setInstances(commit)
    serverInstances.current = commit(serverInstances.current)
    setSaveCount((current) => current + 1)
    setMode('orbit')
  }, [])
"""
new_draft = """  const handleDraft = useCallback((instanceId: string, transform: PlacementTransform) => {
    setPlacementSession((current) => updatePlacementSession(current, { kind: 'accessory', instanceId }, transform))
    setDraftCount((current) => current + 1)
  }, [])

  const commitSettledAccessories = useCallback((world: SettledWorldComposition) => {
    const dirtyIds = new Set(settlementPlan?.accessoryIds ?? [])
    const worldById = new Map(world.accessories.map((accessory) => [accessory.instanceId, accessory.transform]))
    const commit = (current: EquippedAccessoryInstance[]) => current.map((instance) => {
      if (!dirtyIds.has(instance.id)) return instance
      const transform = worldById.get(instance.id)
      if (!transform) return instance
      const persisted = worldAccessoryToPersistence(instance.id, transform, DEFAULT_ROCK_POSE)
      return {
        ...instance,
        ...persisted,
        updatedAt: '2026-09-02T20:00:00.000Z',
        stabilizedAt: '2026-09-02T20:00:00.000Z',
      }
    })
    const next = commit(serverInstances.current)
    serverInstances.current = cloneInstances(next)
    setInstances(cloneInstances(next))
    setPlacementSession(createPlacementSession(DEFAULT_ROCK_POSE, next))
    setSaveCount((current) => current + dirtyIds.size)
    setSettlementPlan(null)
    setMode('orbit')
  }, [settlementPlan])

  const handleSettled = useCallback((instanceId: string, transform: PlacementTransform) => {
    setPlacementSession((current) => updatePlacementSession(current, { kind: 'accessory', instanceId }, transform))
  }, [])

  const requestSettlement = useCallback(() => {
    const plan = buildPlacementSettlementPlan(placementSession)
    if (!plan) return
    setSettlementPlan(plan)
    setMode('settling')
  }, [placementSession])
"""
if old_draft not in text:
    raise SystemExit('multi fixture draft anchor missing')
text = text.replace(old_draft, new_draft, 1)

old_remove = """    setInstances(cloneInstances(next))
    setSelectedId(next[0]?.id ?? '')
    setMode('orbit')
"""
new_remove = """    setInstances(cloneInstances(next))
    setPlacementSession((current) => removePlacementSessionAccessory(current, instanceId))
    setSelectedId(next[0]?.id ?? '')
    setMode('orbit')
"""
if old_remove not in text:
    raise SystemExit('multi fixture remove anchor missing')
text = text.replace(old_remove, new_remove, 1)

old_reload = """      setInstances(canonical)
      setSelectedId(canonical[0]?.id ?? '')
      setTool('position')
      setMode('placement')
"""
new_reload = """      setInstances(canonical)
      setPlacementSession(createPlacementSession(DEFAULT_ROCK_POSE, canonical))
      setSettlementPlan(null)
      setSelectedId(canonical[0]?.id ?? '')
      setTool('position')
      setMode('placement')
"""
if old_reload not in text:
    raise SystemExit('multi fixture reload anchor missing')
text = text.replace(old_reload, new_reload, 1)

text = text.replace(
    "            placementTool={tool}\n            accessories={instances}\n",
    "            placementTool={tool}\n            placementSession={placementSession}\n            settlementPlan={settlementPlan}\n            accessories={instances}\n",
    1,
)
text = text.replace(
    "            onAccessorySettled={handleSettled}\n            onAccessoryLoadStateChange={handleLoadState}\n",
    "            onAccessorySettled={handleSettled}\n            onCompositionSettled={commitSettledAccessories}\n            onAccessoryLoadStateChange={handleLoadState}\n",
    1,
)
text = text.replace(
    '<button id="placement-settle" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => setMode(\'settling\')}>Lâcher</button>',
    '<button id="placement-settle" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={requestSettlement}>Lâcher</button>',
    1,
)
path.write_text(text)

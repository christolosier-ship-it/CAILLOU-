from pathlib import Path

path = Path('scripts/web/accessory-physics-e2e-validation.tsx')
text = path.read_text()

text = text.replace(
    "import type { PlacementTool, PlacementTransform } from '../../src/features/placement/placementTypes'\n",
    "import type { SettledWorldComposition } from '../../src/features/placement/placementPersistence'\nimport { buildPlacementSettlementPlan, createPlacementSession, updatePlacementSession } from '../../src/features/placement/placementSession'\nimport type { PlacementSessionState, PlacementSettlementPlan } from '../../src/features/placement/placementSession'\nimport type { PlacementTool, PlacementTransform } from '../../src/features/placement/placementTypes'\n",
    1,
)
text = text.replace(
    "import { DEFAULT_ROCK_POSE, accessoryLocalToWorld } from '../../src/features/rockMovement/rockMovementRules'\n",
    "import { DEFAULT_ROCK_POSE } from '../../src/features/rockMovement/rockMovementRules'\n",
    1,
)

old_state = """  const [loadedIds, setLoadedIds] = useState<string[]>([])
  const [draftCount, setDraftCount] = useState(0)
  const [lastDraft, setLastDraft] = useState<{ instanceId: string; transform: PlacementTransform } | null>(null)
  const [settledCount, setSettledCount] = useState(0)
  const [lastSettled, setLastSettled] = useState<{ instanceId: string; transform: PlacementTransform } | null>(null)
  const [probe, setProbe] = useState({ collision: 0, settled: false, finalY: 1 })

  const selectedWorld = useMemo(() => {
    if (lastDraft?.instanceId === selectedId) return lastDraft.transform
    const instance = INITIAL_INSTANCES.find((candidate) => candidate.id === selectedId)
    if (!instance) return null
    const world = accessoryLocalToWorld(instance.id, instance, DEFAULT_ROCK_POSE)
    return {
      position: world.worldPosition,
      rotation: world.worldRotation,
      scale: world.uniformScale,
    }
  }, [lastDraft, selectedId])

  const select = useCallback((instanceId: string) => {
    setSelectedId(instanceId)
    setTool('position')
    setMode('placement')
    setLastDraft(null)
  }, [])

  const handleDraft = useCallback((instanceId: string, transform: PlacementTransform) => {
    setLastDraft({ instanceId, transform })
    setDraftCount((current) => current + 1)
  }, [])

  const handleSettled = useCallback((instanceId: string, transform: PlacementTransform) => {
    setLastSettled({ instanceId, transform })
    setSettledCount((current) => current + 1)
    setLastDraft({ instanceId, transform })
    setMode('orbit')
  }, [])
"""
new_state = """  const [loadedIds, setLoadedIds] = useState<string[]>([])
  const [draftCount, setDraftCount] = useState(0)
  const [placementSession, setPlacementSession] = useState<PlacementSessionState>(() => createPlacementSession(DEFAULT_ROCK_POSE, INITIAL_INSTANCES))
  const [settlementPlan, setSettlementPlan] = useState<PlacementSettlementPlan | null>(null)
  const [settledCount, setSettledCount] = useState(0)
  const [lastSettled, setLastSettled] = useState<{ instanceId: string; transform: PlacementTransform } | null>(null)
  const [probe, setProbe] = useState({ collision: 0, settled: false, finalY: 1 })

  const selectedWorld = useMemo(() => placementSession.accessories[selectedId] ?? null, [placementSession, selectedId])

  const select = useCallback((instanceId: string) => {
    setSelectedId(instanceId)
    setTool('position')
    setMode('placement')
  }, [])

  const handleDraft = useCallback((instanceId: string, transform: PlacementTransform) => {
    setPlacementSession((current) => updatePlacementSession(current, { kind: 'accessory', instanceId }, transform))
    setDraftCount((current) => current + 1)
  }, [])

  const handleSettled = useCallback((instanceId: string, transform: PlacementTransform) => {
    setLastSettled({ instanceId, transform })
    setPlacementSession((current) => updatePlacementSession(current, { kind: 'accessory', instanceId }, transform))
    setSettledCount((current) => current + 1)
  }, [])

  const handleCompositionSettled = useCallback((world: SettledWorldComposition) => {
    const plannedIds = settlementPlan?.accessoryIds ?? []
    const lastId = plannedIds.at(-1)
    const last = world.accessories.find((candidate) => candidate.instanceId === lastId)
    if (last) setLastSettled({ instanceId: last.instanceId, transform: last.transform })
    if (plannedIds.length > 0) setSettledCount((current) => current + plannedIds.length)
    setPlacementSession((current) => {
      let next = current
      for (const accessory of world.accessories) {
        next = updatePlacementSession(next, { kind: 'accessory', instanceId: accessory.instanceId }, accessory.transform)
      }
      return { ...next, dirtyRock: false, dirtyAccessoryIds: [] }
    })
    setSettlementPlan(null)
    setMode('orbit')
  }, [settlementPlan])

  const requestSettlement = useCallback(() => {
    const plan = buildPlacementSettlementPlan(placementSession)
    if (!plan) return
    setSettlementPlan(plan)
    setMode('settling')
  }, [placementSession])
"""
if old_state not in text:
    raise SystemExit('physics fixture state anchor missing')
text = text.replace(old_state, new_state, 1)

text = text.replace(
    "            placementTool={tool}\n            accessories={INITIAL_INSTANCES}\n",
    "            placementTool={tool}\n            placementSession={placementSession}\n            settlementPlan={settlementPlan}\n            accessories={INITIAL_INSTANCES}\n",
    1,
)
text = text.replace(
    "            onAccessoryPlacementDraft={handleDraft}\n            onAccessorySettled={handleSettled}\n",
    "            onAccessoryPlacementDraft={handleDraft}\n            onAccessorySettled={handleSettled}\n            onCompositionSettled={handleCompositionSettled}\n",
    1,
)
text = text.replace(
    "            <button id=\"physics-settle\" type=\"button\" style={{ minWidth: 44, minHeight: 44 }} onClick={() => setMode('settling')}>Lâcher</button>\n",
    "            <button id=\"physics-settle\" type=\"button\" style={{ minWidth: 44, minHeight: 44 }} onClick={requestSettlement}>Lâcher</button>\n",
    1,
)
text = text.replace(
    "        data-last-settled-rotation={JSON.stringify(lastSettled?.transform.rotation ?? null)}\n",
    "        data-last-settled-rotation={JSON.stringify(lastSettled?.transform.rotation ?? null)}\n        data-session-accessories={JSON.stringify(placementSession.accessories)}\n",
    1,
)
path.write_text(text)

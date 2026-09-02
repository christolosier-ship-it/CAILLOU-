from pathlib import Path

path = Path('scripts/web/placement-unified-e2e-validation.tsx')
text = path.read_text()

text = text.replace(
    "import type { SettledWorldComposition } from '../../src/features/placement/placementPersistence'\n",
    "import type { SettledWorldComposition } from '../../src/features/placement/placementPersistence'\nimport {\n  addPlacementSessionAccessory,\n  buildPlacementSettlementPlan,\n  createPlacementSession,\n  removePlacementSessionAccessory,\n  updatePlacementSession,\n} from '../../src/features/placement/placementSession'\nimport type { PlacementSessionState, PlacementSettlementPlan } from '../../src/features/placement/placementSession'\n",
    1,
)
text = text.replace("import { accessoryLocalToWorld } from '../../src/features/rockMovement/rockMovementRules'\n", '')

needle = "const SHOP: AccessoryShopSnapshot = { items: [MONOCLE] }\n"
insert = """const INITIAL_INSTANCES: EquippedAccessoryInstance[] = [
  makeInstance('10750000-0000-4000-8000-000000000001', 0),
]

const SHOP: AccessoryShopSnapshot = { items: [MONOCLE] }
"""
if needle not in text:
    raise SystemExit('initial instances anchor missing')
text = text.replace(needle, insert, 1)

old_states = """  const [instances, setInstances] = useState<EquippedAccessoryInstance[]>([
    makeInstance('10750000-0000-4000-8000-000000000001', 0),
  ])
  const [settled, setSettled] = useState<RockCompositionDraft | null>(null)
  const [rockReady, setRockReady] = useState(false)
  const [readyAccessories, setReadyAccessories] = useState<string[]>([])
  const [individualSettled, setIndividualSettled] = useState(0)
  const [selectedWorldDraft, setSelectedWorldDraft] = useState<PlacementTransform | null>(null)
  const [lastSettledWorld, setLastSettledWorld] = useState<{ instanceId: string; transform: PlacementTransform } | null>(null)

  const selectedAccessoryId = target?.kind === 'accessory' ? target.instanceId : null
  const selectedWorld = useMemo(() => {
    if (!selectedAccessoryId) return null
    const instance = instances.find((candidate) => candidate.id === selectedAccessoryId)
    if (selectedWorldDraft) return { instanceId: selectedAccessoryId, worldPosition: selectedWorldDraft.position, worldRotation: selectedWorldDraft.rotation, uniformScale: selectedWorldDraft.scale }
    return instance ? accessoryLocalToWorld(instance.id, instance, pose) : null
  }, [instances, pose, selectedAccessoryId, selectedWorldDraft])
"""
new_states = """  const [instances, setInstances] = useState<EquippedAccessoryInstance[]>(INITIAL_INSTANCES)
  const [placementSession, setPlacementSession] = useState<PlacementSessionState | null>(() => createPlacementSession(INITIAL_POSE, INITIAL_INSTANCES))
  const [settlementPlan, setSettlementPlan] = useState<PlacementSettlementPlan | null>(null)
  const [settled, setSettled] = useState<RockCompositionDraft | null>(null)
  const [rockReady, setRockReady] = useState(false)
  const [readyAccessories, setReadyAccessories] = useState<string[]>([])
  const [individualSettled, setIndividualSettled] = useState(0)
  const [lastSettledWorld, setLastSettledWorld] = useState<{ instanceId: string; transform: PlacementTransform } | null>(null)

  const selectedAccessoryId = target?.kind === 'accessory' ? target.instanceId : null
  const selectedWorld = useMemo(() => {
    if (!selectedAccessoryId || !placementSession) return null
    const transform = placementSession.accessories[selectedAccessoryId]
    return transform ? {
      instanceId: selectedAccessoryId,
      worldPosition: transform.position,
      worldRotation: transform.rotation,
      uniformScale: transform.scale,
    } : null
  }, [placementSession, selectedAccessoryId])
"""
if old_states not in text:
    raise SystemExit('fixture state anchor missing')
text = text.replace(old_states, new_states, 1)

old_callbacks = """const handleWorldDraft = useCallback((_: string, transform: PlacementTransform) => {
  setSelectedWorldDraft(transform)
}, [])
const handleIndividualSettled = useCallback((instanceId: string, transform: PlacementTransform) => {
  setLastSettledWorld({ instanceId, transform })
  const local = worldAccessoryToPersistence(instanceId, transform, pose)
  setInstances((current) => current.map((instance) => instance.id === instanceId
    ? { ...instance, ...local, stabilizedAt: '2026-09-02T08:30:00.000Z' }
    : instance))
  setSelectedWorldDraft(null)
  setIndividualSettled((current) => current + 1)
  setTarget(null)
  setMode('orbit')
}, [pose])

const handleDone = useCallback(() => {
  setMode(target ? 'settling' : 'orbit')
}, [target])
const handleComposition = useCallback((world: SettledWorldComposition) => {
  const draft: RockCompositionDraft = worldCompositionToPersistence(world)
  setSettled(draft)
  setPose(draft.rockPose)
  setInstances((current) => current.map((instance) => {
    const next = draft.accessories.find((candidate) => candidate.instanceId === instance.id)
    return next ? { ...instance, ...next, stabilizedAt: '2026-09-02T08:31:00.000Z' } : instance
  }))
  setTarget(null)
  setMode('orbit')
}, [])
  const reopenPlacement = useCallback(() => {
    setSelectedWorldDraft(null)
    setTarget(null)
    setTool('position')
    setMode('placement')
  }, [])
"""
new_callbacks = """const handleRockDraft = useCallback((nextPose: RockPose) => {
  setPose(nextPose)
  setPlacementSession((current) => current ? updatePlacementSession(current, { kind: 'rock' }, {
    position: [...nextPose.position],
    rotation: [...nextPose.rotation],
    scale: 1,
  }) : current)
}, [])

const handleWorldDraft = useCallback((instanceId: string, transform: PlacementTransform) => {
  setPlacementSession((current) => current
    ? updatePlacementSession(current, { kind: 'accessory', instanceId }, transform)
    : current)
}, [])

const handleIndividualSettled = useCallback((instanceId: string, transform: PlacementTransform) => {
  setLastSettledWorld({ instanceId, transform })
  const local = worldAccessoryToPersistence(instanceId, transform, pose)
  setInstances((current) => current.map((instance) => instance.id === instanceId
    ? { ...instance, ...local, stabilizedAt: '2026-09-02T08:30:00.000Z' }
    : instance))
  setIndividualSettled((current) => current + 1)
}, [pose])

const handleDone = useCallback(() => {
  const plan = buildPlacementSettlementPlan(placementSession)
  if (!plan) {
    setMode('orbit')
    return
  }
  setSettlementPlan(plan)
  setMode('settling')
}, [placementSession])

const handleComposition = useCallback((world: SettledWorldComposition) => {
  const draft: RockCompositionDraft = worldCompositionToPersistence(world)
  if (settlementPlan && !settlementPlan.rock) {
    const lastId = settlementPlan.accessoryIds.at(-1)
    const last = world.accessories.find((candidate) => candidate.instanceId === lastId)
    if (last) setLastSettledWorld({ instanceId: last.instanceId, transform: last.transform })
    setIndividualSettled((current) => current + settlementPlan.accessoryIds.length)
  }
  setSettled(draft)
  setPose(draft.rockPose)
  setInstances((current) => current.map((instance) => {
    const next = draft.accessories.find((candidate) => candidate.instanceId === instance.id)
    return next ? { ...instance, ...next, stabilizedAt: '2026-09-02T08:31:00.000Z' } : instance
  }))
  setPlacementSession(null)
  setSettlementPlan(null)
  setTarget(null)
  setMode('orbit')
}, [settlementPlan])

  const reopenPlacement = useCallback(() => {
    setPlacementSession(createPlacementSession(pose, instances))
    setSettlementPlan(null)
    setTarget(null)
    setTool('position')
    setMode('placement')
  }, [instances, pose])
"""
if old_callbacks not in text:
    raise SystemExit('fixture callbacks anchor missing')
text = text.replace(old_callbacks, new_callbacks, 1)

text = text.replace('            onRockPoseDraft={setPose}\n', '            onRockPoseDraft={handleRockDraft}\n', 1)
text = text.replace(
    '            placementTool={tool}\n            accessories={instances}\n',
    '            placementTool={tool}\n            placementSession={placementSession}\n            settlementPlan={settlementPlan}\n            accessories={instances}\n',
    1,
)

old_add = """                setInstances((current) => [...current, created])
                setTarget({ kind: 'accessory', instanceId: id })
"""
new_add = """                setInstances((current) => [...current, created])
                setPlacementSession((current) => current ? addPlacementSessionAccessory(current, created) : current)
                setTarget({ kind: 'accessory', instanceId: id })
"""
if old_add not in text:
    raise SystemExit('fixture add anchor missing')
text = text.replace(old_add, new_add, 1)
text = text.replace(
    '              onRemove={(instanceId) => setInstances((current) => current.filter((instance) => instance.id !== instanceId))}\n',
    "              onRemove={(instanceId) => {\n                setInstances((current) => current.filter((instance) => instance.id !== instanceId))\n                setPlacementSession((current) => current ? removePlacementSessionAccessory(current, instanceId) : current)\n              }}\n",
    1,
)

output_anchor = """        data-instance-count={String(instances.length)}
        data-selected-world-position={JSON.stringify(selectedWorld?.worldPosition ?? null)}
"""
output_replace = """        data-instance-count={String(instances.length)}
        data-session-accessories={JSON.stringify(placementSession?.accessories ?? {})}
        data-session-dirty-rock={String(placementSession?.dirtyRock ?? false)}
        data-session-dirty-accessories={JSON.stringify(placementSession?.dirtyAccessoryIds ?? [])}
        data-selected-world-position={JSON.stringify(selectedWorld?.worldPosition ?? null)}
"""
if output_anchor not in text:
    raise SystemExit('fixture output anchor missing')
text = text.replace(output_anchor, output_replace, 1)
path.write_text(text)

path = Path('scripts/web/validate-placement-unified-e2e.mjs')
text = path.read_text()

state_anchor = """    instanceCount: Number(element.getAttribute('data-instance-count') ?? 0),
    selectedWorldPosition: JSON.parse(element.getAttribute('data-selected-world-position') ?? 'null'),
"""
state_replace = """    instanceCount: Number(element.getAttribute('data-instance-count') ?? 0),
    sessionAccessories: JSON.parse(element.getAttribute('data-session-accessories') ?? '{}'),
    sessionDirtyRock: element.getAttribute('data-session-dirty-rock') === 'true',
    sessionDirtyAccessories: JSON.parse(element.getAttribute('data-session-dirty-accessories') ?? '[]'),
    selectedWorldPosition: JSON.parse(element.getAttribute('data-selected-world-position') ?? 'null'),
"""
if state_anchor not in text:
    raise SystemExit('mjs state anchor missing')
text = text.replace(state_anchor, state_replace, 1)

rock_move_anchor = """  const beforeRockMove = await state()
  await dispatchSinglePointer(62, -38)
  await page.waitForFunction((before) => {
    const value = JSON.parse(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-rock-position') ?? '[0,0,0]')
    return value.some((entry, index) => Math.abs(entry - before[index]) > 0.005)
  }, {}, beforeRockMove.rockPosition)


for (const [dx, dy] of [[900, 0], [-900, 0], [0, 900], [0, -900]]) {
"""
rock_move_replace = """  const beforeRockMove = await state()
  const accessoriesBeforeRockMove = JSON.stringify(beforeRockMove.sessionAccessories)
  await dispatchSinglePointer(62, -38)
  await page.waitForFunction((before) => {
    const value = JSON.parse(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-rock-position') ?? '[0,0,0]')
    return value.some((entry, index) => Math.abs(entry - before[index]) > 0.005)
  }, {}, beforeRockMove.rockPosition)
  const afterRockMove = await state()
  if (!afterRockMove.sessionDirtyRock) throw new Error('rock draft was not marked dirty in PlacementSession')
  if (JSON.stringify(afterRockMove.sessionAccessories) !== accessoriesBeforeRockMove) {
    throw new Error('moving the rock changed accessory world drafts during editing')
  }


for (const [dx, dy] of [[900, 0], [-900, 0], [0, 900], [0, -900]]) {
"""
if rock_move_anchor not in text:
    raise SystemExit('mjs rock move anchor missing')
text = text.replace(rock_move_anchor, rock_move_replace, 1)

switch_anchor = """const rockAfterTwist = await state()
assertInsidePedestal('during rock two-finger twist', ROCK_018_SUPPORT_POINTS, rockAfterTwist.rockPosition, rockAfterTwist.rockRotation)

  await page.click('.placement-panel-heading > button')
"""
switch_replace = """const rockAfterTwist = await state()
assertInsidePedestal('during rock two-finger twist', ROCK_018_SUPPORT_POINTS, rockAfterTwist.rockPosition, rockAfterTwist.rockRotation)

  // Regression #31: switching targets must retain every draft and rock edits must not drag accessories.
  await page.click('.placement-targets > button:nth-child(2)')
  await page.waitForFunction(() => (document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-target') ?? '').includes('000000000001'))
  const accessoryBeforeCrossTargetDraft = await state()
  await dispatchSinglePointer(74, -31, 0.12, 0.16)
  await page.waitForFunction((before) => {
    const value = JSON.parse(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-selected-world-position') ?? 'null')
    return Array.isArray(value) && value.some((entry, index) => Math.abs(entry - before[index]) > 0.005)
  }, {}, accessoryBeforeCrossTargetDraft.selectedWorldPosition)
  const accessoryDraftBeforeSwitch = await state()
  const draftedAccessoryId = accessoryDraftBeforeSwitch.target
  if (!accessoryDraftBeforeSwitch.sessionDirtyAccessories.includes(draftedAccessoryId)) {
    throw new Error('accessory draft was not retained by PlacementSession')
  }

  await page.click('.placement-targets > button:first-child')
  await page.waitForFunction(() => document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-target') === 'rock')
  const rockAfterTargetSwitch = await state()
  assertVectorClose('rock draft survives accessory switch', rockAfterTargetSwitch.rockPosition, rockAfterTwist.rockPosition)
  assertQuaternionEquivalent('rock orientation survives accessory switch', rockAfterTargetSwitch.rockRotation, rockAfterTwist.rockRotation)
  assertVectorClose(
    'accessory world draft remains cached while rock is active',
    rockAfterTargetSwitch.sessionAccessories[draftedAccessoryId]?.position,
    accessoryDraftBeforeSwitch.selectedWorldPosition,
  )

  await page.click('.placement-targets > button:nth-child(2)')
  await page.waitForFunction((instanceId) => document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-target') === instanceId, {}, draftedAccessoryId)
  const accessoryAfterReturn = await state()
  assertVectorClose('accessory draft survives target round-trip', accessoryAfterReturn.selectedWorldPosition, accessoryDraftBeforeSwitch.selectedWorldPosition)
  assertQuaternionEquivalent('accessory rotation survives target round-trip', accessoryAfterReturn.selectedWorldRotation, accessoryDraftBeforeSwitch.selectedWorldRotation)

  await page.click('.placement-panel-heading > button')
"""
if switch_anchor not in text:
    raise SystemExit('mjs cross-target anchor missing')
text = text.replace(switch_anchor, switch_replace, 1)

report_anchor = """    sharedCanvasPositionGesture: true,
    fourBorderStressRock: true,
"""
report_replace = """    sharedCanvasPositionGesture: true,
    rockMoveLeavesAccessoryDraftsFixed: true,
    crossTargetDraftRetention: true,
    fourBorderStressRock: true,
"""
if report_anchor not in text:
    raise SystemExit('mjs report anchor missing')
text = text.replace(report_anchor, report_replace, 1)
path.write_text(text)

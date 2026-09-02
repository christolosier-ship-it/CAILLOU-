from pathlib import Path
import re

path = Path('src/features/pedestal/Pedestal.tsx')
text = path.read_text()

old_select = '''  const selectRockForPlacement = useCallback(() => {
    if (mutationBlocked) return
    if (!rockPermit.unlocked) {
      openShop('permit')
      return
    }
    canonicalRockPoseRef.current = rockPose
    setSelectedAccessoryId(null)
    setPlacementTarget({ kind: 'rock' })
    setPlacementTool('position')
    setRockMovementError(null)
  }, [mutationBlocked, openShop, rockPermit.unlocked, rockPose])
'''
new_select = '''  const selectRockForPlacement = useCallback(() => {
    if (mutationBlocked) return
    if (!rockPermit.unlocked) {
      openShop('permit')
      return
    }
    setSelectedAccessoryId(null)
    setPlacementTarget({ kind: 'rock' })
    setPlacementTool('position')
    setRockMovementError(null)
  }, [mutationBlocked, openShop, rockPermit.unlocked])
'''
if old_select not in text:
    raise SystemExit('select rock anchor missing')
text = text.replace(old_select, new_select, 1)

pattern = re.compile(
    r"const handleCompositionSettled = useCallback\(\(composition: SettledWorldComposition\) => \{.*?\n\]\)\n\n  const handleAccessoryLoadState",
    re.S,
)
match = pattern.search(text)
if not match:
    raise SystemExit('composition settled block missing')

replacement = '''const handleCompositionSettled = useCallback((composition: SettledWorldComposition) => {
  if (compositionPending || !settlingMode || !settlementPlan) return
  setCompositionPending(true)
  setRockMovementError(null)

  const closeSuccessfulSession = async (rock: RockPose) => {
    setRockPose(rock)
    canonicalRockPoseRef.current = rock
    setPlacementSession(null)
    setSettlementPlan(null)
    setPlacementTarget(null)
    setSelectedAccessoryId(null)
    setPlacementTool('position')
    setMode('orbit')
    navigator.vibrate?.(20)
    await onServerStateChanged()
  }

  const restoreCanonicalSession = async (error: unknown) => {
    setRockMovementError(error instanceof Error
      ? `${error.message} Le dernier état serveur connu a été restauré.`
      : 'La manutention n’a pas pu être confirmée ; le dernier état serveur connu a été restauré.')
    setRockPose(canonicalRockPoseRef.current)
    setPlacementSession(null)
    setSettlementPlan(null)
    setPlacementTarget(null)
    setSelectedAccessoryId(null)
    setPlacementTool('position')
    try {
      await refreshAccessoryPlacements()
    } catch {
      // The visible canonical pose is still restored even if the accessory reread is offline.
    }
    setMode('orbit')
    await onServerStateChanged()
  }

  const settledRockPose: RockPose = {
    position: [...composition.rockTransform.position],
    rotation: [...composition.rockTransform.rotation],
  }

  if (!settlementPlan.rock) {
    const dirtyIds = new Set(settlementPlan.accessoryIds)
    const dirtyAccessories = composition.accessories.filter(({ instanceId }) => dirtyIds.has(instanceId))
    void Promise.all(dirtyAccessories.map(({ instanceId, transform }) => persistAccessoryWorldTransform({
      instanceId,
      transform,
      rockPose: settledRockPose,
      eventKey: crypto.randomUUID(),
    }))).then(async (results) => {
      results.forEach(acceptStabilizedAccessory)
      await closeSuccessfulSession(settledRockPose)
    }).catch(restoreCanonicalSession).finally(() => {
      setCompositionPending(false)
    })
    return
  }

  void persistRockCompositionWorld({
    userRockId: activeRock.id,
    eventKey: crypto.randomUUID(),
    composition,
  }).then(async (result) => {
    acceptComposition(result)
    await closeSuccessfulSession(result.rockPose)
  }).catch(restoreCanonicalSession).finally(() => {
    setCompositionPending(false)
  })
}, [
  acceptComposition,
  acceptStabilizedAccessory,
  activeRock.id,
  compositionPending,
  onServerStateChanged,
  refreshAccessoryPlacements,
  settlementPlan,
  settlingMode,
])

  const handleAccessoryLoadState'''

text = text[:match.start()] + replacement + text[match.end():]
path.write_text(text)

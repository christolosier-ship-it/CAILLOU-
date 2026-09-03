import type { Dispatch } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { AccessoryCatalogItem } from '../accessories/accessoryTypes'
import { useAccessoryPlacements } from '../accessories/useAccessoryPlacements'
import type { ActiveRock } from '../adoption/adoptionTypes'
import { persistAccessoryWorldTransform, persistRockCompositionWorld } from '../placement/placementPersistence'
import type { SettledWorldComposition } from '../placement/placementPersistence'
import {
  addPlacementSessionAccessory,
  buildPlacementSettlementPlan,
  createPlacementSession,
  removePlacementSessionAccessory,
  updatePlacementSession,
} from '../placement/placementSession'
import type { PlacementSessionState, PlacementSettlementPlan } from '../placement/placementSession'
import type { PlacementTarget, PlacementTool, PlacementTransform } from '../placement/placementTypes'
import type { RockPose } from '../rockMovement/rockMovementTypes'
import { useRockMovementPermit } from '../rockMovement/useRockMovementPermit'
import type { PedestalAction, PedestalInteractionMode } from './pedestalState'

interface UsePedestalPlacementInput {
  activeRock: ActiveRock
  mode: PedestalInteractionMode
  dispatchPedestal: Dispatch<PedestalAction>
  externalMutationPending: boolean
  onServerStateChanged: () => Promise<void>
  onBalanceChanged: (balance: number) => void
}

export type RockPlacementSelectionResult = 'selected' | 'permit-required' | 'blocked'

export function usePedestalPlacement({
  activeRock,
  mode,
  dispatchPedestal,
  externalMutationPending,
  onServerStateChanged,
  onBalanceChanged,
}: UsePedestalPlacementInput) {
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<string | null>(null)
  const [placementTarget, setPlacementTarget] = useState<PlacementTarget | null>(null)
  const [placementTool, setPlacementTool] = useState<PlacementTool>('position')
  const [placementSession, setPlacementSession] = useState<PlacementSessionState | null>(null)
  const [settlementPlan, setSettlementPlan] = useState<PlacementSettlementPlan | null>(null)
  const [accessoryRenderError, setAccessoryRenderError] = useState<string | null>(null)
  const [rockMovementError, setRockMovementError] = useState<string | null>(null)
  const [compositionPending, setCompositionPending] = useState(false)
  const [accessoryPersistenceCount, setAccessoryPersistenceCount] = useState(0)
  const accessoryPersistenceRef = useRef(new Set<string>())
  const [rockPose, setRockPose] = useState<RockPose>({
    position: [...activeRock.posePosition],
    rotation: [...activeRock.poseRotation],
  })
  const canonicalRockPoseRef = useRef<RockPose>(rockPose)
  const rockPermit = useRockMovementPermit()

  const {
    instances: accessoryInstances,
    loading: accessoryPlacementsLoading,
    pendingId: accessoryPendingId,
    error: accessoryPlacementError,
    maxInstances,
    refresh: refreshAccessoryPlacements,
    place: placeAccessory,
    acceptStabilizedAccessory,
    acceptComposition,
    remove: removeAccessory,
  } = useAccessoryPlacements(activeRock.id)

  const placementMode = mode === 'placement'
  const settlingMode = mode === 'settling'
  const accessorySettling = settlingMode && settlementPlan !== null && !settlementPlan.rock
  const globalSettling = settlingMode && settlementPlan?.rock === true
  const placementMutationPending = accessoryPendingId !== null
    || compositionPending
    || accessoryPersistenceCount > 0
    || accessorySettling
    || globalSettling
    || rockPermit.pending
  const mutationPending = externalMutationPending || placementMutationPending

  useEffect(() => {
    const canonical = {
      position: [...activeRock.posePosition] as RockPose['position'],
      rotation: [...activeRock.poseRotation] as RockPose['rotation'],
    }
    canonicalRockPoseRef.current = canonical
    if (!placementMode && !settlingMode) setRockPose(canonical)
  }, [
    activeRock.id,
    activeRock.posePosition,
    activeRock.poseRotation,
    placementMode,
    settlingMode,
  ])

  const resetDraft = useCallback(() => {
    setSelectedAccessoryId(null)
    setPlacementTarget(null)
    setPlacementTool('position')
    setRockMovementError(null)
    setSettlementPlan(null)
    setPlacementSession(null)
    setRockPose(canonicalRockPoseRef.current)
  }, [])

  const beginPlacement = useCallback(() => {
    setSelectedAccessoryId(null)
    setPlacementTarget(null)
    setPlacementTool('position')
    setRockMovementError(null)
    setSettlementPlan(null)
    setPlacementSession(createPlacementSession(rockPose, accessoryInstances))
  }, [accessoryInstances, rockPose])

  const handlePlacementAdd = useCallback(async (item: AccessoryCatalogItem) => {
    const created = await placeAccessory(item)
    setAccessoryRenderError(null)
    setPlacementSession((current) => current ? addPlacementSessionAccessory(current, created) : current)
    setSelectedAccessoryId(created.id)
    setPlacementTarget({ kind: 'accessory', instanceId: created.id })
    setPlacementTool('position')
  }, [placeAccessory])

  const handleAccessorySelect = useCallback((instanceId: string) => {
    if (mutationPending || mode !== 'placement') return
    setSelectedAccessoryId(instanceId)
    setPlacementTarget({ kind: 'accessory', instanceId })
    setPlacementTool('position')
  }, [mode, mutationPending])

  const handleAccessoryRemove = useCallback((instanceId: string) => {
    if (mutationPending || mode !== 'placement') return
    void removeAccessory(instanceId).then((removed) => {
      if (!removed) return
      setPlacementSession((current) => current ? removePlacementSessionAccessory(current, instanceId) : current)
      setSelectedAccessoryId(null)
      setPlacementTarget(null)
      setPlacementTool('position')
    })
  }, [mode, mutationPending, removeAccessory])

  const selectRockForPlacement = useCallback((): RockPlacementSelectionResult => {
    if (mutationPending) return 'blocked'
    if (!rockPermit.unlocked) return 'permit-required'
    setSelectedAccessoryId(null)
    setPlacementTarget({ kind: 'rock' })
    setPlacementTool('position')
    setRockMovementError(null)
    return 'selected'
  }, [mutationPending, rockPermit.unlocked])

  const handlePlacementTool = useCallback((tool: PlacementTool) => {
    if (!placementTarget || mutationPending) return
    if (placementTarget.kind === 'rock' && tool === 'size') return
    setPlacementTool(tool)
  }, [mutationPending, placementTarget])

  const handleRockPlacementDraft = useCallback((pose: RockPose) => {
    setRockPose(pose)
    setPlacementSession((current) => current ? updatePlacementSession(current, { kind: 'rock' }, {
      position: [...pose.position],
      rotation: [...pose.rotation],
      scale: 1,
    }) : current)
  }, [])

  const handleAccessoryPlacementDraft = useCallback((instanceId: string, transform: PlacementTransform) => {
    setPlacementSession((current) => current
      ? updatePlacementSession(current, { kind: 'accessory', instanceId }, transform)
      : current)
  }, [])

  const handlePlacementDone = useCallback(() => {
    if (mutationPending || mode !== 'placement') return
    const plan = buildPlacementSettlementPlan(placementSession)
    if (!plan) {
      setPlacementSession(null)
      setPlacementTarget(null)
      setSelectedAccessoryId(null)
      dispatchPedestal({ type: 'return-to-orbit' })
      return
    }
    setSettlementPlan(plan)
    dispatchPedestal({ type: 'begin-settling' })
  }, [dispatchPedestal, mode, mutationPending, placementSession])

  const handleAccessorySettled = useCallback((instanceId: string, transform: PlacementTransform) => {
    if (settlingMode || accessoryPersistenceRef.current.has(instanceId)) return
    if (!accessoryInstances.some((instance) => instance.id === instanceId)) return
    accessoryPersistenceRef.current.add(instanceId)
    setAccessoryPersistenceCount(accessoryPersistenceRef.current.size)
    setAccessoryRenderError(null)

    void persistAccessoryWorldTransform({
      instanceId,
      transform,
      rockPose,
      eventKey: crypto.randomUUID(),
    }).then((result) => {
      acceptStabilizedAccessory(result)
    }).catch(async (error) => {
      setAccessoryRenderError(error instanceof Error
        ? `${error.message} Le dernier état serveur connu a été restauré.`
        : 'La pose finale n’a pas pu être confirmée ; le dernier état serveur connu a été restauré.')
      try {
        await refreshAccessoryPlacements()
      } catch {
        // Keep the last visible canonical state if the reread is offline.
      }
    }).finally(() => {
      accessoryPersistenceRef.current.delete(instanceId)
      setAccessoryPersistenceCount(accessoryPersistenceRef.current.size)
    })
  }, [
    acceptStabilizedAccessory,
    accessoryInstances,
    refreshAccessoryPlacements,
    rockPose,
    settlingMode,
  ])

  const handlePermitPurchase = useCallback(async () => {
    const result = await rockPermit.purchase()
    if (!result) return false
    onBalanceChanged(result.balance)
    navigator.vibrate?.(18)
    void onServerStateChanged()
    return true
  }, [onBalanceChanged, onServerStateChanged, rockPermit])

  const handleCompositionSettled = useCallback((composition: SettledWorldComposition) => {
    if (compositionPending || !settlingMode || !settlementPlan) return
    setCompositionPending(true)
    setRockMovementError(null)

    const closeSuccessfulSession = async (rockPoseResult: RockPose) => {
      setRockPose(rockPoseResult)
      canonicalRockPoseRef.current = rockPoseResult
      setPlacementSession(null)
      setSettlementPlan(null)
      setPlacementTarget(null)
      setSelectedAccessoryId(null)
      setPlacementTool('position')
      dispatchPedestal({ type: 'return-to-orbit' })
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
      dispatchPedestal({ type: 'return-to-orbit' })
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
    dispatchPedestal,
    onServerStateChanged,
    refreshAccessoryPlacements,
    settlementPlan,
    settlingMode,
  ])

  const handleAccessoryLoadState = useCallback((instanceId: string, state: 'loading' | 'ready' | 'error', message?: string) => {
    if (state === 'error') {
      setAccessoryRenderError(`L’instance ${instanceId.slice(0, 8)} n’a pas pu être chargée${message ? ` : ${message}` : '.'}`)
    } else if (state === 'ready') {
      setAccessoryRenderError(null)
    }
  }, [])

  const status = compositionPending
    ? 'Enregistrement atomique de la nouvelle composition…'
    : accessoryPersistenceCount > 0
      ? 'Enregistrement de la pose finale stabilisée…'
      : accessorySettling
        ? 'Rapier stabilise l’accessoire avant enregistrement…'
        : globalSettling
          ? 'Rapier arbitre la composition : gravité et collisions sont de nouveau actives…'
          : placementMode
            ? placementTarget?.kind === 'rock'
              ? placementTool === 'position'
                ? 'Placement du caillou : le canvas entier contrôle sa position. Le sol gris reste infranchissable.'
                : 'Placement du caillou : le canvas entier contrôle son orientation.'
              : placementTarget?.kind === 'accessory'
                ? placementTool === 'position'
                  ? 'Placement accessoire : position libre, intersections autorisées, sol gris infranchissable.'
                  : placementTool === 'orientation'
                    ? 'Placement accessoire : orientation libre depuis tout le canvas.'
                    : 'Placement accessoire : pincez pour ajuster la taille.'
                : 'Placement : choisissez d’abord une cible.'
            : accessoryPendingId
              ? 'Enregistrement du placement…'
              : accessoryPlacementsLoading
                ? 'Vérification des accessoires placés…'
                : null

  return {
    rockPermit,
    accessoryInstances,
    accessoryPlacementsLoading,
    accessoryPendingId,
    accessoryPlacementError,
    maxInstances,
    selectedAccessoryId,
    placementTarget,
    placementTool,
    placementSession,
    settlementPlan,
    rockPose,
    placementMode,
    settlingMode,
    accessorySettling,
    globalSettling,
    mutationPending,
    message: accessoryPlacementError ?? accessoryRenderError ?? rockMovementError,
    rockMovementError,
    resetDraft,
    beginPlacement,
    handlePlacementAdd,
    handleAccessorySelect,
    handleAccessoryRemove,
    selectRockForPlacement,
    handlePlacementTool,
    handleRockPlacementDraft,
    handleAccessoryPlacementDraft,
    handlePlacementDone,
    handleAccessorySettled,
    handlePermitPurchase,
    handleCompositionSettled,
    handleAccessoryLoadState,
    status,
  }
}

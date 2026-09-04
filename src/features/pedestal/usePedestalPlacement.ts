import type { Dispatch } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { SERVER_RECONCILED_EVENT } from '../../pwa/pendingMutations'
import { defaultAccessoryTransform } from '../accessories/accessoryPlacementRules'
import type { AccessoryCatalogItem, EquippedAccessoryInstance } from '../accessories/accessoryTypes'
import { useAccessoryPlacements } from '../accessories/useAccessoryPlacements'
import type { ActiveRock } from '../adoption/adoptionTypes'
import {
  accessoryPlacementTarget,
  placementToolAllowed,
  rockPlacementTarget,
} from '../placement/placementObject'
import {
  persistAccessoryWorldTransform,
  persistPlacementSessionWorld,
} from '../placement/placementPersistence'
import type { SettledWorldComposition } from '../placement/placementPersistence'
import {
  addPlacementSessionAccessory,
  buildPlacementSettlementPlan,
  createPlacementSession,
  removePlacementSessionAccessory,
  updatePlacementSession,
} from '../placement/placementSession'
import type { PlacementSessionState, PlacementSettlementPlan } from '../placement/placementSession'
import type {
  PlacementControlTarget,
  PlacementTarget,
  PlacementTool,
  PlacementTransform,
} from '../placement/placementTypes'
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

function copyInstance(instance: EquippedAccessoryInstance): EquippedAccessoryInstance {
  return {
    ...instance,
    localPosition: [...instance.localPosition],
    localRotation: [...instance.localRotation],
  }
}

export function usePedestalPlacement({
  activeRock,
  mode,
  dispatchPedestal,
  externalMutationPending,
  onServerStateChanged,
  onBalanceChanged,
}: UsePedestalPlacementInput) {
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<string | null>(null)
  const [placementControlTarget, setPlacementControlTarget] = useState<PlacementControlTarget | null>(null)
  const [lastObjectTarget, setLastObjectTarget] = useState<PlacementTarget | null>(null)
  const [placementTool, setPlacementTool] = useState<PlacementTool>('position')
  const [placementSession, setPlacementSession] = useState<PlacementSessionState | null>(null)
  const [settlementPlan, setSettlementPlan] = useState<PlacementSettlementPlan | null>(null)
  const [placementAccessoryInstances, setPlacementAccessoryInstances] = useState<EquippedAccessoryInstance[]>([])
  const [accessoryRenderError, setAccessoryRenderError] = useState<string | null>(null)
  const [rockMovementError, setRockMovementError] = useState<string | null>(null)
  const [compositionPending, setCompositionPending] = useState(false)
  const [accessoryPersistenceCount, setAccessoryPersistenceCount] = useState(0)
  const accessoryPersistenceRef = useRef(new Set<string>())
  const placementInitialInstancesRef = useRef<EquippedAccessoryInstance[]>([])
  const settlementStartedRef = useRef(false)
  const commitInFlightRef = useRef(false)
  const settlementEventKeyRef = useRef<string | null>(null)
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
    acceptStabilizedAccessory,
    acceptPlacementSession,
  } = useAccessoryPlacements(activeRock.id)

  const placementMode = mode === 'placement'
  const settlingMode = mode === 'settling'
  const visibleAccessoryInstances = placementMode || settlingMode
    ? placementAccessoryInstances
    : accessoryInstances
  const placementTarget = placementControlTarget?.kind === 'object'
    ? placementControlTarget.target
    : null
  const cameraSelected = placementControlTarget?.kind === 'camera'
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

  useEffect(() => {
    const handleReconciled = () => {
      void onServerStateChanged()
    }
    window.addEventListener(SERVER_RECONCILED_EVENT, handleReconciled)
    return () => window.removeEventListener(SERVER_RECONCILED_EVENT, handleReconciled)
  }, [onServerStateChanged])

  const clearSessionState = useCallback(() => {
    setSelectedAccessoryId(null)
    setPlacementControlTarget(null)
    setLastObjectTarget(null)
    setPlacementTool('position')
    setSettlementPlan(null)
    setPlacementSession(null)
    setPlacementAccessoryInstances([])
    placementInitialInstancesRef.current = []
    settlementStartedRef.current = false
    commitInFlightRef.current = false
    settlementEventKeyRef.current = null
  }, [])

  const resetDraft = useCallback(() => {
    setRockMovementError(null)
    setRockPose({
      position: [...canonicalRockPoseRef.current.position],
      rotation: [...canonicalRockPoseRef.current.rotation],
    })
    clearSessionState()
  }, [clearSessionState])

  const beginPlacement = useCallback(() => {
    const snapshotInstances = accessoryInstances.map(copyInstance)
    placementInitialInstancesRef.current = snapshotInstances.map(copyInstance)
    setPlacementAccessoryInstances(snapshotInstances)
    setSelectedAccessoryId(null)
    setPlacementControlTarget(null)
    setLastObjectTarget(null)
    setPlacementTool('position')
    setRockMovementError(null)
    setAccessoryRenderError(null)
    setSettlementPlan(null)
    settlementStartedRef.current = false
    commitInFlightRef.current = false
    settlementEventKeyRef.current = null
    setPlacementSession(createPlacementSession(rockPose, snapshotInstances))
  }, [accessoryInstances, rockPose])

  const activateObjectTarget = useCallback((target: PlacementTarget) => {
    setPlacementControlTarget({ kind: 'object', target })
    setLastObjectTarget(target)
    setPlacementTool('position')
    setRockMovementError(null)
  }, [])

  const handlePlacementAdd = useCallback(async (item: AccessoryCatalogItem) => {
    if (mutationPending || mode !== 'placement') return
    if (placementAccessoryInstances.length >= maxInstances) {
      throw new Error('Le Socle accepte au maximum huit accessoires simultanés.')
    }
    const transform = defaultAccessoryTransform(item, placementAccessoryInstances.length)
    const now = new Date().toISOString()
    const created: EquippedAccessoryInstance = {
      id: crypto.randomUUID(),
      userRockId: activeRock.id,
      accessoryId: item.id,
      category: item.category,
      name: item.name,
      modelPath: item.modelPath,
      previewPath: item.previewPath,
      scaleMin: item.scaleMin,
      scaleMax: item.scaleMax,
      triangleCount: item.triangleCount,
      dimensions: item.dimensions,
      physics: item.physics,
      equippedAt: now,
      updatedAt: now,
      stabilizedAt: null,
      ...transform,
    }
    const target = accessoryPlacementTarget(created)
    setAccessoryRenderError(null)
    setPlacementAccessoryInstances((current) => [...current, created])
    setPlacementSession((current) => current ? addPlacementSessionAccessory(current, created) : current)
    setSelectedAccessoryId(created.id)
    activateObjectTarget(target)
  }, [
    activeRock.id,
    activateObjectTarget,
    maxInstances,
    mode,
    mutationPending,
    placementAccessoryInstances.length,
  ])

  const handleAccessorySelect = useCallback((instanceId: string) => {
    if (mutationPending || mode !== 'placement') return
    const instance = placementAccessoryInstances.find((candidate) => candidate.id === instanceId)
    if (!instance) return
    setSelectedAccessoryId(instanceId)
    activateObjectTarget(accessoryPlacementTarget(instance))
  }, [activateObjectTarget, mode, mutationPending, placementAccessoryInstances])

  const handleAccessoryRemove = useCallback((instanceId: string) => {
    if (mutationPending || mode !== 'placement') return
    if (!placementAccessoryInstances.some((instance) => instance.id === instanceId)) return
    setPlacementAccessoryInstances((current) => current.filter((instance) => instance.id !== instanceId))
    setPlacementSession((current) => current ? removePlacementSessionAccessory(current, instanceId) : current)
    setSelectedAccessoryId(null)
    setPlacementControlTarget((current) => current?.kind === 'object'
      && current.target.kind === 'accessory'
      && current.target.instanceId === instanceId
      ? null
      : current)
    setLastObjectTarget((current) => current?.kind === 'accessory' && current.instanceId === instanceId
      ? null
      : current)
    setPlacementTool('position')
  }, [mode, mutationPending, placementAccessoryInstances])

  const selectRockForPlacement = useCallback((): RockPlacementSelectionResult => {
    if (mutationPending || mode !== 'placement') return 'blocked'
    if (!rockPermit.unlocked) return 'permit-required'
    setSelectedAccessoryId(null)
    activateObjectTarget(rockPlacementTarget())
    return 'selected'
  }, [activateObjectTarget, mode, mutationPending, rockPermit.unlocked])

  const selectCameraForPlacement = useCallback(() => {
    if (mutationPending || mode !== 'placement') return
    setSelectedAccessoryId(null)
    setPlacementControlTarget({ kind: 'camera' })
    setRockMovementError(null)
  }, [mode, mutationPending])

  const resumeLastObjectTarget = useCallback(() => {
    if (!lastObjectTarget || mutationPending || mode !== 'placement') return false
    if (lastObjectTarget.kind === 'rock') return selectRockForPlacement() === 'selected'
    const instance = placementAccessoryInstances.find((candidate) => candidate.id === lastObjectTarget.instanceId)
    if (!instance) {
      setLastObjectTarget(null)
      return false
    }
    setSelectedAccessoryId(instance.id)
    activateObjectTarget(accessoryPlacementTarget(instance))
    return true
  }, [
    activateObjectTarget,
    lastObjectTarget,
    mode,
    mutationPending,
    placementAccessoryInstances,
    selectRockForPlacement,
  ])

  const handlePlacementTool = useCallback((tool: PlacementTool) => {
    if (!placementTarget || mutationPending) return
    if (!placementToolAllowed(placementTarget.profile.capabilities, tool)) return
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

  const handlePlacementCancel = useCallback(() => {
    if (mutationPending || mode !== 'placement') return
    setRockMovementError(null)
    setRockPose({
      position: [...canonicalRockPoseRef.current.position],
      rotation: [...canonicalRockPoseRef.current.rotation],
    })
    clearSessionState()
    dispatchPedestal({ type: 'return-to-orbit' })
  }, [clearSessionState, dispatchPedestal, mode, mutationPending])

  const handlePlacementDone = useCallback(() => {
    if (mutationPending || mode !== 'placement' || settlementStartedRef.current) return
    const plan = buildPlacementSettlementPlan(placementSession)
    if (!plan) {
      clearSessionState()
      dispatchPedestal({ type: 'return-to-orbit' })
      return
    }
    settlementStartedRef.current = true
    settlementEventKeyRef.current = crypto.randomUUID()
    setSettlementPlan(plan)
    dispatchPedestal({ type: 'begin-settling' })
  }, [clearSessionState, dispatchPedestal, mode, mutationPending, placementSession])

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
    if (!settlingMode || !settlementPlan || commitInFlightRef.current) return
    commitInFlightRef.current = true
    setCompositionPending(true)
    setRockMovementError(null)
    const eventKey = settlementEventKeyRef.current ?? crypto.randomUUID()
    settlementEventKeyRef.current = eventKey

    void persistPlacementSessionWorld({
      userRockId: activeRock.id,
      eventKey,
      moveRock: settlementPlan.rock,
      composition,
      instances: placementAccessoryInstances,
    }).then(async (result) => {
      const committedById = new Map(result.accessories.map((item) => [item.instanceId, item]))
      const nextCanonical = placementAccessoryInstances.flatMap((instance) => {
        const committed = committedById.get(instance.id)
        if (!committed || committed.accessoryId !== instance.accessoryId) return []
        return [{
          ...copyInstance(instance),
          localPosition: [...committed.localPosition] as EquippedAccessoryInstance['localPosition'],
          localRotation: [...committed.localRotation] as EquippedAccessoryInstance['localRotation'],
          uniformScale: committed.uniformScale,
          equippedAt: committed.equippedAt,
          updatedAt: committed.updatedAt,
          stabilizedAt: committed.stabilizedAt,
        }]
      })

      if (nextCanonical.length === result.accessories.length) {
        acceptPlacementSession(nextCanonical)
      } else {
        await refreshAccessoryPlacements()
      }

      const confirmedRockPose: RockPose = {
        position: [...result.rockPose.position],
        rotation: [...result.rockPose.rotation],
      }
      canonicalRockPoseRef.current = confirmedRockPose
      setRockPose(confirmedRockPose)
      clearSessionState()
      dispatchPedestal({ type: 'return-to-orbit' })
      navigator.vibrate?.(20)
      await onServerStateChanged()
    }).catch((error) => {
      setRockMovementError(error instanceof Error
        ? `${error.message} Le dernier état canonique connu a été restauré.`
        : 'Placement n’a pas pu être confirmé ; le dernier état canonique connu a été restauré.')
      setRockPose({
        position: [...canonicalRockPoseRef.current.position],
        rotation: [...canonicalRockPoseRef.current.rotation],
      })
      clearSessionState()
      dispatchPedestal({ type: 'return-to-orbit' })
    }).finally(() => {
      setCompositionPending(false)
      commitInFlightRef.current = false
      settlementStartedRef.current = false
      settlementEventKeyRef.current = null
    })
  }, [
    acceptPlacementSession,
    activeRock.id,
    clearSessionState,
    dispatchPedestal,
    onServerStateChanged,
    placementAccessoryInstances,
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
    ? 'Confirmation atomique de la composition stabilisée…'
    : accessoryPersistenceCount > 0
      ? 'Enregistrement de la pose finale stabilisée…'
      : accessorySettling
        ? 'Rapier stabilise la composition avant confirmation…'
        : globalSettling
          ? 'Rapier arbitre la composition : gravité et collisions sont de nouveau actives…'
          : placementMode
            ? cameraSelected
              ? 'Placement caméra : glissez pour orbiter, pincez pour zoomer. Le draft des objets reste intact.'
              : placementTarget?.kind === 'rock'
                ? placementTool === 'position'
                  ? 'Placement du caillou : le canvas entier contrôle sa position. Les collisions restent actives.'
                  : 'Placement du caillou : le canvas entier contrôle son orientation sous contraintes.'
                : placementTarget?.kind === 'accessory'
                  ? placementTool === 'position'
                    ? 'Placement accessoire : position libre sous contraintes, sans traverser les autres objets ni le sol.'
                    : placementTool === 'orientation'
                      ? 'Placement accessoire : orientation libre, bornée avant collision.'
                      : 'Placement accessoire : pincez pour ajuster la taille sans traverser un obstacle.'
                  : 'Placement : touchez un objet dans la scène ou choisissez-le dans la liste.'
            : accessoryPendingId
              ? 'Enregistrement du placement…'
              : accessoryPlacementsLoading
                ? 'Vérification des accessoires placés…'
                : null

  return {
    rockPermit,
    accessoryInstances: visibleAccessoryInstances,
    accessoryPlacementsLoading,
    accessoryPendingId,
    accessoryPlacementError,
    maxInstances,
    selectedAccessoryId,
    placementControlTarget,
    placementTarget,
    lastObjectTarget,
    cameraSelected,
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
    selectCameraForPlacement,
    resumeLastObjectTarget,
    handlePlacementTool,
    handleRockPlacementDraft,
    handleAccessoryPlacementDraft,
    handlePlacementCancel,
    handlePlacementDone,
    handleAccessorySettled,
    handlePermitPurchase,
    handleCompositionSettled,
    handleAccessoryLoadState,
    status,
  }
}

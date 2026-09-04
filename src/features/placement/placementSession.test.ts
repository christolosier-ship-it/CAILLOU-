import { describe, expect, it } from 'vitest'

import {
  addPlacementSessionAccessory,
  buildPlacementSettlementPlan,
  createPlacementSession,
  placementSessionTransform,
  removePlacementSessionAccessory,
  updatePlacementSession,
} from './placementSession'
import type { PlacementSessionAccessorySource } from './placementSession'

const pose = {
  position: [0, 0.5, 0] as [number, number, number],
  rotation: [0, 0, 0, 1] as [number, number, number, number],
}

const monocle: PlacementSessionAccessorySource = {
  id: 'monocle-1',
  localPosition: [0.2, 0.4, 0.5],
  localRotation: [0, 0, 0, 1],
  uniformScale: 1,
}

const glasses: PlacementSessionAccessorySource = {
  id: 'glasses-1',
  localPosition: [-0.3, 0.35, 0.45],
  localRotation: [0, 0, 0, 1],
  uniformScale: 0.9,
}

describe('PlacementSession', () => {
  it('keeps an immutable canonical snapshot while drafts evolve', () => {
    const session = createPlacementSession(pose, [monocle, glasses])
    const initialRock = structuredClone(session.initialRock)
    const initialAccessories = structuredClone(session.initialAccessories)
    let edited = updatePlacementSession(session, { kind: 'rock' }, {
      position: [1.1, 0.5, -0.4],
      rotation: [0, 0.2, 0, 0.9797959],
      scale: 1,
    })
    edited = updatePlacementSession(edited, { kind: 'accessory', instanceId: monocle.id }, {
      position: [0.8, 0.7, 0.4], rotation: [0, 0, 0, 1], scale: 1.2,
    })

    expect(edited.initialRock).toEqual(initialRock)
    expect(edited.initialAccessories).toEqual(initialAccessories)
    expect(edited.rock).not.toEqual(initialRock)
    expect(edited.accessories[monocle.id]).not.toEqual(initialAccessories[monocle.id])
  })

  it('keeps accessory world drafts fixed when the rock moves', () => {
    const session = createPlacementSession(pose, [monocle, glasses])
    const monocleBefore = placementSessionTransform(session, { kind: 'accessory', instanceId: monocle.id })
    const moved = updatePlacementSession(session, { kind: 'rock' }, {
      position: [1.1, 0.5, -0.4],
      rotation: [0, 0.2, 0, 0.9797959],
      scale: 1,
    })

    expect(moved.rock.position).toEqual([1.1, 0.5, -0.4])
    expect(placementSessionTransform(moved, { kind: 'accessory', instanceId: monocle.id })).toEqual(monocleBefore)
    expect(moved.dirtyRock).toBe(true)
  })

  it('preserves every target draft while switching targets', () => {
    let session = createPlacementSession(pose, [monocle, glasses])
    session = updatePlacementSession(session, { kind: 'accessory', instanceId: monocle.id }, {
      position: [0.8, 0.7, 0.4], rotation: [0, 0, 0, 1], scale: 1.2,
    })
    session = updatePlacementSession(session, { kind: 'rock' }, {
      position: [-0.6, 0.55, 0.2], rotation: [0, 0, 0, 1], scale: 1,
    })
    session = updatePlacementSession(session, { kind: 'accessory', instanceId: glasses.id }, {
      position: [-0.9, 0.8, 0.5], rotation: [0, 0, 0, 1], scale: 1.05,
    })

    expect(placementSessionTransform(session, { kind: 'accessory', instanceId: monocle.id })?.position).toEqual([0.8, 0.7, 0.4])
    expect(placementSessionTransform(session, { kind: 'rock' })?.position).toEqual([-0.6, 0.55, 0.2])
    expect(placementSessionTransform(session, { kind: 'accessory', instanceId: glasses.id })?.position).toEqual([-0.9, 0.8, 0.5])
    expect(session.dirtyAccessoryIds).toEqual(['monocle-1', 'glasses-1'])
  })

  it('settles every accessory when the rock changed, otherwise only dirty accessories', () => {
    const base = createPlacementSession(pose, [monocle, glasses])
    const accessoryOnly = updatePlacementSession(base, { kind: 'accessory', instanceId: monocle.id }, {
      position: [0.7, 0.6, 0.5], rotation: [0, 0, 0, 1], scale: 1,
    })
    expect(buildPlacementSettlementPlan(accessoryOnly)).toEqual({
      rock: false,
      accessoryIds: ['monocle-1'],
      membershipChanged: false,
    })

    const rockChanged = updatePlacementSession(accessoryOnly, { kind: 'rock' }, {
      position: [0.5, 0.5, 0], rotation: [0, 0, 0, 1], scale: 1,
    })
    expect(buildPlacementSettlementPlan(rockChanged)).toEqual({
      rock: true,
      accessoryIds: ['monocle-1', 'glasses-1'],
      membershipChanged: false,
    })
  })

  it('tracks membership changes without disturbing existing drafts', () => {
    let session = createPlacementSession(pose, [monocle])
    session = updatePlacementSession(session, { kind: 'accessory', instanceId: monocle.id }, {
      position: [0.9, 0.8, 0.7], rotation: [0, 0, 0, 1], scale: 1.1,
    })
    session = addPlacementSessionAccessory(session, glasses)
    expect(session.accessories[monocle.id]?.position).toEqual([0.9, 0.8, 0.7])
    expect(session.addedAccessoryIds).toEqual(['glasses-1'])

    session = removePlacementSessionAccessory(session, monocle.id)
    expect(session.accessories[monocle.id]).toBeUndefined()
    expect(session.removedAccessoryIds).toEqual(['monocle-1'])
    expect(buildPlacementSettlementPlan(session)).toEqual({
      rock: false,
      accessoryIds: ['glasses-1'],
      membershipChanged: true,
    })
  })

  it('treats add then remove of the same draft instance as a no-op', () => {
    let session = createPlacementSession(pose, [monocle])
    session = addPlacementSessionAccessory(session, glasses)
    session = removePlacementSessionAccessory(session, glasses.id)

    expect(session.addedAccessoryIds).toEqual([])
    expect(session.removedAccessoryIds).toEqual([])
    expect(buildPlacementSettlementPlan(session)).toBeNull()
  })

  it('keeps a removal-only session commit-worthy without inventing a physical body to settle', () => {
    const session = removePlacementSessionAccessory(createPlacementSession(pose, [monocle, glasses]), glasses.id)
    expect(buildPlacementSettlementPlan(session)).toEqual({
      rock: false,
      accessoryIds: [],
      membershipChanged: true,
    })
  })
})

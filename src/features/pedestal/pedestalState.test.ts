import { describe, expect, it } from 'vitest'

import {
  derivePedestalCapabilities,
  INITIAL_PEDESTAL_STATE,
  pedestalReducer,
} from './pedestalState'
import type { PedestalState } from './pedestalState'

const available = { mutationPending: false, cleaningAvailable: true }

function state(overrides: Partial<PedestalState> = {}): PedestalState {
  return { ...INITIAL_PEDESTAL_STATE, ...overrides }
}

describe('pedestalReducer', () => {
  it('keeps caress, cleaning and placement mutually exclusive', () => {
    const caress = pedestalReducer(INITIAL_PEDESTAL_STATE, { type: 'toggle-interaction', mode: 'caress' })
    expect(caress.interactionMode).toBe('caress')

    const cleaning = pedestalReducer(caress, { type: 'toggle-interaction', mode: 'cleaning' })
    expect(cleaning.interactionMode).toBe('cleaning')

    const placement = pedestalReducer(cleaning, { type: 'enter-placement' })
    expect(placement.interactionMode).toBe('placement')
    expect(placement.overlay).toBe('none')
  })

  it('toggles an active caress or cleaning mode back to orbit', () => {
    const caress = pedestalReducer(INITIAL_PEDESTAL_STATE, { type: 'toggle-interaction', mode: 'caress' })
    expect(pedestalReducer(caress, { type: 'toggle-interaction', mode: 'caress' }).interactionMode).toBe('orbit')

    const cleaning = pedestalReducer(INITIAL_PEDESTAL_STATE, { type: 'toggle-interaction', mode: 'cleaning' })
    expect(pedestalReducer(cleaning, { type: 'toggle-interaction', mode: 'cleaning' }).interactionMode).toBe('orbit')
  })

  it('opens overlays from a neutral interaction state and keeps shop focus explicit', () => {
    const cleaning = state({ interactionMode: 'cleaning' })
    const shop = pedestalReducer(cleaning, { type: 'open-overlay', overlay: 'shop', shopFocus: 'permit' })

    expect(shop).toEqual({
      interactionMode: 'orbit',
      overlay: 'shop',
      network: 'online',
      shopFocus: 'permit',
    })

    expect(pedestalReducer(shop, { type: 'close-overlay' })).toEqual(INITIAL_PEDESTAL_STATE)
  })

  it('makes settling and return to orbit explicit transitions', () => {
    const placement = state({ interactionMode: 'placement' })
    const settling = pedestalReducer(placement, { type: 'begin-settling' })
    expect(settling.interactionMode).toBe('settling')

    const settled = pedestalReducer(settling, { type: 'return-to-orbit' })
    expect(settled.interactionMode).toBe('orbit')
  })

  it('tracks network state without inferring it from the DOM', () => {
    const offline = pedestalReducer(INITIAL_PEDESTAL_STATE, { type: 'network-changed', network: 'offline' })
    expect(offline.network).toBe('offline')
    expect(pedestalReducer(offline, { type: 'network-changed', network: 'reconnecting' }).network).toBe('reconnecting')
  })
})

describe('derivePedestalCapabilities', () => {
  it('allows normal Socle actions while idle and online', () => {
    expect(derivePedestalCapabilities(INITIAL_PEDESTAL_STATE, available)).toEqual({
      canCaress: true,
      canClean: true,
      canOpenShop: true,
      canOpenBio: true,
      canDiscard: true,
      canEnterPlacement: true,
      canExitPlacement: false,
      canPurchase: false,
      canPersist: true,
    })
  })

  it('blocks Bio and discard during Placement while always allowing Placement exit', () => {
    const capabilities = derivePedestalCapabilities(state({ interactionMode: 'placement' }), {
      mutationPending: true,
      cleaningAvailable: true,
    })

    expect(capabilities.canOpenBio).toBe(false)
    expect(capabilities.canDiscard).toBe(false)
    expect(capabilities.canEnterPlacement).toBe(false)
    expect(capabilities.canExitPlacement).toBe(true)
  })

  it('blocks mutation entry offline but keeps Bio readable', () => {
    const capabilities = derivePedestalCapabilities(state({ network: 'offline' }), available)

    expect(capabilities.canCaress).toBe(false)
    expect(capabilities.canClean).toBe(false)
    expect(capabilities.canOpenShop).toBe(false)
    expect(capabilities.canDiscard).toBe(false)
    expect(capabilities.canEnterPlacement).toBe(false)
    expect(capabilities.canPersist).toBe(false)
    expect(capabilities.canOpenBio).toBe(true)
  })

  it('blocks duplicate mutation entry while an operation is pending', () => {
    const capabilities = derivePedestalCapabilities(INITIAL_PEDESTAL_STATE, {
      mutationPending: true,
      cleaningAvailable: true,
    })

    expect(capabilities.canCaress).toBe(false)
    expect(capabilities.canClean).toBe(false)
    expect(capabilities.canOpenShop).toBe(false)
    expect(capabilities.canDiscard).toBe(false)
    expect(capabilities.canEnterPlacement).toBe(false)
    expect(capabilities.canPersist).toBe(false)
  })

  it('allows purchases only while the shop overlay is active and the network is online', () => {
    const shop = state({ overlay: 'shop' })
    expect(derivePedestalCapabilities(shop, available).canPurchase).toBe(true)
    expect(derivePedestalCapabilities({ ...shop, network: 'offline' }, available).canPurchase).toBe(false)
  })

  it('respects cleaning availability independently from the other actions', () => {
    const capabilities = derivePedestalCapabilities(INITIAL_PEDESTAL_STATE, {
      mutationPending: false,
      cleaningAvailable: false,
    })

    expect(capabilities.canClean).toBe(false)
    expect(capabilities.canCaress).toBe(true)
    expect(capabilities.canOpenShop).toBe(true)
  })
})

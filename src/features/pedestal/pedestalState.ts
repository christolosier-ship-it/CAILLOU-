export type PedestalInteractionMode = 'orbit' | 'caress' | 'cleaning' | 'placement' | 'settling'
export type PedestalOverlay = 'none' | 'shop' | 'bio' | 'discard'
export type PedestalNetworkState = 'online' | 'reconnecting' | 'offline'
export type PedestalShopFocus = 'default' | 'permit'

export interface PedestalState {
  interactionMode: PedestalInteractionMode
  overlay: PedestalOverlay
  network: PedestalNetworkState
  shopFocus: PedestalShopFocus
}

export interface PedestalCapabilityContext {
  mutationPending: boolean
  cleaningAvailable: boolean
}

export interface PedestalCapabilities {
  canCaress: boolean
  canClean: boolean
  canOpenShop: boolean
  canOpenBio: boolean
  canDiscard: boolean
  canEnterPlacement: boolean
  canExitPlacement: boolean
  canPurchase: boolean
  canPersist: boolean
}

export type PedestalAction =
  | { type: 'toggle-interaction'; mode: 'caress' | 'cleaning' }
  | { type: 'open-overlay'; overlay: Exclude<PedestalOverlay, 'none'>; shopFocus?: PedestalShopFocus }
  | { type: 'close-overlay' }
  | { type: 'enter-placement' }
  | { type: 'begin-settling' }
  | { type: 'return-to-orbit' }
  | { type: 'network-changed'; network: PedestalNetworkState }

export const INITIAL_PEDESTAL_STATE: PedestalState = {
  interactionMode: 'orbit',
  overlay: 'none',
  network: 'online',
  shopFocus: 'default',
}

function withoutOverlay(state: PedestalState): PedestalState {
  return {
    ...state,
    overlay: 'none',
    shopFocus: 'default',
  }
}

export function pedestalReducer(state: PedestalState, action: PedestalAction): PedestalState {
  switch (action.type) {
    case 'toggle-interaction':
      return {
        ...withoutOverlay(state),
        interactionMode: state.interactionMode === action.mode ? 'orbit' : action.mode,
      }
    case 'open-overlay':
      return {
        ...state,
        interactionMode: 'orbit',
        overlay: action.overlay,
        shopFocus: action.overlay === 'shop' ? action.shopFocus ?? 'default' : 'default',
      }
    case 'close-overlay':
      return withoutOverlay(state)
    case 'enter-placement':
      return {
        ...withoutOverlay(state),
        interactionMode: 'placement',
      }
    case 'begin-settling':
      return {
        ...withoutOverlay(state),
        interactionMode: 'settling',
      }
    case 'return-to-orbit':
      return {
        ...withoutOverlay(state),
        interactionMode: 'orbit',
      }
    case 'network-changed':
      return {
        ...state,
        network: action.network,
      }
  }
}

export function derivePedestalCapabilities(
  state: PedestalState,
  context: PedestalCapabilityContext,
): PedestalCapabilities {
  const online = state.network === 'online'
  const overlayClear = state.overlay === 'none'
  const mutationUnlocked = !context.mutationPending
  const interactiveMode = state.interactionMode !== 'placement' && state.interactionMode !== 'settling'
  const idleMode = state.interactionMode === 'orbit'

  return {
    canCaress: online && overlayClear && mutationUnlocked && interactiveMode,
    canClean: online && overlayClear && mutationUnlocked && interactiveMode && context.cleaningAvailable,
    canOpenShop: online && overlayClear && mutationUnlocked && interactiveMode,
    canOpenBio: overlayClear && mutationUnlocked && idleMode,
    canDiscard: online && overlayClear && mutationUnlocked && idleMode,
    canEnterPlacement: online && overlayClear && mutationUnlocked && state.interactionMode !== 'placement' && state.interactionMode !== 'settling',
    canExitPlacement: state.interactionMode === 'placement',
    canPurchase: online && mutationUnlocked && state.overlay === 'shop',
    canPersist: online && mutationUnlocked,
  }
}

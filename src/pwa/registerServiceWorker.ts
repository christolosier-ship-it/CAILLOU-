import { registerSW } from 'virtual:pwa-register'

export const PWA_UPDATE_AVAILABLE_EVENT = 'caillou:pwa-update-available'
export const PWA_OFFLINE_READY_EVENT = 'caillou:pwa-offline-ready'

let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null

export function registerPwa() {
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new Event(PWA_UPDATE_AVAILABLE_EVENT))
    },
    onOfflineReady() {
      window.dispatchEvent(new Event(PWA_OFFLINE_READY_EVENT))
    },
  })
  return applyUpdate
}

export function applyPwaUpdate() {
  return applyUpdate?.(true) ?? Promise.resolve()
}

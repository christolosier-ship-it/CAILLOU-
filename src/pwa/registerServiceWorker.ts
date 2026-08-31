import { registerSW } from 'virtual:pwa-register'

export function registerPwa() {
  return registerSW({ immediate: true })
}

import { useEffect, useState } from 'react'

import {
  applyPwaUpdate,
  PWA_OFFLINE_READY_EVENT,
  PWA_UPDATE_AVAILABLE_EVENT,
} from './registerServiceWorker'

export function PwaUpdateNotice() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    const handleUpdate = () => setUpdateAvailable(true)
    const handleOfflineReady = () => {
      setOfflineReady(true)
      window.setTimeout(() => setOfflineReady(false), 3200)
    }
    window.addEventListener(PWA_UPDATE_AVAILABLE_EVENT, handleUpdate)
    window.addEventListener(PWA_OFFLINE_READY_EVENT, handleOfflineReady)
    return () => {
      window.removeEventListener(PWA_UPDATE_AVAILABLE_EVENT, handleUpdate)
      window.removeEventListener(PWA_OFFLINE_READY_EVENT, handleOfflineReady)
    }
  }, [])

  if (!updateAvailable && !offlineReady) return null

  return (
    <aside className="pwa-update-notice" aria-live="polite">
      <span>
        {updateAvailable
          ? 'Une version plus récente de CAILLOU™ est disponible.'
          : 'Le shell et les ressources essentielles sont prêts pour une reprise hors ligne.'}
      </span>
      {updateAvailable ? (
        <button type="button" onClick={() => void applyPwaUpdate()}>Mettre à jour</button>
      ) : null}
    </aside>
  )
}

import { StrictMode, useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { AuthenticatedHome } from '../../src/features/auth/AuthenticatedHome'
import type { ActiveRock, AdoptRockMutation } from '../../src/features/adoption/adoptionTypes'
import '../../src/styles/global.css'
import '../../src/styles/showroom.css'
import '../../src/styles/adoption.css'

function AdoptionFixture() {
  const [activeRock, setActiveRock] = useState<ActiveRock | null>(null)
  const [eventKeys, setEventKeys] = useState<string[]>([])
  const serverRock = useRef<ActiveRock | null>(null)
  const receipts = useRef(new Map<string, ActiveRock>())
  const loseFirstResponse = useRef(true)

  const mutation: AdoptRockMutation = useCallback(async ({ rock, name, eventKey }) => {
    setEventKeys((current) => [...current, eventKey])

    const replay = receipts.current.get(eventKey)
    if (replay) return replay

    const adopted: ActiveRock = {
      id: '70707070-7070-4707-8707-707070707077',
      specimenId: rock.id,
      name,
      adoptedAt: '2026-09-01T07:00:00.000Z',
      lastCleanedAt: null,
    }
    receipts.current.set(eventKey, adopted)
    serverRock.current = adopted

    if (loseFirstResponse.current) {
      loseFirstResponse.current = false
      throw new Error('Réponse réseau simulée perdue après enregistrement serveur.')
    }

    return adopted
  }, [])

  const refreshServerState = useCallback(async () => {
    setActiveRock(serverRock.current)
  }, [])

  return (
    <>
      <AuthenticatedHome
        username="Step07"
        destination={activeRock ? 'socle' : 'showroom'}
        activeRock={activeRock}
        adoptRockMutation={mutation}
        onServerStateChanged={refreshServerState}
        onSignOut={async () => undefined}
      />
      <output
        id="adoption-e2e-state"
        hidden
        data-event-keys={eventKeys.join(',')}
        data-server-rock={serverRock.current?.name ?? ''}
      />
    </>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing E2E fixture root')

createRoot(root).render(
  <StrictMode>
    <AdoptionFixture />
  </StrictMode>,
)

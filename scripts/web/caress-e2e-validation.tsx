import { StrictMode, useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import type { ActiveRock } from '../../src/features/adoption/adoptionTypes'
import type { RegisterCaressMutation, RockEconomySnapshot } from '../../src/features/caress/caressTypes'
import { Pedestal } from '../../src/features/pedestal/Pedestal'
import '../../src/styles/global.css'
import '../../src/styles/showroom.css'
import '../../src/styles/adoption.css'
import '../../src/styles/caress.css'

const ACTIVE_ROCK: ActiveRock = {
  id: '88888888-8888-4888-8888-888888888888',
  specimenId: 'rock-001',
  name: 'Bernard',
  adoptedAt: '2026-09-01T08:00:00.000Z',
  lastCleanedAt: null,
}

const INITIAL_ECONOMY: RockEconomySnapshot = {
  balance: 0,
  caressCount: 0,
  lithonsGenerated: 0,
}

function CaressFixture() {
  const [eventKeys, setEventKeys] = useState<string[]>([])
  const serverEconomy = useRef<RockEconomySnapshot>(INITIAL_ECONOMY)
  const receipts = useRef(new Map<string, RockEconomySnapshot>())
  const loseFirstResponse = useRef(true)

  const mutation: RegisterCaressMutation = useCallback(async ({ eventKey }) => {
    setEventKeys((current) => [...current, eventKey])

    const replay = receipts.current.get(eventKey)
    if (replay) return replay

    const next: RockEconomySnapshot = {
      balance: serverEconomy.current.balance + 1,
      caressCount: serverEconomy.current.caressCount + 1,
      lithonsGenerated: serverEconomy.current.lithonsGenerated + 1,
    }
    receipts.current.set(eventKey, next)
    serverEconomy.current = next

    if (loseFirstResponse.current) {
      loseFirstResponse.current = false
      throw new Error('Réponse réseau simulée perdue après crédit serveur.')
    }

    return next
  }, [])

  return (
    <>
      <Pedestal
        activeRock={ACTIVE_ROCK}
        economy={INITIAL_ECONOMY}
        username="Step08"
        registerCaressMutation={mutation}
        onServerStateChanged={async () => undefined}
        onSignOut={async () => undefined}
      />
      <output
        id="caress-e2e-state"
        hidden
        data-event-keys={eventKeys.join(',')}
        data-server-balance={serverEconomy.current.balance}
      />
    </>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing caress E2E fixture root')

createRoot(root).render(
  <StrictMode>
    <CaressFixture />
  </StrictMode>,
)

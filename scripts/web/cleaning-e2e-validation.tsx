import { StrictMode, useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import type { ActiveRock } from '../../src/features/adoption/adoptionTypes'
import type { RockEconomySnapshot } from '../../src/features/caress/caressTypes'
import type { CleaningSnapshot, RegisterCleaningMutation } from '../../src/features/cleaning/cleaningTypes'
import { Pedestal } from '../../src/features/pedestal/Pedestal'
import '../../src/styles/global.css'
import '../../src/styles/showroom.css'
import '../../src/styles/adoption.css'
import '../../src/styles/caress.css'
import '../../src/styles/cleaning.css'

const DAY_MS = 24 * 60 * 60 * 1000
const ADOPTED_AT = new Date(Date.now() - 30 * DAY_MS).toISOString()
const INITIAL_CLEANED_AT = new Date(Date.now() - 15 * DAY_MS).toISOString()

interface HydratedCleaningState {
  lastCleanedAt: string
  cleaningCount: number
}

const INITIAL_HYDRATED: HydratedCleaningState = {
  lastCleanedAt: INITIAL_CLEANED_AT,
  cleaningCount: 2,
}

function CleaningFixture() {
  const [eventKeys, setEventKeys] = useState<string[]>([])
  const [hydrated, setHydrated] = useState<HydratedCleaningState>(INITIAL_HYDRATED)
  const [pedestalKey, setPedestalKey] = useState(0)
  const serverCleaning = useRef<CleaningSnapshot>({
    lastCleanedAt: INITIAL_CLEANED_AT,
    cleaningCount: 2,
  })
  const receipts = useRef(new Map<string, CleaningSnapshot>())
  const loseFirstResponse = useRef(true)
  const serverBalance = useRef(7)

  const mutation: RegisterCleaningMutation = useCallback(async ({ eventKey }) => {
    setEventKeys((current) => [...current, eventKey])

    const replay = receipts.current.get(eventKey)
    if (replay) return replay

    const next: CleaningSnapshot = {
      lastCleanedAt: new Date().toISOString(),
      cleaningCount: serverCleaning.current.cleaningCount + 1,
    }
    receipts.current.set(eventKey, next)
    serverCleaning.current = next

    if (loseFirstResponse.current) {
      loseFirstResponse.current = false
      throw new Error('Réponse réseau simulée perdue après nettoyage serveur.')
    }

    return next
  }, [])

  const activeRock: ActiveRock = {
    id: '90909090-9090-4909-8909-909090909099',
    specimenId: 'rock-012',
    name: 'Proprement',
    adoptedAt: ADOPTED_AT,
    lastCleanedAt: hydrated.lastCleanedAt,
  }
  const economy: RockEconomySnapshot = {
    balance: serverBalance.current,
    caressCount: 7,
    cleaningCount: hydrated.cleaningCount,
    lithonsGenerated: 7,
  }

  return (
    <>
      <Pedestal
        key={pedestalKey}
        activeRock={activeRock}
        economy={economy}
        username="Step09"
        registerCleaningMutation={mutation}
        onServerStateChanged={async () => undefined}
        onSignOut={async () => undefined}
      />
      <output
        id="cleaning-e2e-state"
        hidden
        data-event-keys={eventKeys.join(',')}
        data-server-cleaning-count={serverCleaning.current.cleaningCount}
        data-server-balance={serverBalance.current}
      />
      <button
        id="simulate-cleaning-reload"
        type="button"
        hidden
        onClick={() => {
          setHydrated({
            lastCleanedAt: serverCleaning.current.lastCleanedAt,
            cleaningCount: serverCleaning.current.cleaningCount,
          })
          setPedestalKey((current) => current + 1)
        }}
      >
        Simuler reload
      </button>
    </>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing cleaning E2E fixture root')

createRoot(root).render(
  <StrictMode>
    <CleaningFixture />
  </StrictMode>,
)

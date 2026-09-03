import { StrictMode, useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { EmptyRockState } from '../../src/features/adoption/EmptyRockState'
import type { ActiveRock } from '../../src/features/adoption/adoptionTypes'
import type { LoadRockBioSnapshot } from '../../src/features/bio/bioTypes'
import { DiscardRockError } from '../../src/features/discard/discardApi'
import type { DiscardRockMutation } from '../../src/features/discard/discardTypes'
import { PedestalScreen } from '../../src/features/pedestal/PedestalScreen'
import '../../src/styles/global.css'
import '../../src/styles/showroom.css'
import '../../src/styles/adoption.css'
import '../../src/styles/caress.css'
import '../../src/styles/cleaning.css'
import '../../src/styles/accessories.css'
import '../../src/styles/accessory-placement.css'
import '../../src/styles/rock-movement.css'
import '../../src/styles/step11.css'

const INITIAL_ROCK: ActiveRock = {
  id: '11111111-1111-4111-8111-111111111111',
  specimenId: 'rock-001',
  name: 'Bernard',
  adoptedAt: '2026-08-31T08:00:00.000Z',
  lastCleanedAt: '2026-09-02T08:00:00.000Z',
  posePosition: [0, 0, 0],
  poseRotation: [0, 0, 0, 1],
  poseStabilizedAt: '2026-09-02T22:05:43.000Z',
}

function PedestalFixture() {
  const [active, setActive] = useState(true)
  const [degraded, setDegraded] = useState(false)
  const [adoptRequested, setAdoptRequested] = useState(false)
  const [eventKeys, setEventKeys] = useState<string[]>([])
  const serverActive = useRef(true)
  const receipts = useRef(new Map<string, { userRockId: string; discardedAt: string }>())
  const loseFirstResponse = useRef(true)

  const loadBio: LoadRockBioSnapshot = useCallback(async () => ({
    balance: 321,
    lifetimeEarned: 1450,
    lifetimeSpent: 1129,
    caressCount: 1450,
    cleaningCount: 7,
    lithonsGenerated: 1450,
    ownedAccessoryCount: 4,
    equippedAccessoryCount: 2,
    permanentUnlockCount: 1,
    rockMovementUnlocked: true,
  }), [])

  const discardRock: DiscardRockMutation = useCallback(async ({ userRockId, eventKey }) => {
    setEventKeys((current) => [...current, eventKey])
    const replay = receipts.current.get(eventKey)
    if (replay) return replay

    const result = { userRockId, discardedAt: '2026-09-03T09:00:00.000Z' }
    receipts.current.set(eventKey, result)
    serverActive.current = false

    if (loseFirstResponse.current) {
      loseFirstResponse.current = false
      throw new DiscardRockError(
        'La confirmation serveur n’est pas arrivée. La même opération peut être renvoyée sans double archivage.',
        'unknown',
        true,
      )
    }

    return result
  }, [])

  const refresh = useCallback(async () => {
    setActive(serverActive.current)
  }, [])

  return (
    <>
      <button id="fixture-network" type="button" onClick={() => setDegraded((current) => !current)}>
        Basculer réseau test
      </button>
      {active ? (
        <PedestalScreen
          activeRock={INITIAL_ROCK}
          economy={{ balance: 321, caressCount: 1450, cleaningCount: 7, lithonsGenerated: 1450 }}
          username="V2-00"
          degraded={degraded}
          onServerStateChanged={refresh}
          onSignOut={async () => undefined}
          loadBioSnapshot={loadBio}
          discardRockMutation={discardRock}
        />
      ) : (
        <EmptyRockState
          username="V2-00"
          onAdopt={() => setAdoptRequested(true)}
          onSignOut={async () => undefined}
        />
      )}
      <output
        id="pedestal-e2e-state"
        hidden
        data-active={active ? 'true' : 'false'}
        data-server-active={serverActive.current ? 'true' : 'false'}
        data-event-keys={eventKeys.join(',')}
        data-adopt-requested={adoptRequested ? 'true' : 'false'}
      />
    </>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing Pedestal E2E fixture root')

createRoot(root).render(
  <StrictMode>
    <PedestalFixture />
  </StrictMode>,
)

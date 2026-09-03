import { StrictMode, useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { EmptyRockState } from '../../src/features/adoption/EmptyRockState'
import type { ActiveRock } from '../../src/features/adoption/adoptionTypes'
import type { LoadRockBioSnapshot } from '../../src/features/bio/bioTypes'
import { DiscardRockError } from '../../src/features/discard/discardApi'
import type { DiscardRockMutation } from '../../src/features/discard/discardTypes'
import { Step11Pedestal } from '../../src/features/pedestal/Step11Pedestal'
import type { Step11PedestalBaseProps } from '../../src/features/pedestal/Step11Pedestal'
import '../../src/styles/global.css'
import '../../src/styles/adoption.css'
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

function MockPedestal({ activeRock }: Step11PedestalBaseProps) {
  const [mode, setMode] = useState<'orbit' | 'placement'>('orbit')
  const [nativeBioFired, setNativeBioFired] = useState(false)
  const modeClass = mode === 'placement' ? ' is-placement-mode' : ''

  return (
    <div className={`pedestal-shell${modeClass}`}>
      <header className="pedestal-topbar">
        <div>
          <button
            type="button"
            className="pedestal-utility"
            aria-label="Bio et statistiques"
            onClick={() => setNativeBioFired(true)}
          >
            Bio
          </button>
          <button
            type="button"
            className="pedestal-utility"
            title="Placement"
            disabled={mode !== 'orbit'}
            onClick={() => setMode('placement')}
          >
            Placement
          </button>
        </div>
        <strong>{activeRock.name}</strong>
      </header>
      <main className="pedestal-main">
        <section className="pedestal-stage" data-rock-mode={mode}>
          <button id="fixture-mode" type="button" onClick={() => setMode((current) => current === 'orbit' ? 'placement' : 'orbit')}>
            Basculer le mode test
          </button>
          <output id="native-bio-state" data-fired={nativeBioFired ? 'true' : 'false'} />
        </section>
        <nav className="pedestal-actions" aria-label="Actions du caillou">
          <button type="button" title="Caresser">Caresser</button>
          <button type="button" title="Nettoyer">Nettoyer</button>
          <button type="button" title="Boutique">Boutique</button>
          <button type="button" title="Jeter" disabled aria-label="Jeter — fonctionnalité en préparation">Jeter</button>
        </nav>
      </main>
    </div>
  )
}

function Step11Fixture() {
  const [active, setActive] = useState(true)
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
      {active ? (
        <Step11Pedestal
          activeRock={INITIAL_ROCK}
          economy={{ balance: 321, caressCount: 1450, cleaningCount: 7, lithonsGenerated: 1450 }}
          username="Step11"
          onServerStateChanged={refresh}
          onSignOut={async () => undefined}
          loadBioSnapshot={loadBio}
          discardRockMutation={discardRock}
          PedestalComponent={MockPedestal}
        />
      ) : (
        <EmptyRockState
          username="Step11"
          onAdopt={() => setAdoptRequested(true)}
          onSignOut={async () => undefined}
        />
      )}
      <output
        id="step11-e2e-state"
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
if (!root) throw new Error('Missing Step 11 E2E fixture root')

createRoot(root).render(
  <StrictMode>
    <Step11Fixture />
  </StrictMode>,
)

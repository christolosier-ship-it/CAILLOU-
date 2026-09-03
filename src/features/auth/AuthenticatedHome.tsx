import { lazy, Suspense, useEffect, useState } from 'react'

import type { RockCatalogEntry } from '../../content/rockCatalog'
import { adoptRock } from '../adoption/adoptionApi'
import { EmptyRockState } from '../adoption/EmptyRockState'
import type { ActiveRock, AdoptRockMutation } from '../adoption/adoptionTypes'
import type { LoadRockBioSnapshot } from '../bio/bioTypes'
import type { RegisterCaressMutation, RockEconomySnapshot } from '../caress/caressTypes'
import type { RegisterCleaningMutation } from '../cleaning/cleaningTypes'
import type { DiscardRockMutation } from '../discard/discardTypes'
import type { AuthenticatedDestination } from './authRules'

const LazyPedestalScreen = lazy(() => import('../pedestal/PedestalScreen').then((module) => ({
  default: module.PedestalScreen,
})))
const LazyShowroom = lazy(() => import('../showroom/Showroom').then((module) => ({
  default: module.Showroom,
})))
const LazyNamingScreen = lazy(() => import('../adoption/NamingScreen').then((module) => ({
  default: module.NamingScreen,
})))

interface AuthenticatedHomeProps {
  username: string
  destination: AuthenticatedDestination
  activeRock: ActiveRock | null
  economy: RockEconomySnapshot | null
  degraded?: boolean
  lastServerSyncAt?: string | null
  onServerStateChanged: () => Promise<void>
  onSignOut: () => Promise<void>
  adoptRockMutation?: AdoptRockMutation
  registerCaressMutation?: RegisterCaressMutation
  registerCleaningMutation?: RegisterCleaningMutation
  loadBioSnapshot?: LoadRockBioSnapshot
  discardRockMutation?: DiscardRockMutation
}

function SceneFallback() {
  return (
    <main className="session-loading" aria-live="polite">
      <p className="eyebrow">CAILLOU™</p>
      <p>Préparation du registre minéral…</p>
    </main>
  )
}

export function AuthenticatedHome({
  username,
  destination,
  activeRock,
  economy,
  degraded = false,
  lastServerSyncAt = null,
  onServerStateChanged,
  onSignOut,
  adoptRockMutation,
  registerCaressMutation,
  registerCleaningMutation,
  loadBioSnapshot,
  discardRockMutation,
}: AuthenticatedHomeProps) {
  const [namingRock, setNamingRock] = useState<RockCatalogEntry | null>(null)
  const [showroomRequested, setShowroomRequested] = useState(false)
  const mutation = adoptRockMutation ?? adoptRock

  useEffect(() => {
    if (destination === 'socle') setShowroomRequested(false)
  }, [destination])

  if (destination === 'socle' && activeRock) {
    if (!economy) {
      return (
        <main className="session-loading" aria-live="polite">
          <p className="eyebrow">CAILLOU™</p>
          <p>Vérification du registre des Lithons…</p>
        </main>
      )
    }

    return (
      <Suspense fallback={<SceneFallback />}>
        <LazyPedestalScreen
          activeRock={activeRock}
          economy={economy}
          username={username}
          degraded={degraded}
          lastServerSyncAt={lastServerSyncAt}
          onServerStateChanged={onServerStateChanged}
          onSignOut={onSignOut}
          registerCaressMutation={registerCaressMutation}
          registerCleaningMutation={registerCleaningMutation}
          loadBioSnapshot={loadBioSnapshot}
          discardRockMutation={discardRockMutation}
        />
      </Suspense>
    )
  }

  if (destination === 'empty' && !showroomRequested && !namingRock) {
    return (
      <EmptyRockState
        username={username}
        onAdopt={() => setShowroomRequested(true)}
        onSignOut={onSignOut}
      />
    )
  }

  if (namingRock) {
    return (
      <Suspense fallback={<SceneFallback />}>
        <LazyNamingScreen
          rock={namingRock}
          username={username}
          mutation={mutation}
          onCancel={() => setNamingRock(null)}
          onSignOut={onSignOut}
          onAdopted={async () => {
            await onServerStateChanged()
            setNamingRock(null)
          }}
        />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<SceneFallback />}>
      <LazyShowroom username={username} onSignOut={onSignOut} onAdopt={setNamingRock} />
    </Suspense>
  )
}

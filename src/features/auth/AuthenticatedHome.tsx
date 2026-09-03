import { useEffect, useState } from 'react'

import type { RockCatalogEntry } from '../../content/rockCatalog'
import { adoptRock } from '../adoption/adoptionApi'
import { EmptyRockState } from '../adoption/EmptyRockState'
import { NamingScreen } from '../adoption/NamingScreen'
import type { ActiveRock, AdoptRockMutation } from '../adoption/adoptionTypes'
import type { LoadRockBioSnapshot } from '../bio/bioTypes'
import type { RegisterCaressMutation, RockEconomySnapshot } from '../caress/caressTypes'
import type { RegisterCleaningMutation } from '../cleaning/cleaningTypes'
import type { DiscardRockMutation } from '../discard/discardTypes'
import { Step11Pedestal } from '../pedestal/Step11Pedestal'
import { Showroom } from '../showroom/Showroom'
import type { AuthenticatedDestination } from './authRules'

interface AuthenticatedHomeProps {
  username: string
  destination: AuthenticatedDestination
  activeRock: ActiveRock | null
  economy: RockEconomySnapshot | null
  onServerStateChanged: () => Promise<void>
  onSignOut: () => Promise<void>
  adoptRockMutation?: AdoptRockMutation
  registerCaressMutation?: RegisterCaressMutation
  registerCleaningMutation?: RegisterCleaningMutation
  loadBioSnapshot?: LoadRockBioSnapshot
  discardRockMutation?: DiscardRockMutation
}

export function AuthenticatedHome({
  username,
  destination,
  activeRock,
  economy,
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
      <Step11Pedestal
        activeRock={activeRock}
        economy={economy}
        username={username}
        onServerStateChanged={onServerStateChanged}
        onSignOut={onSignOut}
        registerCaressMutation={registerCaressMutation}
        registerCleaningMutation={registerCleaningMutation}
        loadBioSnapshot={loadBioSnapshot}
        discardRockMutation={discardRockMutation}
      />
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
      <NamingScreen
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
    )
  }

  return <Showroom username={username} onSignOut={onSignOut} onAdopt={setNamingRock} />
}

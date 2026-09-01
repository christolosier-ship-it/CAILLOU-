import { useState } from 'react'

import type { RockCatalogEntry } from '../../content/rockCatalog'
import { adoptRock } from '../adoption/adoptionApi'
import { NamingScreen } from '../adoption/NamingScreen'
import type { ActiveRock, AdoptRockMutation } from '../adoption/adoptionTypes'
import type { RegisterCaressMutation, RockEconomySnapshot } from '../caress/caressTypes'
import { Pedestal } from '../pedestal/Pedestal'
import { Showroom } from '../showroom/Showroom'

interface AuthenticatedHomeProps {
  username: string
  destination: 'showroom' | 'socle'
  activeRock: ActiveRock | null
  economy: RockEconomySnapshot | null
  onServerStateChanged: () => Promise<void>
  onSignOut: () => Promise<void>
  adoptRockMutation?: AdoptRockMutation
  registerCaressMutation?: RegisterCaressMutation
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
}: AuthenticatedHomeProps) {
  const [namingRock, setNamingRock] = useState<RockCatalogEntry | null>(null)
  const mutation = adoptRockMutation ?? adoptRock

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
      <Pedestal
        activeRock={activeRock}
        economy={economy}
        username={username}
        onServerStateChanged={onServerStateChanged}
        onSignOut={onSignOut}
        registerCaressMutation={registerCaressMutation}
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

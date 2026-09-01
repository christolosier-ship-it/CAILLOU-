import { useState } from 'react'

import type { RockCatalogEntry } from '../../content/rockCatalog'
import { adoptRock } from '../adoption/adoptionApi'
import { NamingScreen } from '../adoption/NamingScreen'
import type { ActiveRock, AdoptRockMutation } from '../adoption/adoptionTypes'
import { Pedestal } from '../pedestal/Pedestal'
import { Showroom } from '../showroom/Showroom'

interface AuthenticatedHomeProps {
  username: string
  destination: 'showroom' | 'socle'
  activeRock: ActiveRock | null
  onServerStateChanged: () => Promise<void>
  onSignOut: () => Promise<void>
  adoptRockMutation?: AdoptRockMutation
}

export function AuthenticatedHome({
  username,
  destination,
  activeRock,
  onServerStateChanged,
  onSignOut,
  adoptRockMutation,
}: AuthenticatedHomeProps) {
  const [namingRock, setNamingRock] = useState<RockCatalogEntry | null>(null)
  const mutation = adoptRockMutation ?? adoptRock

  if (destination === 'socle' && activeRock) {
    return <Pedestal activeRock={activeRock} username={username} onSignOut={onSignOut} />
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

import { useCallback, useEffect, useRef, useState } from 'react'

import type { Session } from '@supabase/supabase-js'

import type { RockId } from '../../content/rockCatalog'
import { supabase } from '../../lib/supabase/client'
import type { ActiveRock } from '../adoption/adoptionTypes'
import type { RockEconomySnapshot } from '../caress/caressTypes'
import { parseRockPosition, parseRockRotation } from '../rockMovement/rockMovementRules'
import { resolveAuthenticatedDestination } from './authRules'
import type { AuthenticatedDestination } from './authRules'

const USERNAME_CACHE = 'caillou.auth.username'
const SESSION_SEEN = 'caillou.auth.session-seen'

interface CanonicalRockRow {
  id: string
  specimen_id: string
  name: string
  adopted_at: string
  last_cleaned_at: string | null
  pose_position: unknown
  pose_rotation: unknown
  pose_stabilized_at: string | null
}

interface MaybeSingleQuery<T> {
  select: (columns: string) => MaybeSingleQuery<T>
  eq: (column: string, value: unknown) => MaybeSingleQuery<T>
  is: (column: string, value: null) => MaybeSingleQuery<T>
  maybeSingle: () => Promise<{ data: T | null; error: Error | null }>
}

const rawFrom = supabase.from.bind(supabase) as unknown as <T>(table: string) => MaybeSingleQuery<T>

export type AuthSessionState =
  | { status: 'loading' }
  | { status: 'signed-out'; message?: string }
  | { status: 'offline'; username?: string }
  | {
    status: 'authenticated'
    username: string
    destination: AuthenticatedDestination
    activeRock: ActiveRock | null
    economy: RockEconomySnapshot | null
  }

export function useAuthSession() {
  const [state, setState] = useState<AuthSessionState>({ status: 'loading' })
  const explicitSignOut = useRef(false)

  const hydrate = useCallback(async (session: Session) => {
    const cachedUsername = localStorage.getItem(USERNAME_CACHE)

    try {
      const [
        { data: profile, error: profileError },
        { data: rock, error: rockError },
        { data: wallet, error: walletError },
        { data: rockHistory, error: rockHistoryError },
      ] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', session.user.id).single(),
        rawFrom<CanonicalRockRow>('user_rocks')
          .select('id, specimen_id, name, adopted_at, last_cleaned_at, pose_position, pose_rotation, pose_stabilized_at')
          .eq('user_id', session.user.id)
          .is('discarded_at', null)
          .maybeSingle(),
        supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', session.user.id)
          .single(),
        supabase.from('user_rocks').select('id').eq('user_id', session.user.id).limit(1),
      ])

      if (profileError || !profile || rockError || walletError || !wallet || rockHistoryError) {
        throw profileError ?? rockError ?? walletError ?? rockHistoryError ?? new Error('Canonical session state missing')
      }

      const activeRock: ActiveRock | null = rock ? {
        id: rock.id,
        specimenId: rock.specimen_id as RockId,
        name: rock.name,
        adoptedAt: rock.adopted_at,
        lastCleanedAt: rock.last_cleaned_at,
        posePosition: parseRockPosition(rock.pose_position),
        poseRotation: parseRockRotation(rock.pose_rotation),
        poseStabilizedAt: rock.pose_stabilized_at,
      } : null

      let economy: RockEconomySnapshot | null = null
      if (rock) {
        const { data: progress, error: progressError } = await supabase
          .from('rock_progress')
          .select('caress_count, cleaning_count, lithons_generated')
          .eq('user_rock_id', rock.id)
          .single()

        if (progressError || !progress) throw progressError ?? new Error('Rock progress missing')

        economy = {
          balance: wallet.balance,
          caressCount: progress.caress_count,
          cleaningCount: progress.cleaning_count,
          lithonsGenerated: progress.lithons_generated,
        }
      }

      localStorage.setItem(USERNAME_CACHE, profile.username)
      localStorage.setItem(SESSION_SEEN, '1')
      setState({
        status: 'authenticated',
        username: profile.username,
        destination: resolveAuthenticatedDestination(activeRock !== null, (rockHistory?.length ?? 0) > 0),
        activeRock,
        economy,
      })
    } catch {
      setState(cachedUsername ? { status: 'offline', username: cachedUsername } : { status: 'offline' })
    }
  }, [])

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session) {
      const hadSession = localStorage.getItem(SESSION_SEEN) === '1'
      setState(
        hadSession && !explicitSignOut.current
          ? { status: 'signed-out', message: 'Votre session a expiré. Reconnectez-vous.' }
          : { status: 'signed-out' },
      )
      return
    }

    await hydrate(data.session)
  }, [hydrate])

  useEffect(() => {
    void refresh()
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        void hydrate(session)
      } else if (event === 'SIGNED_OUT' && !explicitSignOut.current) {
        setState({ status: 'signed-out', message: 'Votre session a expiré. Reconnectez-vous.' })
      }
    })

    return () => data.subscription.unsubscribe()
  }, [hydrate, refresh])

  const signOut = useCallback(async () => {
    explicitSignOut.current = true
    await supabase.auth.signOut({ scope: 'local' })
    localStorage.removeItem(USERNAME_CACHE)
    localStorage.removeItem(SESSION_SEEN)
    setState({ status: 'signed-out' })
    explicitSignOut.current = false
  }, [])

  return { state, refresh, signOut }
}

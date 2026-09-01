import { useCallback, useEffect, useRef, useState } from 'react'

import type { Session } from '@supabase/supabase-js'

import type { RockId } from '../../content/rockCatalog'
import { supabase } from '../../lib/supabase/client'
import type { ActiveRock } from '../adoption/adoptionTypes'
import type { RockEconomySnapshot } from '../caress/caressTypes'
import { resolveAuthenticatedDestination } from './authRules'

const USERNAME_CACHE = 'caillou.auth.username'
const SESSION_SEEN = 'caillou.auth.session-seen'

export type AuthSessionState =
  | { status: 'loading' }
  | { status: 'signed-out'; message?: string }
  | { status: 'offline'; username?: string }
  | {
    status: 'authenticated'
    username: string
    destination: 'showroom' | 'socle'
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
      ] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', session.user.id).single(),
        supabase
          .from('user_rocks')
          .select('id, specimen_id, name, adopted_at, last_cleaned_at')
          .eq('user_id', session.user.id)
          .is('discarded_at', null)
          .maybeSingle(),
        supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', session.user.id)
          .single(),
      ])

      if (profileError || !profile || rockError || walletError || !wallet) {
        throw profileError ?? rockError ?? walletError ?? new Error('Canonical session state missing')
      }

      const activeRock: ActiveRock | null = rock ? {
        id: rock.id,
        specimenId: rock.specimen_id as RockId,
        name: rock.name,
        adoptedAt: rock.adopted_at,
        lastCleanedAt: rock.last_cleaned_at,
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
        destination: resolveAuthenticatedDestination(activeRock !== null),
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

import { useCallback, useEffect, useRef, useState } from 'react'

import type { Session } from '@supabase/supabase-js'

import { supabase } from '../../lib/supabase/client'
import { resolveAuthenticatedDestination } from './authRules'

const USERNAME_CACHE = 'caillou.auth.username'
const SESSION_SEEN = 'caillou.auth.session-seen'

export type AuthSessionState =
  | { status: 'loading' }
  | { status: 'signed-out'; message?: string }
  | { status: 'offline'; username?: string }
  | { status: 'authenticated'; username: string; destination: 'showroom' | 'socle' }

export function useAuthSession() {
  const [state, setState] = useState<AuthSessionState>({ status: 'loading' })
  const explicitSignOut = useRef(false)

  const hydrate = useCallback(async (session: Session) => {
    const cachedUsername = localStorage.getItem(USERNAME_CACHE) ?? undefined

    try {
      const [{ data: profile, error: profileError }, { data: rocks, error: rocksError }] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', session.user.id).single(),
        supabase.from('user_rocks').select('id').is('discarded_at', null).limit(1),
      ])

      if (profileError || !profile || rocksError) throw profileError ?? rocksError ?? new Error('Profile missing')

      localStorage.setItem(USERNAME_CACHE, profile.username)
      localStorage.setItem(SESSION_SEEN, '1')
      setState({
        status: 'authenticated',
        username: profile.username,
        destination: resolveAuthenticatedDestination((rocks?.length ?? 0) > 0),
      })
    } catch {
      setState({ status: 'offline', username: cachedUsername })
    }
  }, [])

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session) {
      const hadSession = localStorage.getItem(SESSION_SEEN) === '1'
      setState({
        status: 'signed-out',
        message: hadSession && !explicitSignOut.current ? 'Votre session a expiré. Reconnectez-vous.' : undefined,
      })
      return
    }

    await hydrate(data.session)
  }, [hydrate])

  useEffect(() => {
    void refresh()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void hydrate(session)
      else if (!explicitSignOut.current) setState({ status: 'signed-out', message: 'Votre session a expiré. Reconnectez-vous.' })
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

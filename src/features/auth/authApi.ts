import { supabase } from '../../lib/supabase/client'
import { authFunctionBaseUrl, supabasePublishableKey } from '../../lib/supabase/config'

interface BrokerSession {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number | null
  token_type: string
}

interface BrokerSuccess {
  username: string
  session: BrokerSession
}

interface BrokerFailure {
  code?: string
  message?: string
}

export class AuthBrokerError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AuthBrokerError'
    this.code = code
  }
}

async function callBroker(endpoint: 'auth-register' | 'auth-login', username: string, password: string) {
  let response: Response

  try {
    response = await fetch(`${authFunctionBaseUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabasePublishableKey,
      },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    throw new AuthBrokerError('network_error', 'Réseau indisponible. Réessaie quand la connexion revient.')
  }

  const payload = (await response.json().catch(() => ({}))) as BrokerSuccess | BrokerFailure

  if (!response.ok || !('session' in payload)) {
    throw new AuthBrokerError(
      'code' in payload && payload.code ? payload.code : 'auth_failed',
      'message' in payload && payload.message ? payload.message : 'Authentification impossible pour le moment.',
    )
  }

  const { error } = await supabase.auth.setSession({
    access_token: payload.session.access_token,
    refresh_token: payload.session.refresh_token,
  })

  if (error) throw new AuthBrokerError('session_failed', 'La session n’a pas pu être enregistrée.')
  return payload.username
}

export function registerWithPseudo(username: string, password: string) {
  return callBroker('auth-register', username, password)
}

export function loginWithPseudo(username: string, password: string) {
  return callBroker('auth-login', username, password)
}

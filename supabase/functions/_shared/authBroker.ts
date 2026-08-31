import { createClient, type Session, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}

export function json(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: corsHeaders })
}

function namedKey(envName: string, fallbackName: string) {
  const raw = Deno.env.get(envName)
  if (raw) {
    const keys = JSON.parse(raw) as Record<string, string>
    if (keys.default) return keys.default
  }

  const fallback = Deno.env.get(fallbackName)
  if (!fallback) throw new Error(`Missing ${envName}/${fallbackName}`)
  return fallback
}

function publishableKeys() {
  const raw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  if (raw) return Object.values(JSON.parse(raw) as Record<string, string>)

  const fallback = Deno.env.get('SUPABASE_ANON_KEY')
  return fallback ? [fallback] : []
}

export function requirePublishableKey(req: Request) {
  const provided = req.headers.get('apikey')
  return Boolean(provided && publishableKeys().includes(provided))
}

export function normalizeUsername(raw: string) {
  const display = raw.trim().replace(/\s+/gu, ' ')
  return { display, normalized: display.toLocaleLowerCase('fr-FR') }
}

function usernameError(username: string) {
  const { display } = normalizeUsername(username)
  const length = [...display].length

  if (length < 3 || length > 24) return 'Le pseudo doit contenir entre 3 et 24 caractères.'
  if (!/^[\p{L}\p{N}](?:[\p{L}\p{N} ._-]*[\p{L}\p{N}])?$/u.test(display)) {
    return 'Le pseudo peut contenir lettres, chiffres, espaces, point, tiret et underscore.'
  }

  return null
}

function passwordError(password: string) {
  const length = [...password].length
  if (length < 10) return 'Le mot de passe doit contenir au moins 10 caractères.'
  if (length > 128) return 'Le mot de passe est trop long.'
  return null
}

export async function readCredentials(
  req: Request,
  registration: boolean,
): Promise<{ username: string; password: string } | { error: Response }> {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return { error: json({ code: 'invalid_payload', message: 'Requête invalide.' }, 400) }
  }

  if (!body || typeof body !== 'object') {
    return { error: json({ code: 'invalid_payload', message: 'Requête invalide.' }, 400) }
  }

  const record = body as Record<string, unknown>
  if (typeof record.username !== 'string' || typeof record.password !== 'string') {
    return { error: json({ code: 'invalid_payload', message: 'Pseudo et mot de passe requis.' }, 400) }
  }

  if (registration) {
    const userError = usernameError(record.username)
    if (userError) return { error: json({ code: 'invalid_username', message: userError }, 422) }

    const passError = passwordError(record.password)
    if (passError) return { error: json({ code: 'invalid_password', message: passError }, 422) }
  } else if (!record.username.trim() || !record.password) {
    return { error: json({ code: 'invalid_credentials', message: 'Pseudo ou mot de passe incorrect.' }, 401) }
  }

  return { username: record.username, password: record.password }
}

export function createAuthClients(): { admin: SupabaseClient; publicClient: SupabaseClient } {
  const url = Deno.env.get('SUPABASE_URL')
  if (!url) throw new Error('Missing SUPABASE_URL')

  const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }

  return {
    admin: createClient(url, namedKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'), { auth }),
    publicClient: createClient(url, namedKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'), { auth }),
  }
}

export function sessionResponse(session: Session) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at ?? null,
    token_type: session.token_type,
  }
}

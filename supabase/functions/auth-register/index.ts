import {
  createAuthClients,
  corsHeaders,
  json,
  normalizeUsername,
  rateLimitKey,
  readCredentials,
  requirePublishableKey,
  sessionResponse,
  trustedClientAddress,
} from '../_shared/authBroker.ts'

const REGISTRATION_LIMIT = 5
const REGISTRATION_WINDOW_SECONDS = 15 * 60

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ code: 'method_not_allowed', message: 'Méthode non autorisée.' }, 405)
  if (!requirePublishableKey(req)) return json({ code: 'unauthorized_client', message: 'Client non autorisé.' }, 401)

  const credentials = await readCredentials(req, true)
  if ('error' in credentials) return credentials.error

  const { display, normalized } = normalizeUsername(credentials.username)
  const { admin, publicClient } = createAuthClients()
  const clientAddress = trustedClientAddress(req)

  if (!clientAddress) {
    return json({ code: 'registration_unavailable', message: 'Impossible de créer le compte pour le moment.' }, 503)
  }

  const quotaKey = await rateLimitKey('registration-ip', clientAddress)
  const { data: quotaAllowed, error: quotaError } = await admin.rpc('consume_auth_rate_limit', {
    p_key_hash: quotaKey,
    p_limit: REGISTRATION_LIMIT,
    p_window_seconds: REGISTRATION_WINDOW_SECONDS,
  })

  if (quotaError) {
    console.error('registration rate-limit failure', quotaError.code)
    return json({ code: 'registration_unavailable', message: 'Impossible de créer le compte pour le moment.' }, 503)
  }

  if (quotaAllowed !== true) {
    return json(
      { code: 'registration_rate_limited', message: 'Trop de tentatives de création de compte. Réessaie un peu plus tard.' },
      429,
      { 'Retry-After': String(REGISTRATION_WINDOW_SECONDS) },
    )
  }

  const { data: existingProfile, error: lookupError } = await admin
    .from('profiles')
    .select('id')
    .eq('username_normalized', normalized)
    .maybeSingle()

  if (lookupError) return json({ code: 'registration_failed', message: 'Impossible de créer le compte pour le moment.' }, 500)
  if (existingProfile) return json({ code: 'username_taken', message: 'Ce pseudo est déjà pris.' }, 409)

  const internalEmail = `${crypto.randomUUID()}@auth.caillou.invalid`
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: internalEmail,
    password: credentials.password,
    email_confirm: true,
  })

  const userId = authData.user?.id
  if (authError || !userId) return json({ code: 'registration_failed', message: 'Impossible de créer le compte pour le moment.' }, 500)

  const cleanup = async () => {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined)
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    username: display,
    username_normalized: normalized,
  })

  if (profileError) {
    await cleanup()
    if (profileError.code === '23505') return json({ code: 'username_taken', message: 'Ce pseudo est déjà pris.' }, 409)
    return json({ code: 'registration_failed', message: 'Impossible de créer le compte pour le moment.' }, 500)
  }

  const { data: loginData, error: loginError } = await publicClient.auth.signInWithPassword({
    email: internalEmail,
    password: credentials.password,
  })

  if (loginError || !loginData.session) {
    await cleanup()
    return json({ code: 'registration_failed', message: 'Impossible d’ouvrir la session.' }, 500)
  }

  return json({ username: display, session: sessionResponse(loginData.session) }, 201)
})

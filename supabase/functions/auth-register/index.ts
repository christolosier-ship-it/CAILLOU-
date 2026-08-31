import {
  createAuthClients,
  corsHeaders,
  json,
  normalizeUsername,
  readCredentials,
  requirePublishableKey,
  sessionResponse,
} from '../_shared/authBroker.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ code: 'method_not_allowed', message: 'Méthode non autorisée.' }, 405)
  if (!requirePublishableKey(req)) return json({ code: 'unauthorized_client', message: 'Client non autorisé.' }, 401)

  const credentials = await readCredentials(req, true)
  if ('error' in credentials) return credentials.error

  const { display, normalized } = normalizeUsername(credentials.username)
  const { admin, publicClient } = createAuthClients()

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

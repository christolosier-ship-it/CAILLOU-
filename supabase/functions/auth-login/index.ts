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

  const credentials = await readCredentials(req, false)
  if ('error' in credentials) return credentials.error

  const { normalized } = normalizeUsername(credentials.username)
  const { admin, publicClient } = createAuthClients()

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, username')
    .eq('username_normalized', normalized)
    .maybeSingle()

  if (profileError || !profile) return json({ code: 'invalid_credentials', message: 'Pseudo ou mot de passe incorrect.' }, 401)

  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profile.id)
  const internalEmail = authUser.user?.email
  if (authUserError || !internalEmail) return json({ code: 'invalid_credentials', message: 'Pseudo ou mot de passe incorrect.' }, 401)

  const { data: loginData, error: loginError } = await publicClient.auth.signInWithPassword({
    email: internalEmail,
    password: credentials.password,
  })

  if (loginError || !loginData.session) return json({ code: 'invalid_credentials', message: 'Pseudo ou mot de passe incorrect.' }, 401)

  return json({ username: profile.username, session: sessionResponse(loginData.session) })
})

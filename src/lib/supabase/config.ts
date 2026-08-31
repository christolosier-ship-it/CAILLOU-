const FALLBACK_URL = 'https://zibhzhpvtiplbkhioqco.supabase.co'
const FALLBACK_PUBLISHABLE_KEY = 'sb_publishable_znIFboPQpTVTSPLcBaO3Dg_3sixP54-'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL
export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_PUBLISHABLE_KEY

export const authFunctionBaseUrl = `${supabaseUrl}/functions/v1`

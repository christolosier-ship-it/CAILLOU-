import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types'
import { supabasePublishableKey, supabaseUrl } from './config'

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

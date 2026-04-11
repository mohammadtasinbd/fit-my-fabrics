import { createClient } from '@supabase/supabase-js'

// Ei duita jinish Supabase Settings theke paben
const supabaseUrl = 'https://wlnucjzvkuuyhllcyudn.supabase.co'
const supabaseAnonKey = 'sb_publishable_LrTk44uR8yul05adkOCVvA_iTukBhA0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

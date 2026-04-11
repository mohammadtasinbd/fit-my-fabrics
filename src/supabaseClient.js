import { createClient } from '@supabase/supabase-js'
import.meta.env.VITE_SUPABASE_URL
// Ei duita jinish Supabase Settings theke paben
const supabaseUrl = 'VITE_SUPABASE_URL=https://wlnucjzvkuuyhllcyudn.supabase.co'
const supabaseAnonKey = 'VITE_SUPABASE_ANON_KEY=sb_publishable_LrTk44uR8yul05adkOCVvA_iTukBhA0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

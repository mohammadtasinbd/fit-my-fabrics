import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wlnucjzvkuuyhllcyudn.supabase.co'
const supabaseAnonKey = 'sb_publishable_LrTk44uR8yul05adkOCVvA_iTukBhA0' // Ekhane apnar copy kora key ta thakbe

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

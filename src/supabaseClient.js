import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://apnar-project-id.supabase.co'
const supabaseAnonKey = 'sb_publishable_...' // Ekhane apnar copy kora key ta thakbe

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

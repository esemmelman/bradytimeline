import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? 'https://fgomaujsdblpzxhnnqrg.supabase.co',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_JOUqLZDnfGu_yCa6k6FVDQ_AYwpr72i',
  { auth: { storageKey: 'brady-timeline-auth-v1' } },
)

export const editorEmail = import.meta.env.VITE_EDITOR_EMAIL ?? 'esemmoc+bradytimeline@gmail.com'

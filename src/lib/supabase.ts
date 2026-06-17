import { createClient } from '@supabase/supabase-js'

// El panel usa el MISMO proyecto Supabase que la app principal.
// Solo anon key en el cliente — el acceso cross-tenant va por Edge Functions (service_role).
const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn('[admin] Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY (.env.local)')
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: true, autoRefreshToken: true },
})

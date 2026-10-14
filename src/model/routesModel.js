import { supabase } from '@/lib/supabase'

// Model: talks to the database only. Each function returns Supabase's
// { data, error } unchanged; the controller decides what to do with errors.

export function listRoutes() {
  return supabase.from('routes').select('*')
}

export function getRoute(id) {
  return supabase.from('routes').select('*').eq('id', id).maybeSingle()
}

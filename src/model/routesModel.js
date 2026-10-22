import { supabase } from '@/lib/supabase'

// Model: talks to the database only. Each function returns Supabase's
// { data, error } unchanged; the controller decides what to do with errors.

export function listRoutes() {
  return supabase.from('routes').select('*')
}

export function getRoute(id) {
  return supabase.from('routes').select('*').eq('id', id).maybeSingle()
}

// Row Level Security already hides alerts that are not active or are outside
// their time window, so this returns only what hikers should see.
export function listAlertsForRoute(routeId) {
  return supabase
    .from('route_alerts')
    .select('id, severity, title, message, starts_at, ends_at')
    .eq('route_id', routeId)
    .order('starts_at', { ascending: false })
}

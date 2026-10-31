import { supabase } from '@/lib/supabase'

// Model: talks to the database only. Each function returns Supabase's
// { data, error } unchanged; the controller decides what to do with errors.

export function listRoutes() {
  return supabase.from('routes').select('*')
}

// Just what the browse filters and tiles need. line_svg is a small ready-made path for the
// tile, so browse doesn't download every full line (geometry).
export function listRouteTiles() {
  return supabase
    .from('routes')
    .select(
      'id, name, country, distance_km, elevation_gain_m, duration_days, is_multiday, effective_difficulty, official_difficulty, technical_rating, line_svg',
    )
}

// Just what the globe's pills and cards need. Leaves out each route's full line (geometry),
// which is several MB across all routes; the globe loads a line only when it shows one.
export function listRouteSummaries() {
  return supabase
    .from('routes')
    .select(
      'id, name, country, latitude, longitude, distance_km, duration_days, avg_rating, effective_difficulty, official_difficulty, technical_rating',
    )
}

export function getRouteGeometry(id) {
  return supabase.from('routes').select('geometry').eq('id', id).maybeSingle()
}

export function getRoute(id) {
  return supabase.from('routes').select('*').eq('id', id).maybeSingle()
}

// just the columns experienceFromRoute in src/lib/matching.js reads
export function getRouteExperience(id) {
  return supabase
    .from('routes')
    .select('distance_km, elevation_gain_m, altitude_m, duration_days, is_multiday')
    .eq('id', id)
    .maybeSingle()
}

export function listRoutesByIds(ids) {
  return supabase.from('routes').select('id, name, country, distance_km').in('id', ids)
}

// Only published alerts inside their time window. Row Level Security already
// limits hikers to these, but admins can read every alert, so filter here too.
function liveAlerts() {
  const now = new Date().toISOString()
  return supabase
    .from('route_alerts')
    .select('id, route_id, severity, title, message, starts_at, ends_at')
    .eq('status', 'active')
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order('starts_at', { ascending: false })
}

export function listAlertsForRoute(routeId) {
  return liveAlerts().eq('route_id', routeId)
}

export function listAlertsForRoutes(routeIds) {
  return liveAlerts().in('route_id', routeIds)
}

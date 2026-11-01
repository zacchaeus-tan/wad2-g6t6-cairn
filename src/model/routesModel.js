import { supabase } from '@/lib/supabase'
import { alertsHaveReports, withLiveReportCount } from '@/lib/alertDrafts'

// Model: talks to the database only. Each function returns Supabase's
// { data, error } unchanged; the controller decides what to do with errors.

export function listRoutes() {
  return supabase.from('routes').select('*')
}

// Just what the browse filters and tiles need. line_svg is a small ready-made path for the
// tile, so browse doesn't download every full line (geometry).
const TILE_COLUMNS =
  'id, name, country, distance_km, elevation_gain_m, duration_days, is_multiday, effective_difficulty, official_difficulty, technical_rating, line_svg'

export function listRouteTiles() {
  return supabase.from('routes').select(TILE_COLUMNS)
}

// The named routes, with what a tile needs
export function listFeaturedRoutes(names) {
  return supabase.from('routes').select(TILE_COLUMNS).in('name', names)
}

export function countRoutes() {
  return supabase.from('routes').select('id', { count: 'exact', head: true })
}

// Just what the globe's pills and cards need. Leaves out each route's full line (geometry),
// which is several MB across all routes; the globe loads a line only when it shows one.
export function listRouteSummaries() {
  return supabase
    .from('routes')
    .select(
      'id, name, country, latitude, longitude, distance_km, elevation_gain_m, altitude_m, duration_days, avg_rating, effective_difficulty, official_difficulty, technical_rating',
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

// The same window the admin page counts serious reports over.
const REPORT_COUNT_MONTHS = 12

// Only published alerts inside their time window. Row Level Security already
// limits hikers to these, but admins can read every alert, so filter here too.
function liveAlerts() {
  const now = new Date().toISOString()
  return supabase
    .from('route_alerts')
    .select('id, route_id, severity, title, message, starts_at, ends_at, external_ref')
    .eq('status', 'active')
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order('starts_at', { ascending: false })
}

// Fills in how many hikers have reported each alert's problem. If the count can't be loaded, the
// alert still shows with its published text, since a safety notice matters more than its count.
async function withReportCounts(alertsQuery) {
  const result = await alertsQuery
  if (result.error || !alertsHaveReports(result.data)) return result

  const since = new Date()
  since.setMonth(since.getMonth() - REPORT_COUNT_MONTHS)
  const { data: incidents, error } = await supabase
    .from('review_incidents')
    .select('route_id, point_id, category, created_at, reviews!inner(user_id)')
    .in('route_id', [...new Set(result.data.map((alert) => alert.route_id))])
    .gt('created_at', since.toISOString())

  if (error) {
    console.warn('Could not load report counts for notices:', error.message)
    return result
  }
  return { ...result, data: result.data.map((alert) => withLiveReportCount(alert, incidents)) }
}

export function listAlertsForRoute(routeId) {
  return withReportCounts(liveAlerts().eq('route_id', routeId))
}

export function listAlertsForRoutes(routeIds) {
  return withReportCounts(liveAlerts().in('route_id', routeIds))
}

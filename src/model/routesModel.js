import { supabase } from '@/lib/supabase'

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
import { supabase } from '@/lib/supabase'

// Admin page queries. Row Level Security limits the writes to admins, so
// these fail with a permission error for anyone else.

const ROUTE_SUMMARY = 'id, name, country'

// Every alert regardless of status; admins can read them all.
export function listAlerts() {
  return supabase
    .from('route_alerts')
    .select(`*, routes(${ROUTE_SUMMARY})`)
    .order('created_at', { ascending: false })
}

export function insertAlert({ routeId, severity, title, message, startsAt, endsAt, createdBy }) {
  return supabase
    .from('route_alerts')
    .insert({
      route_id: routeId,
      source: 'manual',
      severity,
      title,
      message: message || null,
      status: 'active',
      starts_at: startsAt || new Date().toISOString(),
      ends_at: endsAt || null,
      created_by: createdBy,
    })
    .select()
    .single()
}

export function updateAlertStatus(alertId, status) {
  return supabase.from('route_alerts').update({ status }).eq('id', alertId)
}

// Routes the community has flagged as more hazardous than usual.
export function listHazardRoutes() {
  return supabase
    .from('routes')
    .select(`${ROUTE_SUMMARY}, community_hazard_level, community_hazard_note, review_count`)
    .neq('community_hazard_level', 'low')
    .order('community_hazard_level', { ascending: true })
}

// Checkpoint hazards reported by at least two different hikers. This is a
// view, so the route name is joined in the controller rather than embedded.
export function listPointWarnings() {
  return supabase
    .from('route_point_warnings')
    .select('*')
    .order('severity', { ascending: false })
}

// Columns needed for the difficulty and data-quality checks, which are done
// in the controller because PostgREST cannot filter on a computed difference.
export function listRoutesForChecks() {
  return supabase
    .from('routes')
    .select(
      `${ROUTE_SUMMARY}, official_difficulty, effective_difficulty, review_count, distance_km,
       latitude, longitude, safety_status, safety_status_note, geometry_present:geometry->>type,
       route_points(count)`,
    )
    .order('name')
}

export function updateRouteSafety(routeId, { safetyStatus, safetyStatusNote }) {
  return supabase
    .from('routes')
    .update({ safety_status: safetyStatus, safety_status_note: safetyStatusNote || null })
    .eq('id', routeId)
    .select(`${ROUTE_SUMMARY}, safety_status, safety_status_note`)
    .single()
}

// Most recent runs of the scheduled jobs, newest first.
export function listJobRuns() {
  return supabase.from('job_runs').select('*').order('started_at', { ascending: false }).limit(10)
}

// The function checks that the caller is an admin before running.
export function runWeatherCheck() {
  return supabase.functions.invoke('check-weather')
}

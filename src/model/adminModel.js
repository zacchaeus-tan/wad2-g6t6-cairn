import { supabase } from '@/lib/supabase'

// Admin page queries. Row Level Security limits the writes to admins, so
// these fail with a permission error for anyone else.

const ROUTE_SUMMARY = 'id, name, country'

// Every alert regardless of status; admins can read them all. creator and
// editor are the admins who published it and who last changed it.
export function listAlerts() {
  return supabase
    .from('route_alerts')
    .select(
      `*, routes(${ROUTE_SUMMARY}),
       creator:profiles!route_alerts_created_by_fkey(display_name),
       editor:profiles!route_alerts_updated_by_fkey(display_name)`,
    )
    .order('created_at', { ascending: false })
}

// source and externalRef are set when the alert was raised from a hiker report.
export function insertAlert({
  routeId,
  severity,
  title,
  message,
  startsAt,
  endsAt,
  createdBy,
  source,
  externalRef,
}) {
  return supabase
    .from('route_alerts')
    .insert({
      route_id: routeId,
      source: source || 'manual',
      external_ref: externalRef || null,
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

export function updateAlert(alertId, { routeId, severity, title, message, startsAt, endsAt }) {
  return supabase
    .from('route_alerts')
    .update({
      route_id: routeId,
      severity,
      title,
      message: message || null,
      starts_at: startsAt || new Date().toISOString(),
      ends_at: endsAt || null,
    })
    .eq('id', alertId)
}

// Reports an admin marked "Reviewed, no action".
export function listReportReviews() {
  return supabase.from('admin_report_reviews').select('*')
}

export function markReportReviewed(routeId, reportRef) {
  return supabase
    .from('admin_report_reviews')
    .upsert(
      { route_id: routeId, report_ref: reportRef, reviewed_at: new Date().toISOString() },
      { onConflict: 'route_id,report_ref' },
    )
    .select()
    .single()
}

export function updateOfficialDifficulty(routeId, grade) {
  return supabase.from('routes').update({ official_difficulty: grade }).eq('id', routeId)
}

// Routes the community has flagged as more hazardous than usual.
export function listHazardRoutes() {
  return supabase
    .from('routes')
    .select(
      `${ROUTE_SUMMARY}, community_hazard_level, community_hazard_note, review_count, stats_updated_at`,
    )
    .neq('community_hazard_level', 'low')
    .order('community_hazard_level', { ascending: true })
}

// Checkpoint hazards reported by at least two different hikers. This is a
// view, so the route name is joined in the controller rather than embedded.
export function listPointWarnings() {
  return supabase.from('route_point_warnings').select('*').order('severity', { ascending: false })
}

// Columns needed for the difficulty and data-quality checks, which are done
// in the controller because PostgREST cannot filter on a computed difference.
export function listRoutesForChecks() {
  return supabase
    .from('routes')
    .select(
      `${ROUTE_SUMMARY}, official_difficulty, effective_difficulty, review_count, stats_updated_at, distance_km,
       latitude, longitude, safety_status, safety_status_note, geometry_present:geometry->>type`,
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

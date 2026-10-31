import { formatDate } from '@/lib/format'

// Drafts for the admin "Publish an alert" form, built from hiker reports, so
// an admin only has to check the wording and publish.

// How long a drafted alert stays up unless the admin changes it.
const DRAFT_DAYS = 14

// incident_categories.severity runs 1-3.
const CATEGORY_SEVERITY = { 1: 'info', 2: 'warning', 3: 'danger' }

const HAZARD_SEVERITY = { moderate: 'warning', elevated: 'danger' }

// A datetime-local input value (local time, no zone) DRAFT_DAYS from now. Also
// the default end for alerts typed in by hand, so none stay up forever.
export function defaultAlertEnd() {
  const end = new Date(Date.now() + DRAFT_DAYS * 24 * 60 * 60 * 1000)
  end.setMinutes(end.getMinutes() - end.getTimezoneOffset())
  return end.toISOString().slice(0, 16)
}

// Hiker-written notes may or may not end in punctuation.
function sentence(text) {
  const trimmed = text.trim()
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

// Alerts raised from a report keep a reference to it in external_ref, so the
// admin page can tell which reports already have a live alert. A timestamp is
// added because external_ref is unique per route, and the same report may be
// raised again once an earlier alert has ended.
export function pointWarningRef(warning) {
  return `point:${warning.point_id}:${warning.category}`
}

export const HAZARD_ROUTE_REF = 'route-hazard'

// Used when an admin keeps a route's grade after a difficulty mismatch.
export const DIFFICULTY_REF = 'difficulty'

// One grouped report from the store's unconfirmedReports.
export function unconfirmedRef(report) {
  return `unconfirmed:${report.point_id ?? 'route'}:${report.category}`
}

function linkTo(reportRef) {
  return { source: 'community', externalRef: `${reportRef}:${Date.now()}` }
}

function hikers(count) {
  return count === 1 ? '1 hiker' : `${count} hikers`
}

// One row of the route_point_warnings view.
export function draftFromPointWarning(warning) {
  const place = warning.day_number
    ? `${warning.point_name} (day ${warning.day_number})`
    : warning.point_name
  const reported = `Reported by ${hikers(warning.reporter_count)}, most recently on ${formatDate(warning.last_reported_at)}.`
  const note = warning.latest_note ? ` Latest report: "${sentence(warning.latest_note)}"` : ''

  return {
    routeId: warning.route_id,
    severity: CATEGORY_SEVERITY[warning.severity] || 'warning',
    title: `${warning.label} at ${place}`,
    message: `${reported}${note} Take extra care on this section.`,
    endsAt: defaultAlertEnd(),
    ...linkTo(pointWarningRef(warning)),
  }
}

// One hiker's serious report. Only "warning" because nobody has confirmed it yet.
export function draftFromUnconfirmedReport(report) {
  const place = report.point_name
    ? `at ${report.day_number ? `${report.point_name} (day ${report.day_number})` : report.point_name}`
    : 'on this route'
  const note = report.note ? ` Their report: "${sentence(report.note)}"` : ''

  return {
    routeId: report.route_id,
    severity: 'warning',
    title: `${report.label} reported ${place}`,
    message: `Reported by 1 hiker on ${formatDate(report.created_at)} and not yet confirmed.${note} Check conditions before you set out.`,
    endsAt: defaultAlertEnd(),
    ...linkTo(unconfirmedRef(report)),
  }
}

// A route the community has rated more hazardous than usual.
export function draftFromHazardRoute(route) {
  const note = route.community_hazard_note ? `${sentence(route.community_hazard_note)} ` : ''

  return {
    routeId: route.id,
    severity: HAZARD_SEVERITY[route.community_hazard_level] || 'warning',
    title: `Hikers report ${route.community_hazard_level} hazards on this route`,
    message: `${note}Based on recent hiker reviews. Check conditions before you set out.`,
    endsAt: defaultAlertEnd(),
    ...linkTo(HAZARD_ROUTE_REF),
  }
}

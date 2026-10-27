import { formatDate } from '@/lib/format'

// Drafts for the admin "Publish an alert" form, built from hiker reports, so
// an admin only has to check the wording and publish.

// How long a drafted alert stays up unless the admin changes it.
const DRAFT_DAYS = 14

// incident_categories.severity runs 1-3.
const CATEGORY_SEVERITY = { 1: 'info', 2: 'warning', 3: 'danger' }

const HAZARD_SEVERITY = { moderate: 'warning', elevated: 'danger' }

// A datetime-local input value (local time, no zone) DRAFT_DAYS from now.
function draftEnd() {
  const end = new Date(Date.now() + DRAFT_DAYS * 24 * 60 * 60 * 1000)
  end.setMinutes(end.getMinutes() - end.getTimezoneOffset())
  return end.toISOString().slice(0, 16)
}

// Hiker-written notes may or may not end in punctuation.
function sentence(text) {
  const trimmed = text.trim()
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function hikers(count) {
  return count === 1 ? '1 hiker' : `${count} hikers`
}

// One row of the route_point_warnings view.
export function draftFromPointWarning(warning) {
  const place = warning.day_number ? `${warning.point_name} (day ${warning.day_number})` : warning.point_name
  const reported = `Reported by ${hikers(warning.reporter_count)}, most recently on ${formatDate(warning.last_reported_at)}.`
  const note = warning.latest_note ? ` Latest report: "${sentence(warning.latest_note)}"` : ''

  return {
    routeId: warning.route_id,
    severity: CATEGORY_SEVERITY[warning.severity] || 'warning',
    title: `${warning.label} at ${place}`,
    message: `${reported}${note} Take extra care on this section.`,
    endsAt: draftEnd(),
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
    endsAt: draftEnd(),
  }
}

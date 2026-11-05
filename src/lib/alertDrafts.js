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

// A published message as separate lines, so who reported it, what they said and what to do don't
// run together. Splits at the sentences the drafts below write, which also covers alerts already
// published, and at any line breaks an admin typed.
const DRAFT_SENTENCE =
  /\s+(?=Their report:|Latest report:|One report:|Take extra care|Based on recent|Check conditions)/

// Older drafts said this, and alerts keep the text they were published with. It means a second
// hiker hasn't reported it, which reads to hikers as if nobody has checked the notice.
export function alertMessageForHikers(message) {
  return message?.replace(/ and not yet confirmed/g, '')
}

export function alertMessageLines(message) {
  return alertMessageForHikers(message)
    .split('\n')
    .flatMap((line) => line.split(DRAFT_SENTENCE))
    .map((line) => line.trim())
    .filter(Boolean)
}

// Alerts raised from a report keep a reference to it in external_ref, so the
// admin page can tell which reports already have a live alert.
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

// The same with several hikers. Includes the count, so each new hiker brings it back to the admin
// even while a notice with the older number is live.
export function repeatedRef(report) {
  return `repeated:${report.point_id ?? 'route'}:${report.category}:${report.reporter_count}`
}

// What an alert raised from a report is about, read from its external_ref. Null for anything
// else, such as a notice an admin wrote by hand or one about a route's overall hazard level.
function reportFromRef(externalRef) {
  const match = /^(?:unconfirmed|repeated|point):([^:]+):([^:]+):/.exec(externalRef ?? '')
  return match && { pointId: match[1] === 'route' ? null : match[1], category: match[2] }
}

export function alertsHaveReports(alerts) {
  return alerts.some((alert) => reportFromRef(alert.external_ref))
}

const REPORTED_SENTENCE = /^Reported by \d+ hikers?(?: on |, most recently on )[^.]*\./

// An alert's message with today's count of hikers, because its saved text only has the count from
// when it was published. A message an admin reworded is left as they wrote it. The quote stays the
// one the admin published, so a new hiker's words never reach the page without being looked at.
export function withLiveReportCount(alert, incidents) {
  const report = reportFromRef(alert.external_ref)
  if (!report || !REPORTED_SENTENCE.test(alert.message ?? '')) return alert

  const matching = incidents.filter(
    (incident) =>
      incident.route_id === alert.route_id &&
      String(incident.point_id ?? '') === String(report.pointId ?? '') &&
      incident.category === report.category,
  )
  if (!matching.length) return alert

  const count = new Set(matching.map((incident) => incident.reviews.user_id)).size
  const latest = formatDate(
    matching.reduce((a, b) => (new Date(a) > new Date(b.created_at) ? a : b.created_at), 0),
  )
  const reported =
    count === 1
      ? `Reported by 1 hiker on ${latest}.`
      : `Reported by ${count} hikers, most recently on ${latest}.`
  const message = alert.message.replace(REPORTED_SENTENCE, reported)

  return {
    ...alert,
    message: count > 1 ? message.replace(/\b(?:Their|Latest) report:/, 'One report:') : message,
  }
}

// Serious incidents, newest first, as one report per route, place and type. Counts hikers rather
// than incidents, so one hiker reporting twice stays one.
export function groupSeriousIncidents(incidents) {
  const groups = new Map()
  for (const incident of incidents) {
    const key = `${incident.route_id}|${incident.point_id}|${incident.category}`
    if (!groups.has(key)) groups.set(key, { latest: incident, reporters: new Set() })
    groups.get(key).reporters.add(incident.reviews.user_id)
  }

  return [...groups.values()].map(({ latest, reporters }) => ({
    route_id: latest.route_id,
    point_id: latest.point_id,
    category: latest.category,
    label: latest.incident_categories.label,
    point_name: latest.route_points?.name,
    day_number: latest.route_points?.day_number,
    note: latest.note,
    created_at: latest.created_at,
    reporter: latest.reviews.profiles?.display_name,
    reporter_count: reporters.size,
  }))
}

// A timestamp is added because external_ref is unique per route, and the same report may be
// raised again once an earlier alert has ended.
function linkTo(reportRef) {
  return { source: 'community', externalRef: `${reportRef}:${Date.now()}` }
}

// "Camp 2 (day 2)", or just the name when the checkpoint has no day.
function placeName(name, day) {
  return day ? `${name} (day ${day})` : name
}

// One row of the route_point_warnings view.
export function draftFromPointWarning(warning) {
  const reported = `Reported by ${warning.reporter_count} hikers, most recently on ${formatDate(warning.last_reported_at)}.`
  const note = warning.latest_note ? ` Latest report: "${sentence(warning.latest_note)}"` : ''

  return {
    routeId: warning.route_id,
    severity: CATEGORY_SEVERITY[warning.severity] || 'warning',
    title: `${warning.label} at ${placeName(warning.point_name, warning.day_number)}`,
    message: `${reported}${note} Take extra care on this section.`,
    endsAt: defaultAlertEnd(),
    ...linkTo(pointWarningRef(warning)),
  }
}

function reportPlace(report) {
  return report.point_name
    ? `at ${placeName(report.point_name, report.day_number)}`
    : 'on this route'
}

// One hiker's serious report. Only "warning" because nobody has confirmed it yet.
export function draftFromUnconfirmedReport(report) {
  const place = reportPlace(report)
  const note = report.note ? ` Their report: "${sentence(report.note)}"` : ''

  return {
    routeId: report.route_id,
    severity: 'warning',
    title: `${report.label} reported ${place}`,
    message: `Reported by 1 hiker on ${formatDate(report.created_at)}.${note} Check conditions before you set out.`,
    endsAt: defaultAlertEnd(),
    ...linkTo(unconfirmedRef(report)),
  }
}

// A serious report from several hikers, so it can be published as a danger notice.
export function draftFromRepeatedReport(report) {
  const note = report.note ? ` Latest report: "${sentence(report.note)}"` : ''

  return {
    routeId: report.route_id,
    severity: 'danger',
    title: `${report.label} reported ${reportPlace(report)}`,
    message: `Reported by ${report.reporter_count} hikers, most recently on ${formatDate(report.created_at)}.${note} Check conditions before you set out.`,
    endsAt: defaultAlertEnd(),
    ...linkTo(repeatedRef(report)),
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

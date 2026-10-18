// Route suitability rules.

// A route may go up to 25% beyond what you've done before and still count as
// within your experience. Hiking and mountaineering training advice is to build
// up distance and climb gradually rather than in big jumps.
const STRETCH_FACTOR = 1.25

// Acute mountain sickness becomes a real risk from about 2500 m
// (CDC Yellow Book; Wilderness Medical Society guidelines).
const AMS_ALTITUDE_M = 2500

// Day < overnight < multiday. Having done a longer trip type covers the shorter ones.
const TRIP_TYPE_RANK = { day: 1, overnight: 2, multiday: 3 }

const TRIP_TYPE_LABELS = { day: 'day hike', overnight: 'overnight hike', multiday: 'multi-day trek' }

function round(value) {
  return Math.round(value * 10) / 10
}

function isMissing(value) {
  return value === null || value === undefined
}

// 1 day = day hike, 2 days = one night out, 3+ days = multi-day trek.
export function tripType(route) {
  const days = Number(route.duration_days)
  if (days >= 3) return 'multiday'
  if (days === 2) return 'overnight'
  if (days === 1) return 'day'
  return route.is_multiday ? 'multiday' : 'day'
}

function tripDays(route) {
  const days = Number(route.duration_days)
  return days > 1 ? days : 1
}

// Distance and elevation gain are compared per day: your longest hike was most
// likely done in one day, so a 2-day route is judged on what each day asks of you.
function checkAmount(rule, label, unit, routeTotal, days, done) {
  if (isMissing(routeTotal)) {
    return { rule, status: 'unknown', message: `This route has no ${label} data.` }
  }
  if (isMissing(done)) {
    return { rule, status: 'unknown', message: `We don't know your ${label} yet.` }
  }

  const needed = routeTotal / days
  const perDay = days > 1 ? ` a day (${round(routeTotal)} ${unit} over ${days} days)` : ''
  const asked = `${round(needed)} ${unit}${perDay}`

  if (needed <= done * STRETCH_FACTOR) {
    return { rule, status: 'pass', message: `${asked} is within your experience (${round(done)} ${unit}).` }
  }
  return { rule, status: 'fail', message: `${asked} is more than 25% beyond your ${round(done)} ${unit}.` }
}

function checkAltitude(route, profile) {
  const needed = route.altitude_m
  const done = profile.highest_altitude_m

  if (isMissing(needed)) {
    return { rule: 'altitude', status: 'unknown', message: 'This route has no altitude data.' }
  }
  if (isMissing(done)) {
    return { rule: 'altitude', status: 'unknown', message: "We don't know the highest altitude you've reached yet." }
  }
  if (needed <= done * STRETCH_FACTOR) {
    return { rule: 'altitude', status: 'pass', message: `Peaks at ${round(needed)} m, within your experience (${round(done)} m).` }
  }
  return { rule: 'altitude', status: 'fail', message: `Peaks at ${round(needed)} m, more than 25% above your highest (${round(done)} m).` }
}

function checkTripType(route, hikeTypes) {
  const needed = tripType(route)

  if (isMissing(hikeTypes)) {
    return { rule: 'trip_type', status: 'unknown', message: "We don't know which types of hikes you've done yet." }
  }

  // Any hiking at all (including summit hikes) counts as day-hike experience.
  const ranks = hikeTypes.map((type) => TRIP_TYPE_RANK[type] || 0)
  const best = Math.max(hikeTypes.length ? 1 : 0, ...ranks)

  if (best >= TRIP_TYPE_RANK[needed]) {
    return { rule: 'trip_type', status: 'pass', message: `You've done a ${TRIP_TYPE_LABELS[needed]} or longer before.` }
  }
  return { rule: 'trip_type', status: 'fail', message: `This is a ${TRIP_TYPE_LABELS[needed]}, longer than any trip you've done.` }
}

// function checkSummit(isSummit, hikeTypes) {
//   if (!isSummit) {
//     return { rule: 'summit', status: 'not_applicable', message: 'Not a summit hike.' }
//   }
//   if (isMissing(hikeTypes)) {
//     return { rule: 'summit', status: 'unknown', message: "We don't know if you've done a summit hike yet." }
//   }
//   if (hikeTypes.includes('summit')) {
//     return { rule: 'summit', status: 'pass', message: "Summit hike, and you've done one before." }
//   }
//   return { rule: 'summit', status: 'fail', message: "Summit hike, and you haven't done one before." }
// }

// Safety notes that are shown alongside the verdict but do not change it.
function safetyWarnings(route, profile) {
  const warnings = []
  const highest = profile.highest_altitude_m

  if (route.altitude_m >= AMS_ALTITUDE_M && (isMissing(highest) || highest < AMS_ALTITUDE_M)) {
    warnings.push(
      `This route goes above ${AMS_ALTITUDE_M} m, where altitude sickness becomes a risk. ` +
        'Ascend slowly, drink plenty of water, and turn back if you get a bad headache, nausea or dizziness.',
    )
  }

  return warnings
}


// Returns { verdict, failedCount, checks, warnings }, where verdict is
// 'comfortable' (no rule failed), 'good_challenge' (1-2 failed), 'stretch' (3+ failed)
// or 'unknown' (no rule could be checked).
export function checkRouteSuitability(profile, route, options = {}) {
  const days = tripDays(route)
  const hikeTypes = profile.hike_types
  const isSummit = options.isSummit ?? route.is_summit ?? false

  const checks = [
    checkAmount('distance', 'longest hike distance', 'km', route.distance_km, days, profile.longest_distance_km),
    checkAmount('elevation_gain', 'biggest elevation gain', 'm', route.elevation_gain_m, days, profile.max_elevation_gain_m),
    checkAltitude(route, profile),
    checkTripType(route, hikeTypes),
    // checkSummit(isSummit, hikeTypes),
  ]

  const failedCount = checks.filter((check) => check.status === 'fail').length
  const checkedCount = checks.filter((check) => check.status === 'pass' || check.status === 'fail').length

  let verdict
  if (checkedCount === 0) verdict = 'unknown'
  else if (failedCount === 0) verdict = 'comfortable'
  else if (failedCount <= 2) verdict = 'good_challenge'
  else verdict = 'stretch'

  return { verdict, failedCount, checks, warnings: safetyWarnings(route, profile) }
}

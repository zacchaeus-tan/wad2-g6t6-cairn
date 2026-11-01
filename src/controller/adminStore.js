import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as adminModel from '@/model/adminModel'
import { deleteReview, recalcRouteStats } from '@/model/reviewsModel'
import {
  DIFFICULTY_REF,
  HAZARD_ROUTE_REF,
  pointWarningRef,
  unconfirmedRef,
} from '@/lib/alertDrafts'

// Community difficulty must differ from the official grade by at least this
// much (on the 1-4 scale) before an admin is asked to look at the grade.
const DIFFICULTY_GAP = 0.75

// Sensible ranges for route details an admin types in. Everest is under 8,900 m.
const ROUTE_NUMBER_LIMITS = {
  distance_km: { label: 'Distance', min: 0, max: 5000 },
  elevation_gain_m: { label: 'Elevation gain', min: 0, max: 50000 },
  altitude_m: { label: 'Maximum altitude', min: 0, max: 8900 },
  latitude: { label: 'Latitude', min: -90, max: 90 },
  longitude: { label: 'Longitude', min: -180, max: 180 },
}

const time = (value) => (value ? new Date(value).getTime() : 0)

export const useAdminStore = defineStore('admin', () => {
  const alerts = ref([])
  const hazardRoutes = ref([])
  const pointWarnings = ref([])
  const reportReviews = ref([])
  const seriousIncidents = ref([])
  const recentReviews = ref([])
  const routes = ref([])
  const loading = ref(false)
  const loadError = ref(null) // loading the page: shown at the top
  const error = ref(null) // saving an alert: shown by AlertForm
  const statusError = ref(null) // saving a safety status: shown by RouteStatusEditor
  const infoError = ref(null) // saving route details: shown by RouteInfoForm
  const actionError = ref(null) // taking down an alert, reviewing, regrading or removing: shown by the page
  const lastTakenDown = ref(null) // the alert the admin can still undo

  // Published alerts that are live now or scheduled to start later.
  const liveAlerts = computed(() => {
    const now = Date.now()
    return alerts.value.filter(
      (a) => a.status === 'active' && (!a.ends_at || time(a.ends_at) > now),
    )
  })

  function fromReport(alert, routeId, reportRef) {
    return (
      alert.route_id === routeId &&
      alert.source === 'community' &&
      alert.external_ref?.startsWith(`${reportRef}:`)
    )
  }

  // A report needs attention unless it has a live alert, or an admin dealt with
  // it (raised an alert or marked it reviewed) after its latest activity.
  function needsAttention(routeId, reportRef, latestActivity) {
    if (liveAlerts.value.some((a) => fromReport(a, routeId, reportRef))) return false

    const handled = [
      ...alerts.value
        .filter((a) => fromReport(a, routeId, reportRef))
        .map((a) => time(a.created_at)),
      ...reportReviews.value
        .filter((r) => r.route_id === routeId && r.report_ref === reportRef)
        .map((r) => time(r.reviewed_at)),
    ]
    return !handled.some((at) => at >= time(latestActivity))
  }

  const openHazardRoutes = computed(() =>
    hazardRoutes.value.filter((r) => needsAttention(r.id, HAZARD_ROUTE_REF, r.stats_updated_at)),
  )

  const openPointWarnings = computed(() =>
    pointWarnings.value.filter((w) =>
      needsAttention(w.route_id, pointWarningRef(w), w.last_reported_at),
    ),
  )

  // Serious incidents one hiker has reported, grouped by place and type. They
  // are too thin to change a route's hazard level, but an admin should see them.
  // Those on the confirmed list already (its window is longer) are left out.
  const unconfirmedReports = computed(() => {
    const groups = new Map()
    for (const incident of seriousIncidents.value) {
      const key = `${incident.route_id}|${incident.point_id}|${incident.category}`
      if (!groups.has(key)) groups.set(key, { latest: incident, reporters: new Set() })
      groups.get(key).reporters.add(incident.reviews.user_id)
    }

    return [...groups.values()]
      .filter(({ reporters }) => reporters.size === 1)
      .map(({ latest }) => ({
        route_id: latest.route_id,
        point_id: latest.point_id,
        category: latest.category,
        label: latest.incident_categories.label,
        point_name: latest.route_points?.name,
        day_number: latest.route_points?.day_number,
        note: latest.note,
        created_at: latest.created_at,
        reporter: latest.reviews.profiles?.display_name,
      }))
      .filter(
        (r) =>
          !pointWarnings.value.some(
            (w) => w.point_id === r.point_id && w.category === r.category,
          ) && needsAttention(r.route_id, unconfirmedRef(r), r.created_at),
      )
  })

  const routeNames = computed(() => new Map(routes.value.map((r) => [r.id, r.name])))

  const difficultyMismatches = computed(() =>
    routes.value
      .filter(
        (r) =>
          r.effective_difficulty != null &&
          r.official_difficulty != null &&
          Math.abs(r.effective_difficulty - r.official_difficulty) >= DIFFICULTY_GAP &&
          needsAttention(r.id, DIFFICULTY_REF, r.stats_updated_at),
      )
      .map((r) => ({ ...r, gap: r.effective_difficulty - r.official_difficulty })),
  )

  // Each route with the list of things it is missing; complete routes are left out.
  const incompleteRoutes = computed(() =>
    routes.value
      .map((r) => {
        const missing = []
        if (!r.geometry_present && (r.latitude == null || r.longitude == null)) {
          missing.push('map location')
        }
        if (!r.country) missing.push('country')
        if (r.distance_km == null) missing.push('distance')
        if (r.elevation_gain_m == null) missing.push('elevation gain')
        if (r.altitude_m == null) missing.push('altitude')
        return { ...r, missing }
      })
      .filter((r) => r.missing.length),
  )

  const attentionCount = computed(
    () =>
      openHazardRoutes.value.length +
      openPointWarnings.value.length +
      unconfirmedReports.value.length +
      difficultyMismatches.value.length,
  )

  async function fetchAll() {
    loading.value = true
    loadError.value = null

    const results = await Promise.all([
      adminModel.listAlerts(),
      adminModel.listHazardRoutes(),
      adminModel.listPointWarnings(),
      adminModel.listRoutesForChecks(),
      adminModel.listReportReviews(),
      adminModel.listSeriousIncidents(),
      adminModel.listRecentReviews(),
    ])
    loading.value = false

    const failed = results.find((res) => res.error)
    if (failed) {
      loadError.value = failed.error.message
      return false
    }

    const [alertsRes, hazardsRes, warningsRes, routesRes, reviewsRes, incidentsRes, recentRes] =
      results
    alerts.value = alertsRes.data
    hazardRoutes.value = hazardsRes.data
    pointWarnings.value = warningsRes.data
    routes.value = routesRes.data
    reportReviews.value = reviewsRes.data
    seriousIncidents.value = incidentsRes.data
    recentReviews.value = recentRes.data
    return true
  }

  // An end date is required so forgotten alerts do not stay up forever; long
  // closures belong in the route's safety status instead.
  function validateAlert({ routeId, title, startsAt, endsAt }) {
    if (!routeId) {
      error.value = 'Select the route this alert is for.'
      return false
    }
    if (!title || title.trim() === '') {
      error.value = 'Give the alert a short title.'
      return false
    }
    if (!endsAt) {
      error.value = 'Choose when the alert ends. For a long closure, set the route status instead.'
      return false
    }
    if (new Date(endsAt) <= new Date(startsAt || Date.now())) {
      error.value = 'The end date must be after the start date.'
      return false
    }
    return true
  }

  // Publishes a new alert, or changes the published one when given its id.
  async function saveAlert(form, alertId = null) {
    error.value = null
    if (!validateAlert(form)) return false

    const fields = { ...form, title: form.title.trim(), message: form.message?.trim() }
    const { error: err } = alertId
      ? await adminModel.updateAlert(alertId, fields)
      : await adminModel.insertAlert(fields)
    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  async function setAlertStatus(alertId, status) {
    actionError.value = null
    const { error: err } = await adminModel.updateAlertStatus(alertId, status)
    if (err) {
      actionError.value = err.message
      return false
    }
    const alert = alerts.value.find((a) => a.id === alertId)
    if (alert) alert.status = status
    return true
  }

  // Taking an alert down happens at once, with an undo rather than a confirm.
  async function takeDownAlert(alert) {
    if (await setAlertStatus(alert.id, 'dismissed')) lastTakenDown.value = alert
  }

  async function undoTakeDown() {
    if (await setAlertStatus(lastTakenDown.value.id, 'active')) lastTakenDown.value = null
  }

  // "Reviewed, no action": hides the report until something newer comes in.
  async function markReviewed(routeId, reportRef) {
    actionError.value = null
    const { data, error: err } = await adminModel.markReportReviewed(routeId, reportRef)
    if (err) {
      actionError.value = err.message
      return false
    }
    reportReviews.value = [
      ...reportReviews.value.filter((r) => !(r.route_id === routeId && r.report_ref === reportRef)),
      data,
    ]
    return true
  }

  // The community grade is blended from the official one, so recalculate it
  // and reload to show it.
  async function regradeRoute(routeId, grade) {
    actionError.value = null
    const { error: err } = await adminModel.updateOfficialDifficulty(routeId, grade)
    if (err) {
      actionError.value = err.message
      return false
    }
    const { error: recalcError } = await recalcRouteStats(routeId)
    await fetchAll()
    if (recalcError) {
      actionError.value = `Grade saved, but the community grade was not updated: ${recalcError.message}`
      return false
    }
    return true
  }

  // A removed review stops counting towards the route's grade and hazard level,
  // so recalculate them. Its incident notes are deleted with it.
  async function removeReview(review) {
    actionError.value = null
    const { data, error: err } = await deleteReview(review.id)
    if (err) {
      actionError.value = err.message
      return false
    }
    if (!data?.length) {
      actionError.value =
        'The review was not removed. Check that your account can moderate reviews.'
      return false
    }

    const { error: recalcError } = await recalcRouteStats(review.route_id)
    await fetchAll()
    if (recalcError) {
      actionError.value = `Review removed, but the route's stats were not updated: ${recalcError.message}`
      return false
    }
    return true
  }

  // Blank fields are left out, so a slip can't wipe data a route already has.
  function routeInfoChanges(form) {
    const changes = {}
    if (form.country?.trim()) changes.country = form.country.trim()

    for (const [key, { label, min, max }] of Object.entries(ROUTE_NUMBER_LIMITS)) {
      if (form[key] === '' || form[key] == null) continue
      const value = Number(form[key])
      if (Number.isNaN(value) || value < min || value > max) {
        infoError.value = `${label} must be between ${min} and ${max}.`
        return null
      }
      changes[key] = value
    }

    if ('latitude' in changes !== 'longitude' in changes) {
      infoError.value = 'Enter both latitude and longitude, or neither.'
      return null
    }
    if (!Object.keys(changes).length) {
      infoError.value = 'Fill in at least one field.'
      return null
    }
    return changes
  }

  async function saveRouteInfo(routeId, form) {
    infoError.value = null
    const changes = routeInfoChanges(form)
    if (!changes) return false

    const { data, error: err } = await adminModel.updateRouteInfo(routeId, changes)
    if (err) {
      infoError.value = err.message
      return false
    }
    const route = routes.value.find((r) => r.id === routeId)
    if (route) Object.assign(route, data)
    return true
  }

  async function saveRouteSafety(routeId, { safetyStatus, safetyStatusNote }) {
    statusError.value = null
    if (safetyStatus !== 'open' && !safetyStatusNote?.trim()) {
      statusError.value = 'Explain to hikers why the route is not open.'
      return false
    }

    const { data, error: err } = await adminModel.updateRouteSafety(routeId, {
      safetyStatus,
      safetyStatusNote: safetyStatusNote?.trim(),
    })
    if (err) {
      statusError.value = err.message
      return false
    }
    const route = routes.value.find((r) => r.id === routeId)
    if (route) Object.assign(route, data)
    return true
  }

  return {
    alerts,
    hazardRoutes,
    pointWarnings,
    reportReviews,
    seriousIncidents,
    recentReviews,
    routes,
    loading,
    loadError,
    error,
    statusError,
    infoError,
    actionError,
    lastTakenDown,
    liveAlerts,
    openHazardRoutes,
    openPointWarnings,
    unconfirmedReports,
    routeNames,
    difficultyMismatches,
    incompleteRoutes,
    attentionCount,
    fetchAll,
    saveAlert,
    takeDownAlert,
    undoTakeDown,
    markReviewed,
    regradeRoute,
    removeReview,
    saveRouteInfo,
    saveRouteSafety,
  }
})

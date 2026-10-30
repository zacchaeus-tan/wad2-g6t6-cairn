import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as adminModel from '@/model/adminModel'
import { DIFFICULTY_REF, HAZARD_ROUTE_REF, pointWarningRef } from '@/lib/alertDrafts'

// Community difficulty must differ from the official grade by at least this
// much (on the 1-4 scale) before an admin is asked to look at the grade.
const DIFFICULTY_GAP = 0.75

const time = (value) => (value ? new Date(value).getTime() : 0)

export const useAdminStore = defineStore('admin', () => {
  const alerts = ref([])
  const hazardRoutes = ref([])
  const pointWarnings = ref([])
  const reportReviews = ref([])
  const routes = ref([])
  const loading = ref(false)
  const loadError = ref(null) // loading the page: shown at the top
  const error = ref(null) // saving an alert: shown by AlertForm
  const statusError = ref(null) // saving a safety status: shown by RouteStatusEditor
  const actionError = ref(null) // taking down an alert, reviewing or regrading: shown by the page
  const lastTakenDown = ref(null) // the alert the admin can still undo

  function clearError() {
    error.value = null
    statusError.value = null
    actionError.value = null
  }

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
        return { ...r, missing }
      })
      .filter((r) => r.missing.length),
  )

  const attentionCount = computed(
    () =>
      openHazardRoutes.value.length +
      openPointWarnings.value.length +
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
    ])
    loading.value = false

    const failed = results.find((res) => res.error)
    if (failed) {
      loadError.value = failed.error.message
      return false
    }

    const [alertsRes, hazardsRes, warningsRes, routesRes, reviewsRes] = results
    alerts.value = alertsRes.data
    hazardRoutes.value = hazardsRes.data
    pointWarnings.value = warningsRes.data
    routes.value = routesRes.data
    reportReviews.value = reviewsRes.data
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

  function cleanAlert(form) {
    return { ...form, title: form.title.trim(), message: form.message?.trim() }
  }

  async function createAlert(form) {
    error.value = null
    if (!validateAlert(form)) return false

    const { error: err } = await adminModel.insertAlert(cleanAlert(form))
    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  async function updateAlert(alertId, form) {
    error.value = null
    if (!validateAlert(form)) return false

    const { error: err } = await adminModel.updateAlert(alertId, cleanAlert(form))
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
    const ok = await setAlertStatus(alert.id, 'dismissed')
    if (ok) lastTakenDown.value = alert
    return ok
  }

  async function undoTakeDown() {
    const alert = lastTakenDown.value
    if (!alert) return false
    const ok = await setAlertStatus(alert.id, 'active')
    if (ok) lastTakenDown.value = null
    return ok
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

  // The database recalculates the community grade, so reload to show it.
  async function regradeRoute(routeId, grade) {
    actionError.value = null
    const { error: err } = await adminModel.updateOfficialDifficulty(routeId, grade)
    if (err) {
      actionError.value = err.message
      return false
    }
    await fetchAll()
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
    routes,
    loading,
    loadError,
    error,
    statusError,
    actionError,
    lastTakenDown,
    liveAlerts,
    openHazardRoutes,
    openPointWarnings,
    routeNames,
    difficultyMismatches,
    incompleteRoutes,
    attentionCount,
    clearError,
    fetchAll,
    createAlert,
    updateAlert,
    setAlertStatus,
    takeDownAlert,
    undoTakeDown,
    markReviewed,
    regradeRoute,
    saveRouteSafety,
  }
})

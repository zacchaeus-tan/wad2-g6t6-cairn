import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as adminModel from '@/model/adminModel'

// Community difficulty must differ from the official grade by at least this
// much (on the 1-4 scale) before an admin is asked to look at the grade.
const DIFFICULTY_GAP = 0.75

export const useAdminStore = defineStore('admin', () => {
  const alerts = ref([])
  const hazardRoutes = ref([])
  const pointWarnings = ref([])
  const routes = ref([])
  const loading = ref(false)
  const loadError = ref(null) // loading the page: shown at the top
  const error = ref(null) // creating an alert: shown by AlertForm
  const statusError = ref(null) // saving a safety status: shown by RouteStatusEditor
  const actionError = ref(null) // publishing or taking down an alert: shown by the page
  const jobRuns = ref([])
  const jobRunning = ref(false)
  const jobError = ref(null) // loading or running the weather job: shown by AutomationStatus

  function clearError() {
    error.value = null
    statusError.value = null
    actionError.value = null
  }

  const pendingAlerts = computed(() => alerts.value.filter((a) => a.status === 'pending'))

  // Published alerts that are live now or scheduled to start later.
  const liveAlerts = computed(() => {
    const now = Date.now()
    return alerts.value.filter(
      (a) => a.status === 'active' && (!a.ends_at || new Date(a.ends_at).getTime() > now),
    )
  })

  const routeNames = computed(() => new Map(routes.value.map((r) => [r.id, r.name])))

  const difficultyMismatches = computed(() =>
    routes.value
      .filter(
        (r) =>
          r.effective_difficulty != null &&
          r.official_difficulty != null &&
          Math.abs(r.effective_difficulty - r.official_difficulty) >= DIFFICULTY_GAP,
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
        if (!r.route_points?.[0]?.count) missing.push('checkpoints')
        return { ...r, missing }
      })
      .filter((r) => r.missing.length),
  )

  const attentionCount = computed(
    () =>
      pendingAlerts.value.length +
      hazardRoutes.value.length +
      pointWarnings.value.length +
      difficultyMismatches.value.length,
  )

  // Latest run of each job, for the automation section.
  const latestRuns = computed(() => {
    const latest = new Map()
    for (const run of jobRuns.value) {
      if (!latest.has(run.job)) latest.set(run.job, run)
    }
    return [...latest.values()]
  })

  async function fetchAll() {
    loading.value = true
    loadError.value = null
    fetchJobRuns()

    const [alertsRes, hazardsRes, warningsRes, routesRes] = await Promise.all([
      adminModel.listAlerts(),
      adminModel.listHazardRoutes(),
      adminModel.listPointWarnings(),
      adminModel.listRoutesForChecks(),
    ])
    loading.value = false

    const failed = [alertsRes, hazardsRes, warningsRes, routesRes].find((res) => res.error)
    if (failed) {
      loadError.value = failed.error.message
      return false
    }

    alerts.value = alertsRes.data
    hazardRoutes.value = hazardsRes.data
    pointWarnings.value = warningsRes.data
    routes.value = routesRes.data
    return true
  }

  // Kept apart from fetchAll so a problem with the job table does not stop
  // the rest of the page loading.
  async function fetchJobRuns() {
    const { data, error: err } = await adminModel.listJobRuns()
    if (err) {
      jobError.value = err.message
      return false
    }
    jobRuns.value = data
    return true
  }

  async function runWeatherCheck() {
    jobRunning.value = true
    jobError.value = null
    const { error: err } = await adminModel.runWeatherCheck()
    jobRunning.value = false
    if (err) {
      // The function's own { error } message is more useful than the
      // generic "non-2xx status code" one supabase-js puts on err.
      const body = await err.context?.json?.().catch(() => null)
      jobError.value = body?.error || err.message
      await fetchJobRuns()
      return false
    }
    await fetchAll()
    return true
  }

  function validateAlert({ routeId, title, startsAt, endsAt }) {
    if (!routeId) {
      error.value = 'Select the route this alert is for.'
      return false
    }
    if (!title || title.trim() === '') {
      error.value = 'Give the alert a short title.'
      return false
    }
    if (endsAt && new Date(endsAt) <= new Date(startsAt || Date.now())) {
      error.value = 'The end date must be after the start date.'
      return false
    }
    return true
  }

  async function createAlert(form) {
    error.value = null
    if (!validateAlert(form)) {
      return false
    }

    const { error: err } = await adminModel.insertAlert({
      ...form,
      title: form.title.trim(),
      message: form.message?.trim(),
    })
    if (err) {
      error.value = err.message
      return false
    }
    await fetchAll()
    return true
  }

  // Approve a pending alert ('active'), or take one down ('dismissed').
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
    routes,
    loading,
    loadError,
    error,
    statusError,
    actionError,
    jobRuns,
    jobRunning,
    jobError,
    latestRuns,
    pendingAlerts,
    liveAlerts,
    routeNames,
    difficultyMismatches,
    incompleteRoutes,
    attentionCount,
    clearError,
    fetchAll,
    createAlert,
    setAlertStatus,
    saveRouteSafety,
    runWeatherCheck,
  }
})

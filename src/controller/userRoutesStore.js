import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as userRoutesModel from '@/model/userRoutesModel'
import * as routesModel from '@/model/routesModel'
import { useAuthStore } from '@/controller/authStore'
import { experienceFromRoute } from '@/lib/matching'
import { quizQuestions, quizOptionFor } from '@/lib/quizQuestions'

const statLabels = {
  longest_distance_km: 'longest distance',
  max_elevation_gain_m: 'max elevation gain',
  highest_altitude_m: 'highest altitude',
  longest_trek_days: 'longest trek',
}

// the model returns { data, error }: throw the error, otherwise give back data
function unwrap(result) {
  if (result.error) {
    throw result.error
  }
  return result.data
}

// Saved and completed routes. A route has one row per user: saving creates it
// as 'saved', marking it done changes it to 'completed', unsaving deletes it.
// Once completed, a route can't be changed back or removed.
export const useUserRoutesStore = defineStore('userRoutes', () => {
  const current = ref(null) // the user's row for the open route, or null
  const savedRoutes = ref([]) // every saved or completed route, for the profile page
  const loading = ref(false)
  const savedLoading = ref(false)
  const error = ref(null)
  const statsMessage = ref(null) // which profile stats the last completed hike raised
  const routeAlerts = ref([]) // live alerts on the routes in savedRoutes

  // Notices for routes the user still plans to hike, not ones they have finished.
  const savedRouteNotices = computed(() =>
    routeAlerts.value.flatMap((alert) => {
      const route = savedRoutes.value.find(
        (r) => r.route_id === alert.route_id && r.status === 'saved',
      )
      return route ? [{ ...alert, route_name: route.route_name }] : []
    }),
  )

  // the router waits for the session, so the auth store is ready by now
  function userId() {
    return useAuthStore().user?.id ?? null
  }

  function clearError() {
    error.value = null
    statsMessage.value = null
  }

  // completed routes are locked: no un-completing and no removing
  function isCompleted(routeId) {
    if (current.value?.route_id === routeId) return current.value.status === 'completed'
    return savedRoutes.value.some((r) => r.route_id === routeId && r.status === 'completed')
  }

  // The hike's figures as quiz option values, so retaking the quiz shows them selected.
  function asQuizAnswers(experience) {
    const answers = {}
    for (const question of quizQuestions) {
      const value = experience[question.column]
      if (value != null) answers[question.column] = quizOptionFor(question, value).val
    }
    return answers
  }

  // A completed hike counts as experience: any stat it beats goes up on the profile.
  async function raiseExperienceFrom(routeId) {
    try {
      const route = unwrap(await routesModel.getRouteExperience(routeId))
      if (!route) return
      const result = await useAuthStore().raiseExperience(asQuizAnswers(experienceFromRoute(route)))
      if (!result.success) throw new Error(result.error)
      if (result.raised.length) {
        statsMessage.value = `Your ${result.raised.map((c) => statLabels[c]).join(', ')} went up.`
      }
    } catch (e) {
      console.error('Could not update hiking stats:', e)
      error.value = 'Marked as completed, but your hiking stats could not be updated.'
    }
  }

  async function loadForRoute(routeId) {
    current.value = null
    clearError()
    if (!userId()) return false

    try {
      current.value = unwrap(await userRoutesModel.getUserRoute(userId(), routeId))
      return true
    } catch (e) {
      error.value = e.message
      return false
    }
  }

  async function setStatus(routeId, status) {
    if (!userId()) {
      error.value = 'Please sign in to save routes.'
      return false
    }
    if (isCompleted(routeId)) {
      error.value = 'This route is already completed and cannot be changed.'
      return false
    }
    loading.value = true
    clearError()

    try {
      const row = unwrap(await userRoutesModel.upsertUserRoute(userId(), routeId, status))
      current.value = row
      // keep the profile list in step, holding on to the route details it already has
      const i = savedRoutes.value.findIndex((r) => r.route_id === routeId)
      if (i !== -1) {
        savedRoutes.value[i] = { ...savedRoutes.value[i], ...row }
      }
      if (status === 'completed') {
        await raiseExperienceFrom(routeId)
      }
      return true
    } catch (e) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  async function remove(routeId) {
    if (!userId()) return false
    if (isCompleted(routeId)) {
      error.value = 'Completed routes cannot be removed.'
      return false
    }
    loading.value = true
    clearError()

    try {
      unwrap(await userRoutesModel.deleteUserRoute(userId(), routeId))
      if (current.value?.route_id === routeId) {
        current.value = null
      }
      savedRoutes.value = savedRoutes.value.filter((r) => r.route_id !== routeId)
      return true
    } catch (e) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Notices are extra information, so a failure here should not hide the routes.
  async function loadRouteAlerts(routeIds) {
    const { data, error: err } = await routesModel.listAlertsForRoutes(routeIds)
    if (err) {
      console.warn('Could not load notices for your saved routes:', err.message)
      routeAlerts.value = []
      return
    }
    routeAlerts.value = data
  }

  // all of the user's saved routes, with the route details the profile shows
  async function loadSaved() {
    savedLoading.value = true
    clearError()

    try {
      if (!userId()) {
        savedRoutes.value = []
        return false
      }

      const rows = unwrap(await userRoutesModel.listUserRoutes(userId()))
      if (rows.length === 0) {
        savedRoutes.value = []
        routeAlerts.value = []
        return true
      }

      const routes = unwrap(await routesModel.listRoutesByIds(rows.map((r) => r.route_id)))
      savedRoutes.value = rows.map((row) => {
        const route = routes.find((r) => String(r.id) === String(row.route_id))
        return {
          ...row,
          route_name: route ? route.name : 'Unknown route',
          country: route ? route.country : null,
          distance_km: route ? route.distance_km : null,
        }
      })
      await loadRouteAlerts(rows.map((r) => r.route_id))
      return true
    } catch (e) {
      error.value = e.message
      return false
    } finally {
      savedLoading.value = false
    }
  }

  return {
    current,
    savedRoutes,
    savedRouteNotices,
    loading,
    savedLoading,
    error,
    statsMessage,
    clearError,
    loadForRoute,
    setStatus,
    remove,
    loadSaved,
  }
})

import { listIncidentCategories, listReviewsForRoute } from '@/model/reviewsModel'

export async function fetchIncidentCategories() {
  const { data, error } = await listIncidentCategories()
  if (error) {
    throw error
  }

  return data
}

export async function fetchReviewsForRoute(routeId) {
  if (!routeId) {
    throw new Error('A route ID is required to load its reviews.')
  }

  const { data, error } = await listReviewsForRoute(routeId)
  if (error) {
    throw error
  }

  return data
}

import { listRoutes, getRoute, listRoutesByIds } from '@/model/routesModel'

// Controller: checks input, calls the model, and turns database errors into
// thrown errors so views can show them.

export async function fetchRoutes() {
  const { data, error } = await listRoutes()
  if (error) {
    throw error
  }

  return data
}

export async function fetchRouteById(id) {
  if (!id) {
    throw new Error('A route ID is required to load a route.')
  }

  const { data, error } = await getRoute(id)
  if (error) {
    throw error
  }

  return data
}

export async function fetchRoutesByIds(ids) {
  if (!ids || ids.length === 0) {
    return []
  }

  const { data, error } = await listRoutesByIds(ids)
  if (error) {
    throw error
  }

  return data
}
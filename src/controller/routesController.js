import { listRoutes, getRoute } from '@/model/routesModel'

export async function fetchRoutes() {
  try {
    return await listRoutes()
  } catch (err) {
    console.error('fetchRoutes failed:', err)
    throw err
  }
}

export async function fetchRouteById(id) {
  try {
    if (!id) {
      throw new Error('A route ID is required to load a route.')
    }

    return await getRoute(id)
  } catch (err) {
    console.error('fetchRouteById failed:', err)
    throw err
  }
}

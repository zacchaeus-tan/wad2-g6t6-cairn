import axios from 'axios'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

async function getRoutes(params) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to load routes.')
  }

  const { data } = await axios.get(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/routes`, {
    params,
    headers: { apikey: supabaseKey },
  })

  return data
}

export function fetchRoutes() {
  return getRoutes({ select: '*' })
}

export async function fetchRouteById(id) {
  if (!id) {
    throw new Error('A route ID is required to load a route.')
  }

  const routes = await getRoutes({
    select: '*',
    id: `eq.${id}`,
    limit: 1,
  })

  return routes[0] ?? null
}

import { supabase } from '@/lib/supabase'

export async function fetchRoutes() {
  const { data, error } = await supabase.from('routes').select('*')
  if (error) {
    throw error
  }

  return data
}

export async function fetchRouteById(id) {
  if (!id) {
    throw new Error('A route ID is required to load a route.')
  }

  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    throw error
  }

  return data
}

import { supabase } from '@/lib/supabase'

// Model: talks to the user_routes table only. Each function returns Supabase's
// { data, error } unchanged; the store decides what to do with errors.

// the user's row for one route (data null if they haven't saved it)
export function getUserRoute(userId, routeId) {
  return supabase
    .from('user_routes')
    .select('*')
    .eq('user_id', userId)
    .eq('route_id', routeId)
    .maybeSingle()
}

export function listUserRoutes(userId) {
  return supabase
    .from('user_routes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
}

// creates the row or changes its status; completed_at is filled in by a trigger
export function upsertUserRoute(userId, routeId, status) {
  return supabase
    .from('user_routes')
    .upsert({ user_id: userId, route_id: routeId, status }, { onConflict: 'user_id,route_id' })
    .select()
    .single()
}

export function deleteUserRoute(userId, routeId) {
  return supabase.from('user_routes').delete().eq('user_id', userId).eq('route_id', routeId)
}

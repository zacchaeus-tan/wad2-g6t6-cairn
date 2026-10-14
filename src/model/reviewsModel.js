import { supabase } from '@/lib/supabase'

export function listIncidentCategories() {
  return supabase.from('incident_categories').select('*').order('sort_order')
}

export function listReviewsForRoute(routeId) {
  return supabase
    .from('reviews')
    .select('*, profiles(display_name), review_incidents(*, route_points(name))')
    .eq('route_id', routeId)
    .order('created_at', { ascending: false })
}

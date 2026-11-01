import { supabase } from '@/lib/supabase'

export function listIncidentCategories() {
  return supabase.from('incident_categories').select('*').order('sort_order')
}

const REVIEW_FIELDS = '*, profiles(display_name), review_incidents(*, incident_categories(label))'

// One page of a route's reviews, newest first. from and to are row positions
// (inclusive, starting at 0); count is the route's total number of reviews.
export function listReviewsForRoute(routeId, from, to) {
  return supabase
    .from('reviews')
    .select(REVIEW_FIELDS, { count: 'exact' })
    .eq('route_id', routeId)
    .order('created_at', { ascending: false })
    .range(from, to)
}

// One page of a user's own reviews, newest first, with the route each one is about.
export function listMyReviews(userId, from, to) {
  return supabase
    .from('reviews')
    .select('*, routes(id, name, country), review_incidents(*, incident_categories(label))', {
      count: 'exact',
    })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)
}

// The signed-in user's own review on a route, or null. Loaded on its own because
// it may not be on the page of reviews that is showing.
export function getMyReview(routeId, userId) {
  return supabase
    .from('reviews')
    .select(REVIEW_FIELDS)
    .eq('route_id', routeId)
    .eq('user_id', userId)
    .maybeSingle()
}

// One review per user per route, so this upserts on that pair.
export function upsertReview({
  routeId,
  userId,
  rating,
  perceivedDifficulty,
  completed,
  reviewText,
}) {
  return supabase
    .from('reviews')
    .upsert(
      {
        route_id: routeId,
        user_id: userId,
        rating,
        perceived_difficulty: perceivedDifficulty,
        completed,
        review_text: reviewText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'route_id,user_id' },
    )
    .select()
    .single()
}

export function deleteIncidentsForReview(reviewId) {
  return supabase.from('review_incidents').delete().eq('review_id', reviewId)
}

export function insertIncidents(reviewId, routeId, incidents) {
  return supabase.from('review_incidents').insert(
    incidents.map((i) => ({
      review_id: reviewId,
      route_id: routeId,
      category: i.category,
      note: i.note,
    })),
  )
}

// Its incident notes are deleted with it (on delete cascade).
// Returns the deleted row, because Row Level Security blocks a delete by
// removing nothing rather than by returning an error.
export function deleteReview(reviewId) {
  return supabase.from('reviews').delete().eq('id', reviewId).select('id')
}

// Community stats on `routes` are written by the recalc-route-stats Edge
// Function, not from the browser (users have no write access to routes).
// Call this after any review or incident note changes.
export function recalcRouteStats(routeId) {
  return supabase.functions.invoke('recalc-route-stats', { body: { routeId } })
}

import { supabase } from '@/lib/supabase'

// Model: talks to Supabase Auth, the profiles table, the avatars bucket and the
// upload-avatar Edge Function. Each function
// returns Supabase's { data, error } unchanged; the controller decides what
// to do with errors.

// metadata is read by the on_auth_user_created trigger to fill in the profiles row
export function signUp(email, password, metadata) {
  return supabase.auth.signUp({ email, password, options: { data: metadata } })
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

// Leaves the site for Google, which sends them back to returnPath signed in.
// That URL has to be in the project's allowed redirect URLs.
export function signInWithGoogle(returnPath) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${returnPath}` },
  })
}

// Supabase emails a link that signs them in on /reset-password, where they pick a new password.
// That URL has to be in the project's allowed redirect URLs.
export function sendPasswordReset(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
}

export function signOut() {
  return supabase.auth.signOut()
}

export function getSession() {
  return supabase.auth.getSession()
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}

export function getProfile(userId) {
  return supabase.from('profiles').select('*').eq('id', userId).single()
}

// fields is a subset of the quiz experience columns
export function updateExperience(userId, fields) {
  return supabase.from('profiles').update(fields).eq('id', userId)
}

export function updateQuizAnswers(userId, answers) {
  return supabase
    .from('profiles')
    .update({
      experience_level: answers.experienceLevel,
      longest_distance_km: answers.longestDistanceKm,
      max_elevation_gain_m: answers.maxElevationGainM,
      highest_altitude_m: answers.highestAltitudeM,
      longest_trek_days: answers.longestTrekDays,
      quiz_completed_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

// Only these columns can be changed from the profile page, whatever is passed in. Asks for the
// row back because a blocked update otherwise looks like a success that changed nothing.
const EDITABLE_PROFILE_COLUMNS = ['display_name', 'age', 'gender', 'country', 'about']

export function updateProfile(userId, fields) {
  const allowed = Object.fromEntries(
    EDITABLE_PROFILE_COLUMNS.filter((column) => column in fields).map((column) => [
      column,
      fields[column],
    ]),
  )
  return supabase.from('profiles').update(allowed).eq('id', userId).select('id')
}

// A profile picture in the public avatars bucket, as { data: { publicUrl } }.
// Builds the link from the project URL; it doesn't send a request.
export function getAvatarUrl(avatarPath) {
  return supabase.storage.from('avatars').getPublicUrl(avatarPath)
}

// The picture is written by the upload-avatar Edge Function, not from the
// browser. Both return { data: { avatar_path }, error }.
export function uploadAvatar(file) {
  const body = new FormData()
  body.append('file', file)
  return supabase.functions.invoke('upload-avatar', { body })
}

export function removeAvatar() {
  return supabase.functions.invoke('upload-avatar', { body: { remove: true } })
}

export function updatePassword(password) {
  return supabase.auth.updateUser({ password })
}

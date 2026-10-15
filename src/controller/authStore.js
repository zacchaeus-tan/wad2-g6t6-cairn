import { reactive } from 'vue'
import {
  signUp,
  signIn,
  signOut,
  getSession,
  onAuthStateChange,
  getProfile,
  updateQuizAnswers,
} from '@/model/authModel'

// One shared, reactive auth object for the whole app. Every component that
// calls useAuthStore() gets this same object, so a login in one place
// updates the nav, profile page and router guard everywhere.
const auth = reactive({
  user: null,       // Supabase auth user object (id, email, etc.)
  profile: null,     // row from `profiles` table (display_name, age, gender, country, about, is_admin)
  loading: false,
  error: null,

  get isLoggedIn() {
    return !!auth.user
  },
  get isAdmin() {
    return !!auth.profile?.is_admin
  },

  register,
  login,
  logout,
  saveQuiz,
  fetchProfile,
  initSession,
})

let sessionReady = null

export function useAuthStore() {
  return auth
}

async function register({ email, password, name, age, gender, country, about }) {
  auth.loading = true
  auth.error = null

  // The profiles row is created by the on_auth_user_created trigger, which
  // reads the profile fields out of this metadata.
  const { data, error } = await signUp(email, password, {
    display_name: name.trim(),
    age: Number(age),
    gender,
    country,
    about: about?.trim() || null,
  })

  if (error) {
    auth.error = error.message
    auth.loading = false
    return { success: false, error: error.message }
  }

  // With email confirmation on, signUp returns a user but no session, so
  // they aren't actually signed in until they confirm and log in.
  auth.user = data.session ? data.user : null
  await fetchProfile()
  auth.loading = false
  return { success: true, needsConfirmation: !data.session }
}

async function login(email, password) {
  auth.loading = true
  auth.error = null

  const { data, error } = await signIn(email, password)

  if (error) {
    auth.error = error.message
    auth.loading = false
    return { success: false, error: error.message }
  }

  auth.user = data.user
  await fetchProfile()
  auth.loading = false
  return { success: true }
}

async function logout() {
  await signOut()
  auth.user = null
  auth.profile = null
}

// fitness_score is computed by a trigger, so we save the answers and read back.
async function saveQuiz(answers) {
  if (!auth.user) return { success: false, error: 'Not signed in' }

  const { error } = await updateQuizAnswers(auth.user.id, answers)

  if (error) {
    auth.error = error.message
    return { success: false, error: error.message }
  }

  await fetchProfile()
  return { success: true }
}

async function fetchProfile() {
  if (!auth.user) return

  const { data, error } = await getProfile(auth.user.id)

  if (!error) auth.profile = data
}

// restores the session on app load; the router guard awaits this before
// every navigation, so it only does the work once
function initSession() {
  if (!sessionReady) sessionReady = restoreSession()
  return sessionReady
}

async function restoreSession() {
  auth.loading = true
  const { data } = await getSession()

  if (data.session?.user) {
    auth.user = data.session.user
    await fetchProfile()
  }

  auth.loading = false

  // keep auth in sync if the session changes (login/logout in another tab, token refresh, etc.)
  onAuthStateChange((_event, session) => {
    const userId = auth.user?.id
    auth.user = session?.user ?? null
    if (!auth.user) {
      auth.profile = null
    } else if (auth.user.id !== userId) {
      // calling Supabase inside this callback can deadlock, so defer it
      setTimeout(() => fetchProfile(), 0)
    }
  })
}

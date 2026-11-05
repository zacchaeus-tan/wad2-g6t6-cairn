import { defineStore, acceptHMRUpdate } from 'pinia'
import {
  signUp,
  signIn,
  signInWithGoogle,
  signOut,
  sendPasswordReset,
  getSession,
  onAuthStateChange,
  getProfile,
  updateQuizAnswers,
  updateExperience,
  updateProfile,
  updatePassword,
  getAvatarUrl,
  uploadAvatar,
  removeAvatar,
} from '@/model/authModel'
import {
  profileColumnsFrom,
  validateAvatarFile,
  validatePasswordForm,
  validateProfileForm,
} from '@/lib/profileTools'
import { quizAnswersToSave } from '@/lib/quizQuestions'

let sessionReady = null

// The link to a profile picture, from an avatar_path in the avatars bucket.
// null when there's no picture, so UserAvatar shows initials.
export function avatarUrlOf(avatarPath) {
  return avatarPath ? getAvatarUrl(avatarPath).data.publicUrl : null
}

// An Edge Function's own { error } message is in the response body; error.message
// is only a generic "non-2xx status code"
async function functionErrorMessage(error) {
  const body = await error.context?.json?.().catch(() => null)
  return body?.error ?? error.message
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,       // Supabase auth user object (id, email, etc.)
    profile: null,     // row from `profiles` table (details, quiz answers, avatar_path, is_admin)
    loading: false,
    error: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    isAdmin: (state) => !!state.profile?.is_admin,
    avatarUrl: (state) => avatarUrlOf(state.profile?.avatar_path),
    // Google doesn't share age, gender or country, so those sign-ups still need to fill them in.
    // Email sign-ups give them on the register form.
    needsProfile: (state) => {
      const provider = state.user?.app_metadata?.provider
      if (!provider || provider === 'email' || !state.profile) return false
      return ['age', 'gender', 'country'].some((column) => state.profile[column] == null)
    },
  },

  actions: {
    async register({ email, password, name, age, gender, country, about }) {
      this.loading = true
      this.error = null

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
        this.error = error.message
        this.loading = false
        return { success: false, error: error.message }
      }

      // With email confirmation on, signUp returns a user but no session, so
      // they aren't actually signed in until they confirm and log in.
      this.user = data.session ? data.user : null
      await this.fetchProfile()
      this.loading = false
      return { success: true, needsConfirmation: !data.session }
    },

    async login(email, password) {
      this.loading = true
      this.error = null

      const { data, error } = await signIn(email, password)

      if (error) {
        this.error = error.message
        this.loading = false
        return { success: false, error: error.message }
      }

      this.user = data.user
      await this.fetchProfile()
      this.loading = false
      return { success: true }
    },

    // On success the browser leaves for Google, so there's nothing to do after
    async loginWithGoogle(returnPath) {
      this.error = null
      const { error } = await signInWithGoogle(returnPath)
      if (error) return this.failAccountChange(error.message)
      return { success: true }
    },

    // Supabase answers the same whether or not the email has an account, so this never says which
    async requestPasswordReset(email) {
      this.loading = true
      this.error = null

      const { error } = await sendPasswordReset(email.trim())

      this.loading = false
      if (error) return this.failAccountChange(error.message)
      return { success: true }
    },

    async logout() {
      await signOut()
      this.user = null
      this.profile = null
    },

    // Save the answers, then read the profile back so the store has the saved row.
    // Numeric answers only ever raise a stat, like a completed hike does.
    async saveQuiz(answers) {
      if (!this.user) return { success: false, error: 'Not signed in' }

      const { error } = await updateQuizAnswers(
        this.user.id,
        quizAnswersToSave(this.profile, answers),
      )

      if (error) {
        this.error = error.message
        return { success: false, error: error.message }
      }

      await this.fetchProfile()
      return { success: true }
    },

    // After a completed hike: raise any experience stat the hike beats.
    // Never lowers one. Returns the columns that went up.
    async raiseExperience(experience) {
      if (!this.user || !this.profile) return { success: false, error: 'Not signed in', raised: [] }

      const fields = {}
      for (const [column, value] of Object.entries(experience)) {
        const current = this.profile[column]
        if (value != null && (current == null || value > Number(current))) fields[column] = value
      }
      const raised = Object.keys(fields)
      if (!raised.length) return { success: true, raised }

      const { error } = await updateExperience(this.user.id, fields)
      if (error) return { success: false, error: error.message, raised: [] }

      this.profile = { ...this.profile, ...fields }
      return { success: true, raised }
    },

    async saveProfile({ name, age, gender, country, about }) {
      const form = { name, age, gender, country, about }
      const [problem] = Object.values(validateProfileForm(form))
      if (problem || !this.user) return this.failAccountChange(problem ?? 'Not signed in')

      this.error = null
      const { data, error } = await updateProfile(this.user.id, profileColumnsFrom(form))

      if (error) return this.failAccountChange(error.message)
      if (!data?.length) return this.failAccountChange('You do not have permission to edit this profile.')

      await this.fetchProfile()
      return { success: true }
    },

    async saveAvatar(file) {
      const problem = validateAvatarFile(file)
      if (problem || !this.user) return this.failAccountChange(problem || 'Not signed in')

      this.error = null
      const { data, error } = await uploadAvatar(file)

      if (error) return this.failAccountChange(await functionErrorMessage(error))
      this.profile = { ...this.profile, avatar_path: data.avatar_path }
      return { success: true }
    },

    async clearAvatar() {
      if (!this.user) return this.failAccountChange('Not signed in')

      this.error = null
      const { error } = await removeAvatar()

      if (error) return this.failAccountChange(await functionErrorMessage(error))
      this.profile = { ...this.profile, avatar_path: null }
      return { success: true }
    },

    async changePassword(password) {
      const { password: problem } = validatePasswordForm({ password, confirm: password })
      if (problem || !this.user) return this.failAccountChange(problem ?? 'Not signed in')

      this.error = null
      const { error } = await updatePassword(password)

      if (error) return this.failAccountChange(error.message)
      return { success: true }
    },

    failAccountChange(message) {
      this.error = message
      return { success: false, error: message }
    },

    async fetchProfile() {
      if (!this.user) return

      const { data, error } = await getProfile(this.user.id)

      if (!error) this.profile = data
    },

    // restores the session on app load; the router guard awaits this before
    // every navigation, so it only does the work once
    initSession() {
      if (!sessionReady) sessionReady = this.restoreSession()
      return sessionReady
    },

    async restoreSession() {
      this.loading = true
      const { data } = await getSession()

      if (data.session?.user) {
        this.user = data.session.user
        await this.fetchProfile()
      }

      this.loading = false

      // keep store in sync if the session changes (login/logout in another tab, token refresh, etc.)
      onAuthStateChange((_event, session) => {
        const userId = this.user?.id
        this.user = session?.user ?? null
        if (!this.user) {
          this.profile = null
        } else if (this.user.id !== userId) {
          // calling Supabase inside this callback can deadlock, so defer it
          setTimeout(() => this.fetchProfile(), 0)
        }
      })
    },
  },
})

// swap in edited actions during dev without needing a page refresh
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}

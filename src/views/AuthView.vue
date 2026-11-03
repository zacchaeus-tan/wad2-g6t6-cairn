<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AnimatePresence, motion } from 'motion-v'
import { useAuthStore } from '@/controller/authStore'
import { countries, genderLabels } from '@/lib/countries'
import { expandMotion, rowMotion } from '@/lib/motion'
import NoticeBox from '@/components/common/NoticeBox.vue'
import AuthWord from '@/components/auth/AuthWord.vue'
import TrailBackground from '@/components/auth/TrailBackground.vue'
import photo from '@/assets/img/cairn-valley.jpg'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const mode = ref('login') // login, register or forgot
const email = ref('')
const password = ref('')
const name = ref('')
const age = ref('')
const gender = ref('')
const country = ref('')
const about = ref('')
// Set when they arrive from the reset password page
const message = ref(
  route.query.reset === 'done' ? 'Password changed. Sign in with your new password.' : '',
)

// The unchosen word nudges until the switch has been used once
const hasSwitched = ref(false)

const headings = { login: 'Sign in', register: 'Create your profile', forgot: 'Reset your password' }
const submitLabels = { login: 'Sign in', register: 'Create profile', forgot: 'Send reset link' }

// Forgetting a password is part of signing in, so Sign In stays highlighted
const tab = computed(() => (mode.value === 'register' ? 'register' : 'login'))

function setMode(next) {
  hasSwitched.value = true
  mode.value = next
  auth.error = null
  message.value = ''
}

async function submit() {
  message.value = ''

  if (mode.value === 'forgot') {
    const { success } = await auth.requestPasswordReset(email.value)
    if (success) {
      message.value = 'If an account uses that email, a link to reset your password is on its way.'
    }
    return
  }

  const result =
    mode.value === 'login'
      ? await auth.login(email.value, password.value)
      : await auth.register({
          email: email.value,
          password: password.value,
          name: name.value,
          age: age.value,
          gender: gender.value,
          country: country.value,
          about: about.value,
        })

  if (!result.success) return

  if (result.needsConfirmation) {
    message.value = 'Account created. Check your email to confirm, then sign in.'
    mode.value = 'login'
  } else {
    // back to the page the router guard sent them away from, if any
    router.push(route.query.redirect || { name: 'profile' })
  }
}
</script>

<template>
  <section class="cairn auth">
    <div class="auth-backdrop">
      <!-- Sized to the screen, so the lines stay put when the form changes height -->
      <div class="auth-backdrop-screen">
        <img class="auth-photo" :src="photo" alt="" />
        <TrailBackground />
      </div>
    </div>

    <div class="auth-layout">
      <h1 class="cairn-visually-hidden">
        {{ headings[mode] }}
      </h1>

      <div class="auth-words">
        <AuthWord
          text="Sign In"
          label="Sign in"
          :active="tab === 'login'"
          :nudge="!hasSwitched && tab !== 'login'"
          @select="setMode('login')"
        />
        <AuthWord
          text="Register"
          label="Register"
          :active="tab === 'register'"
          :nudge="!hasSwitched && tab !== 'register'"
          @select="setMode('register')"
        />
      </div>

      <motion.form v-bind="rowMotion" class="auth-card" @submit.prevent="submit">
        <p v-if="mode === 'forgot'" class="cairn-fine auth-intro">
          Enter the email you signed up with and we'll send you a link to choose a new password.
        </p>

        <AnimatePresence>
          <motion.div v-if="mode === 'register'" v-bind="expandMotion" class="auth-extra">
            <div class="auth-field">
              <label class="cairn-label" for="name">Name</label>
              <input
                id="name"
                v-model="name"
                class="cairn-input"
                maxlength="60"
                autocomplete="name"
                required
              />
            </div>

            <div class="auth-row">
              <div class="auth-field">
                <label class="cairn-label" for="age">Age</label>
                <input
                  id="age"
                  v-model="age"
                  type="number"
                  class="cairn-input"
                  min="13"
                  max="120"
                  step="1"
                  required
                />
              </div>

              <div class="auth-field">
                <label class="cairn-label" for="gender">Gender</label>
                <select id="gender" v-model="gender" class="cairn-input" required>
                  <option value="" disabled>Select…</option>
                  <option v-for="(label, value) in genderLabels" :key="value" :value="value">
                    {{ label }}
                  </option>
                </select>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div class="auth-field">
          <label class="cairn-label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="cairn-input"
            autocomplete="email"
            required
          />
        </div>

        <div v-if="mode !== 'forgot'" class="auth-field">
          <label class="cairn-label" for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="cairn-input"
            minlength="6"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            required
          />
          <p v-if="mode === 'register'" class="cairn-fine">At least 6 characters.</p>
          <button
            v-if="mode === 'login'"
            type="button"
            class="cairn-link cairn-fine auth-aside"
            @click="setMode('forgot')"
          >
            Forgot password?
          </button>
        </div>

        <AnimatePresence>
          <motion.div v-if="mode === 'register'" v-bind="expandMotion" class="auth-extra">
            <div class="auth-field">
              <label class="cairn-label" for="country">Country</label>
              <select
                id="country"
                v-model="country"
                class="cairn-input"
                autocomplete="country-name"
                required
              >
                <option value="" disabled>Select…</option>
                <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>

            <div class="auth-field">
              <label class="cairn-label" for="about">About (optional)</label>
              <textarea
                id="about"
                v-model="about"
                class="cairn-input auth-about"
                rows="3"
                maxlength="500"
              ></textarea>
            </div>
          </motion.div>
        </AnimatePresence>

        <button class="cairn-btn auth-submit" :disabled="auth.loading" type="submit">
          {{ submitLabels[mode] }}
        </button>

        <button
          v-if="mode === 'forgot'"
          type="button"
          class="cairn-link cairn-fine auth-aside"
          @click="setMode('login')"
        >
          Back to sign in
        </button>

        <NoticeBox v-if="auth.error" type="error">{{ auth.error }}</NoticeBox>
        <NoticeBox v-if="message" type="success">{{ message }}</NoticeBox>
      </motion.form>
    </div>
  </section>
</template>

<style scoped>
.auth {
  position: relative;
  min-height: 100svh;
  background: var(--night);
  overflow-x: clip;
}

.auth-backdrop {
  position: absolute;
  inset: 0;
  overflow: clip;
}

.auth-backdrop-screen {
  position: sticky;
  top: 0;
  height: 100svh;
}

.auth-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.4;
  filter: saturate(0.55) brightness(0.8);
}

.auth-layout {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: center;
  row-gap: 32px;
  min-height: 100svh;
  padding: calc(var(--nav-height) + 40px) var(--gutter) 64px;
}

.auth-words {
  display: flex;
  justify-content: center;
  column-gap: clamp(12px, 4vw, 32px);
}

.auth-card {
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 460px;
  padding: clamp(24px, 4vw, 40px);
  background: var(--ground);
  box-shadow: var(--shadow-panel);
}

/* Clips the fields as they open. The padding keeps the focus rings from being cut off */
.auth-extra {
  display: grid;
  gap: 20px;
  margin: -8px;
  padding: 8px;
  overflow: hidden;
}

.auth-field {
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
}

.auth-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 16px;
}

.auth-about {
  min-height: 96px;
  padding-top: 10px;
  padding-bottom: 10px;
  resize: vertical;
}

/* .cairn-input swaps its outline for a soft glow; the card uses the solid ring */
.auth-card .cairn-input:focus-visible {
  outline: 3px solid var(--lake);
  outline-offset: 2px;
  box-shadow: none;
}

.auth-submit {
  width: 100%;
}

.auth-intro {
  margin: 0;
}

.auth-aside {
  justify-self: start;
}

@media (max-width: 479.98px) {
  .auth-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { motion } from 'motion-v'
import { useAuthStore } from '@/controller/authStore'
import { validatePasswordForm } from '@/lib/profileTools'
import { rowMotion } from '@/lib/motion'
import NoticeBox from '@/components/common/NoticeBox.vue'
import TrailBackground from '@/components/auth/TrailBackground.vue'
import photo from '@/assets/img/cairn-valley.jpg'

// The emailed link signs them in before this page loads, so a missing user
// means the link was wrong, already used or out of date.
const auth = useAuthStore()
const router = useRouter()

const password = ref('')
const confirm = ref('')
const saving = ref(false)
const showErrors = ref(false)
const formError = ref('')

const errors = computed(() =>
  showErrors.value ? validatePasswordForm({ password: password.value, confirm: confirm.value }) : {},
)

async function submit() {
  if (saving.value) return
  formError.value = ''
  showErrors.value = true
  if (Object.keys(errors.value).length) return

  saving.value = true
  const { success, error } = await auth.changePassword(password.value)
  saving.value = false

  if (!success) {
    formError.value = error
    return
  }

  // Signed out so they sign in with the new password, which shows it worked
  await auth.logout()
  router.push({ name: 'auth', query: { reset: 'done' } })
}
</script>

<template>
  <section class="cairn reset">
    <div class="reset-backdrop">
      <img class="reset-photo" :src="photo" alt="" />
      <TrailBackground />
    </div>

    <div class="reset-layout">
      <motion.div v-bind="rowMotion" class="reset-card">
        <h1 class="reset-title">Choose a new password</h1>

        <template v-if="!auth.user">
          <NoticeBox type="error">
            This reset link has expired or has already been used. Ask for a new one.
          </NoticeBox>
          <RouterLink class="cairn-btn" :to="{ name: 'auth' }">Back to sign in</RouterLink>
        </template>

        <form v-else class="reset-form" novalidate @submit.prevent="submit">
          <div class="reset-field">
            <label class="cairn-label" for="new-password">New password</label>
            <input
              id="new-password"
              v-model="password"
              type="password"
              class="cairn-input"
              autocomplete="new-password"
              required
              :aria-invalid="Boolean(errors.password)"
              :aria-describedby="errors.password ? 'new-password-error' : undefined"
            />
            <p v-if="errors.password" id="new-password-error" class="cairn-fine reset-error">
              {{ errors.password }}
            </p>
          </div>

          <div class="reset-field">
            <label class="cairn-label" for="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              v-model="confirm"
              type="password"
              class="cairn-input"
              autocomplete="new-password"
              required
              :aria-invalid="Boolean(errors.confirm)"
              :aria-describedby="errors.confirm ? 'confirm-password-error' : undefined"
            />
            <p v-if="errors.confirm" id="confirm-password-error" class="cairn-fine reset-error">
              {{ errors.confirm }}
            </p>
          </div>

          <button class="cairn-btn" :disabled="saving" type="submit">
            {{ saving ? 'Saving...' : 'Save new password' }}
          </button>

          <NoticeBox v-if="formError" type="error">{{ formError }}</NoticeBox>
        </form>
      </motion.div>
    </div>
  </section>
</template>

<style scoped>
.reset {
  position: relative;
  min-height: 100svh;
  background: var(--night);
  overflow: clip;
}

.reset-backdrop {
  position: absolute;
  inset: 0;
}

.reset-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.4;
  filter: saturate(0.55) brightness(0.8);
}

.reset-layout {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: center;
  min-height: 100svh;
  padding: calc(var(--nav-height) + 40px) var(--gutter) 64px;
}

.reset-card,
.reset-form {
  display: grid;
  gap: 20px;
  width: 100%;
}

.reset-card {
  max-width: 460px;
  padding: clamp(24px, 4vw, 40px);
  background: var(--ground);
  box-shadow: var(--shadow-panel);
}

.reset-title {
  margin: 0;
  font-size: 24px;
}

.reset-field {
  display: grid;
  gap: 8px;
}

.reset-error {
  margin: 0;
  color: var(--blaze-deep);
}

.reset-card .cairn-input:focus-visible {
  outline: 3px solid var(--lake);
  outline-offset: 2px;
  box-shadow: none;
}
</style>

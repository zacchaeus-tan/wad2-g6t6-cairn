<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useAuthStore } from '@/controller/authStore'
import { validatePasswordForm } from '@/lib/profileTools'
import NoticeBox from '@/components/common/NoticeBox.vue'

const emit = defineEmits(['done']) // true when the password changed

const auth = useAuthStore()

// Only ever held here, and gone when the form closes
const password = ref('')
const confirm = ref('')
const saving = ref(false)
const showErrors = ref(false)
const formError = ref('')

const currentErrors = () =>
  validatePasswordForm({ password: password.value, confirm: confirm.value })
const errors = computed(() => (showErrors.value ? currentErrors() : {}))

onMounted(() => document.getElementById('edit-password')?.focus({ preventScroll: true }))

async function submit() {
  if (saving.value) return
  formError.value = ''
  showErrors.value = true

  const [firstInvalid] = Object.keys(currentErrors())
  if (firstInvalid) {
    await nextTick()
    document.getElementById(firstInvalid === 'password' ? 'edit-password' : 'edit-confirm')?.focus()
    return
  }

  saving.value = true
  const { success, error } = await auth.changePassword(password.value)
  saving.value = false

  if (success) emit('done', true)
  else formError.value = error
}
</script>

<template>
  <form class="profile-form" novalidate @submit.prevent="submit">
    <div class="profile-form-fields">
      <div class="profile-form-field">
        <label class="cairn-label" for="edit-password">New password</label>
        <input
          id="edit-password"
          v-model="password"
          class="cairn-input"
          type="password"
          autocomplete="new-password"
          required
          :aria-invalid="Boolean(errors.password)"
          :aria-describedby="errors.password ? 'edit-password-error' : undefined"
        />
        <p v-if="errors.password" id="edit-password-error" class="profile-form-error">
          {{ errors.password }}
        </p>
      </div>

      <div class="profile-form-field">
        <label class="cairn-label" for="edit-confirm">Confirm new password</label>
        <input
          id="edit-confirm"
          v-model="confirm"
          class="cairn-input"
          type="password"
          autocomplete="new-password"
          required
          :aria-invalid="Boolean(errors.confirm)"
          :aria-describedby="errors.confirm ? 'edit-confirm-error' : undefined"
        />
        <p v-if="errors.confirm" id="edit-confirm-error" class="profile-form-error">
          {{ errors.confirm }}
        </p>
      </div>
    </div>

    <NoticeBox v-if="formError" type="error">{{ formError }}</NoticeBox>

    <div class="profile-form-actions">
      <button type="submit" class="cairn-btn is-small" :disabled="saving">
        {{ saving ? 'Saving...' : 'Change password' }}
      </button>
      <button
        type="button"
        class="cairn-btn is-ghost is-small"
        :disabled="saving"
        @click="emit('done', false)"
      >
        Cancel
      </button>
    </div>
  </form>
</template>

<style src="./profileForm.css" scoped></style>

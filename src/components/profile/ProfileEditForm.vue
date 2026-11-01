<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useAuthStore } from '@/controller/authStore'
import { countries, genderLabels } from '@/lib/countries'
import {
  ABOUT_MAX,
  AGE_MAX,
  AGE_MIN,
  NAME_MAX,
  profileFormChanged,
  profileFormFrom,
  validateProfileForm,
} from '@/lib/profileTools'
import NoticeBox from '@/components/common/NoticeBox.vue'

const props = defineProps({
  profile: { type: Object, required: true },
})
const emit = defineEmits(['done']) // true when something was saved

const auth = useAuthStore()

const form = ref(profileFormFrom(props.profile))
const saving = ref(false)
const showErrors = ref(false)
const formError = ref('')

const errors = computed(() => (showErrors.value ? validateProfileForm(form.value) : {}))

// The ids of what describes a field, for aria-describedby
const describedBy = (field) => (errors.value[field] ? `edit-${field}-error` : undefined)

onMounted(() => document.getElementById('edit-name')?.focus({ preventScroll: true }))

async function submit() {
  if (saving.value) return
  formError.value = ''
  showErrors.value = true

  const [firstInvalid] = Object.keys(validateProfileForm(form.value))
  if (firstInvalid) {
    await nextTick()
    document.getElementById(`edit-${firstInvalid}`)?.focus()
    return
  }
  if (!profileFormChanged(props.profile, form.value)) {
    emit('done', false)
    return
  }

  saving.value = true
  const { success, error } = await auth.saveProfile(form.value)
  saving.value = false

  if (success) emit('done', true)
  else formError.value = error
}
</script>

<template>
  <form class="profile-form" novalidate @submit.prevent="submit">
    <div class="profile-form-fields">
      <div class="profile-form-field">
        <label class="cairn-label" for="edit-name">Name</label>
        <input
          id="edit-name"
          v-model="form.name"
          class="cairn-input"
          autocomplete="name"
          required
          :maxlength="NAME_MAX"
          :aria-invalid="Boolean(errors.name)"
          :aria-describedby="describedBy('name')"
        />
        <p v-if="errors.name" id="edit-name-error" class="profile-form-error">{{ errors.name }}</p>
      </div>

      <div class="profile-form-field">
        <label class="cairn-label" for="edit-age">Age</label>
        <input
          id="edit-age"
          v-model="form.age"
          class="cairn-input"
          type="number"
          inputmode="numeric"
          required
          :min="AGE_MIN"
          :max="AGE_MAX"
          step="1"
          :aria-invalid="Boolean(errors.age)"
          :aria-describedby="describedBy('age')"
        />
        <p v-if="errors.age" id="edit-age-error" class="profile-form-error">{{ errors.age }}</p>
      </div>

      <div class="profile-form-field">
        <label class="cairn-label" for="edit-gender">Gender</label>
        <select
          id="edit-gender"
          v-model="form.gender"
          class="cairn-input"
          required
          :aria-invalid="Boolean(errors.gender)"
          :aria-describedby="describedBy('gender')"
        >
          <option value="" disabled>Select</option>
          <option v-for="(label, key) in genderLabels" :key="key" :value="key">{{ label }}</option>
        </select>
        <p v-if="errors.gender" id="edit-gender-error" class="profile-form-error">
          {{ errors.gender }}
        </p>
      </div>

      <div class="profile-form-field">
        <label class="cairn-label" for="edit-country">Country</label>
        <select
          id="edit-country"
          v-model="form.country"
          class="cairn-input"
          required
          :aria-invalid="Boolean(errors.country)"
          :aria-describedby="describedBy('country')"
        >
          <option value="" disabled>Select</option>
          <option v-for="country in countries" :key="country" :value="country">
            {{ country }}
          </option>
        </select>
        <p v-if="errors.country" id="edit-country-error" class="profile-form-error">
          {{ errors.country }}
        </p>
      </div>

      <div class="profile-form-field is-wide">
        <label class="cairn-label" for="edit-about">About (optional)</label>
        <textarea
          id="edit-about"
          v-model="form.about"
          class="cairn-input"
          rows="4"
          :maxlength="ABOUT_MAX"
          :aria-invalid="Boolean(errors.about)"
          :aria-describedby="['edit-about-count', describedBy('about')].filter(Boolean).join(' ')"
        ></textarea>
        <p id="edit-about-count" class="cairn-data profile-form-count">
          {{ form.about.length }} / {{ ABOUT_MAX }}
        </p>
        <p v-if="errors.about" id="edit-about-error" class="profile-form-error">
          {{ errors.about }}
        </p>
      </div>
    </div>

    <NoticeBox v-if="formError" type="error">{{ formError }}</NoticeBox>

    <div class="profile-form-actions">
      <button type="submit" class="cairn-btn is-small" :disabled="saving">
        {{ saving ? 'Saving...' : 'Save changes' }}
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

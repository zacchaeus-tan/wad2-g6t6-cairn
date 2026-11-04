<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useAuthStore } from '@/controller/authStore'
import { countries, genderLabels } from '@/lib/countries'
import {
  ABOUT_MAX,
  AGE_MAX,
  AGE_MIN,
  AVATAR_TYPES,
  NAME_MAX,
  profileFormChanged,
  profileFormFrom,
  validateAvatarFile,
  validateProfileForm,
} from '@/lib/profileTools'
import NoticeBox from '@/components/common/NoticeBox.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'

const props = defineProps({
  profile: { type: Object, required: true },
  submitLabel: { type: String, default: 'Save changes' },
  cancellable: { type: Boolean, default: true },
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

// ---------- profile picture ----------
// A picked picture is only uploaded when the form is saved

const avatarInput = useTemplateRef('avatarInput')
const avatarFile = ref(null)
const avatarRemoved = ref(false)
const avatarError = ref('')
const avatarFileUrl = ref(null)

// Object URLs hold the file in memory until they're revoked
watch(avatarFile, (file) => {
  if (avatarFileUrl.value) URL.revokeObjectURL(avatarFileUrl.value)
  avatarFileUrl.value = file ? URL.createObjectURL(file) : null
})
onBeforeUnmount(() => avatarFileUrl.value && URL.revokeObjectURL(avatarFileUrl.value))

const avatarPreview = computed(() => {
  if (avatarFile.value) return avatarFileUrl.value
  return avatarRemoved.value ? null : auth.avatarUrl
})

const avatarChanged = computed(
  () => Boolean(avatarFile.value) || (avatarRemoved.value && Boolean(props.profile.avatar_path)),
)

function pickAvatar(event) {
  const [file] = event.target.files
  event.target.value = '' // so picking the same file again still fires change
  if (!file) return

  avatarError.value = validateAvatarFile(file)
  if (avatarError.value) return
  avatarFile.value = file
  avatarRemoved.value = false
}

function removeAvatar() {
  avatarFile.value = null
  avatarRemoved.value = true
  avatarError.value = ''
}

async function saveAvatar() {
  if (avatarFile.value) return auth.saveAvatar(avatarFile.value)
  return auth.clearAvatar()
}

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
  const fieldsChanged = profileFormChanged(props.profile, form.value)
  if (!fieldsChanged && !avatarChanged.value) {
    emit('done', false)
    return
  }

  saving.value = true
  let result = { success: true }
  if (fieldsChanged) result = await auth.saveProfile(form.value)
  if (result.success && avatarChanged.value) result = await saveAvatar()
  saving.value = false

  if (result.success) emit('done', true)
  else formError.value = result.error
}
</script>

<template>
  <form class="profile-form" novalidate @submit.prevent="submit">
    <div class="profile-form-fields">
      <div class="profile-form-field is-wide">
        <label class="cairn-label" for="edit-avatar">Profile picture (optional)</label>
        <div class="profile-form-avatar">
          <UserAvatar :src="avatarPreview" :name="form.name.trim() || auth.user?.email" />
          <div class="profile-form-avatar-actions">
            <button
              id="edit-avatar"
              type="button"
              class="cairn-btn is-ghost is-small"
              :aria-describedby="['edit-avatar-hint', avatarError && 'edit-avatar-error'].filter(Boolean).join(' ')"
              @click="avatarInput.click()"
            >
              {{ avatarPreview ? 'Change picture' : 'Choose picture' }}
            </button>
            <button
              v-if="avatarPreview"
              type="button"
              class="cairn-btn is-ghost is-small"
              @click="removeAvatar"
            >
              Remove
            </button>
            <input
              ref="avatarInput"
              type="file"
              :accept="AVATAR_TYPES.join(',')"
              hidden
              @change="pickAvatar"
            />
          </div>
        </div>
        <p id="edit-avatar-hint" class="profile-form-hint">JPEG, PNG or WebP, up to 2 MB.</p>
        <p v-if="avatarError" id="edit-avatar-error" class="profile-form-error">{{ avatarError }}</p>
      </div>

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
        {{ saving ? 'Saving...' : submitLabel }}
      </button>
      <button
        v-if="cancellable"
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

<script setup>
import { computed } from 'vue'
import { genderLabels } from '@/lib/countries'

const props = defineProps({
  profile: { type: Object, required: true },
  email: { type: String, default: '' },
})

// "Singapore · 21 · Female", skipping anything not filled in
const profileDetails = computed(() => {
  const p = props.profile
  const gender = p.gender === 'prefer_not_to_say' ? null : genderLabels[p.gender]
  return [p.country, p.age, gender].filter(Boolean).join(' · ')
})

const displayName = computed(() => props.profile.display_name || props.email)

// "Jane Tan" -> "JT", "jane@x.com" -> "J"
const initials = computed(() =>
  displayName.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join(''),
)
</script>

<template>
  <div class="card mb-4">
    <div class="card-body d-flex align-items-center gap-3">
      <div
        class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
        style="width: 64px; height: 64px; font-size: 1.5rem"
      >
        {{ initials }}
      </div>

      <div class="flex-grow-1">
        <h2 class="h5 mb-0">{{ displayName }}</h2>
        <p v-if="profileDetails" class="small text-muted mb-1">{{ profileDetails }}</p>
        <div class="d-flex flex-wrap gap-2 mb-1">
          <span class="badge bg-secondary text-capitalize">
            {{ profile.experience_level || 'Experience not set' }}
          </span>
        </div>
        <p v-if="profile.about" class="mb-0 mt-2">{{ profile.about }}</p>
      </div>
    </div>
  </div>
</template>

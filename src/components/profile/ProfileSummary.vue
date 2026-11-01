<script setup>
import { computed } from 'vue'
import { genderLabels } from '@/lib/countries'
import ProfileAccount from './ProfileAccount.vue'

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
  <div class="profile-summary">
    <div class="profile-summary-avatar" aria-hidden="true">{{ initials }}</div>
    <div class="profile-summary-text">
      <h2 class="cairn-headline profile-summary-name">{{ displayName }}</h2>
      <p v-if="profileDetails" class="profile-summary-details">{{ profileDetails }}</p>
      <p v-if="profile.about?.trim()" class="profile-summary-about">{{ profile.about }}</p>
      <p class="profile-summary-chip">{{ profile.experience_level || 'Experience not set' }}</p>
    </div>
    <ProfileAccount />
  </div>
</template>

<style scoped>
.profile-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px 24px;
}

.profile-summary-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 72px;
  height: 72px;
  background: var(--pine);
  color: var(--paper);
  font-size: 28px;
  font-weight: 900;
}

.profile-summary-text {
  display: grid;
  flex: 1 1 16rem;
  justify-items: start;
  gap: 8px;
  min-width: 0;
}

.profile-summary-name {
  overflow-wrap: anywhere;
}

.profile-summary-details {
  color: var(--granite-700);
}

.profile-summary-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid var(--ink);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.profile-summary-about {
  max-width: 60ch;
  color: var(--granite-700);
  white-space: pre-line;
  overflow-wrap: anywhere;
}
</style>

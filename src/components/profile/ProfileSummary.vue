<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/controller/authStore'
import { genderLabels } from '@/lib/countries'
import UserAvatar from '@/components/common/UserAvatar.vue'
import ProfileAccountButtons from '@/components/profile/ProfileAccountButtons.vue'

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

const auth = useAuthStore()

const displayName = computed(() => props.profile.display_name || props.email)
</script>

<template>
  <div class="profile-summary">
    <UserAvatar :src="auth.avatarUrl" :name="displayName" />
    <div class="profile-summary-main">
      <h2 class="cairn-headline profile-summary-name">{{ displayName }}</h2>
      <div
        class="profile-summary-text d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-2 gap-sm-3"
      >
        <p v-if="profileDetails" class="profile-summary-details">{{ profileDetails }}</p>
        <p v-if="profileDetails && profile.about?.trim()" class="d-none d-sm-block">|</p>
        <p v-if="profile.about?.trim()" class="profile-summary-about">{{ profile.about }}</p>
        <p v-if="profile.about?.trim()" class="d-none d-sm-block">|</p>
        <p class="profile-summary-chip">{{ profile.experience_level || 'Experience not set' }}</p>
      </div>
    </div>
    <ProfileAccountButtons />
  </div>
</template>

<style scoped>
.profile-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px 24px;
}

.profile-summary-main {
  display: grid;
  flex: 1 1 16rem;
  gap: 8px;
  min-width: 0;
}

.profile-summary-text {
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
  flex: none;
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

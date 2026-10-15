<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/controller/authStore'
import { genderLabels } from '@/lib/countries'

// the router guard only lets signed-in users reach this page
const auth = useAuthStore()

// "Singapore · 21 · Female", skipping anything not filled in
const profileDetails = computed(() => {
  const p = auth.profile
  if (!p) return ''
  const gender = p.gender === 'prefer_not_to_say' ? null : genderLabels[p.gender]
  return [p.country, p.age, gender].filter(Boolean).join(' · ')
})
</script>

<template>
  <div class="container" style="max-width: 720px">
    <h1 class="h3 mb-3">My profile</h1>

    <div v-if="!auth.profile" class="alert alert-warning">
      We couldn't load your profile. Try refreshing the page.
    </div>

    <!-- quiz summary -->
    <div v-else class="card mb-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h2 class="h5 mb-1">{{ auth.profile.display_name || auth.user.email }}</h2>
            <p v-if="profileDetails" class="small text-muted mb-2">{{ profileDetails }}</p>
            <p v-if="auth.profile.about" class="mb-2" style="white-space: pre-line">{{ auth.profile.about }}</p>
            <p class="small text-muted mb-2">
              Experience: {{ auth.profile.experience_level || 'not set' }}
            </p>
            <p v-if="auth.profile.fitness_score != null" class="mb-0">
              Fitness score: <strong>{{ auth.profile.fitness_score }}</strong> / 100
            </p>
          </div>

          <RouterLink class="btn btn-sm btn-outline-primary" :to="{ name: 'quiz' }">
            {{ auth.profile.fitness_score != null ? 'Retake quiz' : 'Take the quiz' }}
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- saved gear checklists go here once the checklist store supports listing them -->
  </div>
</template>

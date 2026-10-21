<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/controller/authStore'
import { genderLabels } from '@/lib/countries'
import { quizQuestions, quizAnswer } from '@/lib/quizQuestions'

// the router guard only lets signed-in users reach this page
const auth = useAuthStore()

// "Singapore · 21 · Female", skipping anything not filled in
const profileDetails = computed(() => {
  const p = auth.profile
  if (!p) return ''
  const gender = p.gender === 'prefer_not_to_say' ? null : genderLabels[p.gender]
  return [p.country, p.age, gender].filter(Boolean).join(' · ')
})

const displayName = computed(() => auth.profile?.display_name || auth.user?.email || '')

// "Jane Tan" -> "JT", "jane@x.com" -> "J"
const initials = computed(() =>
  displayName.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join(''),
)

// what the user told us in the quiz, shown as the option they picked; null means not answered
const statLabels = {
  longest_distance_km: 'Longest distance',
  max_elevation_gain_m: 'Max elevation gain',
  highest_altitude_m: 'Highest altitude',
  longest_trek_days: 'Longest trek',
}

const experienceStats = computed(() =>
  quizQuestions
    .filter((question) => statLabels[question.column])
    .map((question) => ({
      label: statLabels[question.column],
      value: quizAnswer(auth.profile, question)?.desc ?? null,
    })),
)

// placeholder: there's no hike log table yet, so these always show "—"
const hikeStats = [
  { label: 'Hikes completed', value: null, unit: '' },
  { label: 'Total distance', value: null, unit: 'km' },
]
</script>

<template>
  <div class="container" style="max-width: 720px">
    <h1 class="h3 mb-3">My profile</h1>

    <div v-if="!auth.profile" class="alert alert-warning">
      We couldn't load your profile. Try refreshing the page.
    </div>

    <!-- quick profile -->
    <div v-else class="card mb-4">
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
              {{ auth.profile.experience_level || 'Experience not set' }}
            </span>
          </div>
          <p v-if="auth.profile.about" class="small mb-0" style="white-space: pre-line">{{ auth.profile.about }}</p>
        </div>
      </div>
    </div>

    <template v-if="auth.profile">
      <!-- experience from the quiz -->
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h2 class="h6 text-muted text-uppercase mb-0">Your experience</h2>
        <RouterLink class="btn btn-sm btn-outline-primary" :to="{ name: 'quiz' }">
          {{ auth.profile.quiz_completed_at ? 'Retake quiz' : 'Take the quiz' }}
        </RouterLink>
      </div>
      <div class="row g-3 mb-4">
        <div v-for="stat in experienceStats" :key="stat.label" class="col-6 col-md-3">
          <div class="card h-100 text-center">
            <div class="card-body">
              <div class="small text-muted">{{ stat.label }}</div>
              <div class="h6 mb-0">{{ stat.value ?? '—' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- hiking totals: placeholder until hikes are tracked in the database -->
      <h2 class="h6 text-muted text-uppercase mb-2">Your hikes</h2>
      <div class="row g-3 mb-2">
        <div v-for="stat in hikeStats" :key="stat.label" class="col-6">
          <div class="card h-100 text-center">
            <div class="card-body">
              <div class="small text-muted">{{ stat.label }}</div>
              <div class="h4 mb-0">
                <template v-if="stat.value != null">{{ stat.value }} <span class="fs-6">{{ stat.unit }}</span></template>
                <template v-else>—</template>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p class="small text-muted mb-4">Hike tracking is coming soon.</p>
    </template>

    <!-- saved gear checklists go here once the checklist store supports listing them -->
  </div>
</template>

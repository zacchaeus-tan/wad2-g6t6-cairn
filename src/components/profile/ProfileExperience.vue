<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { quizQuestions, quizAnswer } from '@/lib/quizQuestions'

const props = defineProps({
  profile: { type: Object, required: true },
})

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
      value: quizAnswer(props.profile, question)?.desc ?? null,
    })),
)
</script>

<template>
  <section aria-labelledby="experience-title">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h2 id="experience-title" class="h6 text-muted text-uppercase mb-0">Your experience</h2>
      <RouterLink class="btn btn-sm btn-outline-primary" :to="{ name: 'quiz' }">
        {{ profile.quiz_completed_at ? 'Retake quiz' : 'Take the quiz' }}
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
  </section>
</template>

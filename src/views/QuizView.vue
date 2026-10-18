<script setup>
import { ref, onMounted, watch } from 'vue'
import { RouterLink,useRouter } from 'vue-router'
import { useAuthStore } from '@/controller/authStore'

const auth = useAuthStore()
const saved = ref(false)
const router = useRouter()

const hikingDuration = [
  { val: '0', desc: 'Not yet — I haven\'t started hiking' },
  { val: '<1', desc: 'Less than a year' },
  { val: '1-3', desc: '1–3 years' },
  { val: '3-5', desc: '3–5 years' },
  { val: '>5', desc: 'More than 5 years' },
]

const hikingFrequency = [
  { val: 'beginner', desc: 'Beginner — this would be my first real hike' },
  { val: 'occasional', desc: 'Occasional — a few times a year' },
  { val: 'regular', desc: 'Regular — monthly or more' },
  { val: 'experienced', desc: 'Experienced — multi-day treks regularly' },
]

const hikeTypes = [
  { val: 'day', desc: 'Day hikes' },
  { val: 'overnight', desc: 'Overnight hikes' },
  { val: 'multiday', desc: 'Multi-day treks' },
  { val: 'summit', desc: 'Summit hikes' },
]

// Default answers — used for new users and for any profile field that is null
const defaultAnswers = {
  hikingDuration: '0',
  hikeTypes: [],
  experienceLevel: 'beginner',
  longestDistanceKm: 0,
  highestAltitudeM: 0,
  goalsText: '',
}

const answers = ref({ ...defaultAnswers, hikeTypes: [...defaultAnswers.hikeTypes] })

function loadFromProfile() {
  if (!auth.profile) return
  answers.value = {
    hikingDuration: auth.profile.hiking_duration ?? defaultAnswers.hikingDuration,
    hikeTypes: auth.profile.hike_types ?? [...defaultAnswers.hikeTypes],
    experienceLevel: auth.profile.experience_level ?? defaultAnswers.experienceLevel,
    longestDistanceKm: auth.profile.longest_distance_km ?? defaultAnswers.longestDistanceKm,
    highestAltitudeM: auth.profile.highest_altitude_m ?? defaultAnswers.highestAltitudeM,
    goalsText: auth.profile.goals_text ?? defaultAnswers.goalsText,
  }
}

onMounted(loadFromProfile)
watch(() => auth.profile, loadFromProfile)

async function submit() {
  saved.value = false
  const result = await auth.saveQuiz(answers.value)
  saved.value = result.success
  if (result.success) setTimeout(() => router.push('/profile'), 2000)
}
</script>

<template>
  <div class="container" style="max-width: 640px">
    <h1 class="h3 mb-3">Your hiking profile</h1>

    <div v-if="!auth.isLoggedIn" class="alert alert-warning">
      <RouterLink to="/auth">Sign in</RouterLink> to take the quiz.
    </div>

    <form v-else @submit.prevent="submit">
      <div class="mb-3">
        <label class="form-label" for="duration">How long have you been hiking?</label>
        <select id="duration" v-model="answers.hikingDuration" class="form-select">
          <option v-for="option in hikingDuration" :key="option.val" :value="option.val" >
            {{ option.desc }}
          </option>
        </select>
      </div>

      <div class="mb-3">
        <label class="form-label" for="frequency">How often do you hike?</label>
        <select id="frequency" v-model="answers.experienceLevel" class="form-select">
          <option v-for="option in hikingFrequency" :key="option.val" :value="option.val">
            {{ option.desc }}
          </option>
        </select>
      </div>

      <div class="mb-3">
        <span class="form-label d-block">What types of hikes do you do?</span>
        <div v-for="option in hikeTypes" :key="option.val" class="form-check">
          <input :id="`type-${option.val}`" v-model="answers.hikeTypes" :value="option.val" type="checkbox" class="form-check-input" />
          <label class="form-check-label" :for="`type-${option.val}`">{{ option.desc }}</label>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label" for="distance">Longest hike so far (km)</label>
        <input id="distance" v-model.number="answers.longestDistanceKm" type="number" min="0" step="0.1" class="form-control" />
      </div>

      <div class="mb-3">
        <label class="form-label" for="altitude">Highest altitude reached (m)</label>
        <input id="altitude" v-model.number="answers.highestAltitudeM" type="number" min="0" class="form-control" />
      </div>

      <div class="mb-3">
        <label class="form-label" for="goals">What are you training for? (optional)</label>
        <textarea id="goals" v-model="answers.goalsText" class="form-control" rows="3"></textarea>
      </div>

      <button class="btn btn-success" :disabled="auth.loading" type="submit">Save answers</button>
    </form>

    <div v-if="saved" class="alert alert-success mt-3">Saved.</div>
    <div v-if="auth.error" class="alert alert-danger mt-3">{{ auth.error }}</div>
  </div>
</template>


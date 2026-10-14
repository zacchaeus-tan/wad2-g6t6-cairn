<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { fetchRouteById } from '../api/routes'

const routeParams = useRoute()
const route = ref(null)
const loading = ref(true)
const error = ref('')

const difficultyLabels = {
  1: 'Easy',
  2: 'Moderate',
  3: 'Hard',
  4: 'Strenuous',
}

function formatValue(value, unit = '') {
  if (value == null || value === '') {
    return 'Not listed'
  }

  return `${value}${unit}`
}

function formatDifficulty(value) {
  if (value == null || value === '') {
    return 'Not rated'
  }

  return difficultyLabels[value] ?? value
}

function formatBoolean(value) {
  if (value == null) {
    return 'Not listed'
  }

  return value ? 'Required' : 'Not required'
}

function formatDuration(value) {
  if (value == null || value === '') {
    return 'Not listed'
  }

  return `${value} ${Number(value) === 1 ? 'day' : 'days'}`
}

function formatCompletionRate(value) {
  if (value == null || value === '') {
    return 'Not listed'
  }

  const rate = Number(value)
  return Number.isFinite(rate)
    ? `${(rate * 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}%`
    : value
}

onMounted(async () => {
  try {
    route.value = await fetchRouteById(routeParams.params.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error.value = `Unable to load this route: ${message}`
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="container route-detail-page py-5">
    <RouterLink class="back-link mb-4" to="/routes">Back to all routes</RouterLink>

    <p v-if="loading" role="status">Loading route...</p>
    <p v-else-if="error" class="route-detail-message" role="alert">{{ error }}</p>
    <p v-else-if="!route" class="route-detail-message">This route could not be found.</p>

    <template v-else>
      <header class="route-detail-heading mb-5">
        <p v-if="route.country" class="route-eyebrow mb-2">{{ route.country }}</p>
        <h1 class="display-5 fw-semibold mb-3">{{ route.name }}</h1>
        <p v-if="route.technical_rating" class="lead mb-0">
          Official rating: {{ route.technical_rating }}
        </p>
      </header>

      <div class="row g-4">
        <section class="col-12 col-lg-6" aria-labelledby="route-overview-title">
          <div class="route-detail-section h-100">
            <h2 id="route-overview-title" class="h4 mb-4">Route overview</h2>
            <dl class="route-detail-facts">
              <div>
                <dt>Distance</dt>
                <dd>{{ formatValue(route.distance_km, ' km') }}</dd>
              </div>
              <div>
                <dt>Elevation gain</dt>
                <dd>{{ formatValue(route.elevation_gain_m, ' m') }}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{{ formatDuration(route.duration_days) }}</dd>
              </div>
              <div>
                <dt>Maximum altitude</dt>
                <dd>{{ formatValue(route.altitude_m, ' m') }}</dd>
              </div>
              <div>
                <dt>Multiday route</dt>
                <dd>{{ formatBoolean(route.is_multiday) }}</dd>
              </div>
              <div>
                <dt>Permit</dt>
                <dd>{{ formatBoolean(route.permit_required) }}</dd>
              </div>
              <div>
                <dt>Guide</dt>
                <dd>{{ formatBoolean(route.guide_required) }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="col-12 col-lg-6" aria-labelledby="route-feedback-title">
          <div class="route-detail-section h-100">
            <h2 id="route-feedback-title" class="h4 mb-4">Difficulty and community feedback</h2>
            <dl class="route-detail-facts">
              <div>
                <dt>Official difficulty</dt>
                <dd>{{ formatDifficulty(route.official_difficulty ?? route.technical_rating) }}</dd>
              </div>
              <div>
                <dt>Community-adjusted difficulty</dt>
                <dd>{{ formatDifficulty(route.effective_difficulty) }}</dd>
              </div>
              <div>
                <dt>Average perceived difficulty</dt>
                <dd>{{ formatValue(route.avg_perceived_difficulty, ' / 4') }}</dd>
              </div>
              <div>
                <dt>Average rating</dt>
                <dd>{{ formatValue(route.avg_rating, ' / 5') }}</dd>
              </div>
              <div>
                <dt>Reviews</dt>
                <dd>{{ formatValue(route.review_count) }}</dd>
              </div>
              <div>
                <dt>Completion rate</dt>
                <dd>{{ formatCompletionRate(route.completion_rate) }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="col-12" aria-labelledby="route-safety-title">
          <div class="route-detail-section">
            <h2 id="route-safety-title" class="h4 mb-4">Safety and hazards</h2>
            <dl class="route-detail-facts">
              <div>
                <dt>Safety status</dt>
                <dd>{{ formatValue(route.safety_status) }}</dd>
              </div>
              <div>
                <dt>Safety note</dt>
                <dd>{{ formatValue(route.safety_status_note) }}</dd>
              </div>
              <div>
                <dt>Community hazard level</dt>
                <dd>{{ formatValue(route.community_hazard_level) }}</dd>
              </div>
              <div>
                <dt>Community hazard note</dt>
                <dd>{{ formatValue(route.community_hazard_note) }}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.route-detail-page {
  max-width: 1200px;
}

.back-link {
  display: inline-block;
}

.route-detail-heading {
  max-width: 760px;
}

.route-eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.route-detail-section,
.route-detail-message {
  border: 1px solid currentColor;
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.route-detail-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: 1.25rem;
  margin-bottom: 0;
}

.route-detail-facts dt {
  font-weight: 600;
}

.route-detail-facts dd {
  margin-bottom: 0;
}
</style>

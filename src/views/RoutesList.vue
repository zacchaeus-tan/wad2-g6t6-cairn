<script setup>
import { onMounted, ref } from 'vue'
import { fetchRoutes } from '../api/routes'

const routes = ref([])
const loading = ref(true)
const error = ref('')

const difficultyLabels = {
  1: 'Easy',
  2: 'Moderate',
  3: 'Hard',
  4: 'Strenuous',
}

function formatDifficulty(route) {
  const value =
    route.effective_difficulty ?? route.official_difficulty ?? route.technical_rating

  if (value == null || value === '') {
    return 'Not rated'
  }

  return difficultyLabels[value] ?? value
}

function formatDistance(value) {
  if (value == null || value === '') {
    return 'Not listed'
  }

  const distance = Number(value)
  return Number.isFinite(distance)
    ? `${distance.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`
    : `${value} km`
}

function formatElevation(value) {
  if (value == null || value === '') {
    return 'Not listed'
  }

  const elevation = Number(value)
  return Number.isFinite(elevation)
    ? `${elevation.toLocaleString()} m`
    : `${value} m`
}

function formatDuration(value) {
  if (value == null || value === '') {
    return 'Not listed'
  }

  return `${value} ${Number(value) === 1 ? 'day' : 'days'}`
}

onMounted(async () => {
  try {
    routes.value = await fetchRoutes()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error.value = `Unable to load routes: ${message}`
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="container routes-page py-5">
    <header class="routes-heading mb-5">
      <p class="routes-eyebrow mb-2">Explore</p>
      <h1 class="display-5 fw-semibold mb-3">All routes</h1>
      <p class="lead mb-0">Find a route that fits your plans and experience.</p>
    </header>

    <p v-if="loading" class="mb-0" role="status">Loading routes...</p>
    <p v-else-if="error" class="routes-message mb-0" role="alert">{{ error }}</p>
    <p v-else-if="routes.length === 0" class="routes-message mb-0">
      No routes are available right now.
    </p>

    <div v-else class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      <div v-for="route in routes" :key="route.id" class="col">
        <RouterLink
          class="route-link"
          :to="{ name: 'route-detail', params: { id: route.id } }"
          :aria-label="`View details for ${route.name}`"
        >
          <article class="card route-card h-100">
            <div class="card-body d-flex flex-column p-4">
              <p v-if="route.country" class="route-eyebrow mb-2">{{ route.country }}</p>
              <h2 class="h4 mb-4">{{ route.name }}</h2>

              <dl class="route-facts row row-cols-2 g-3 mb-4">
                <div class="col">
                  <dt class="small">Distance</dt>
                  <dd class="mb-0">{{ formatDistance(route.distance_km) }}</dd>
                </div>
                <div class="col">
                  <dt class="small">Elevation gain</dt>
                  <dd class="mb-0">{{ formatElevation(route.elevation_gain_m) }}</dd>
                </div>
                <div class="col">
                  <dt class="small">Duration</dt>
                  <dd class="mb-0">{{ formatDuration(route.duration_days) }}</dd>
                </div>
                <div class="col">
                  <dt class="small">Difficulty</dt>
                  <dd class="mb-0">{{ formatDifficulty(route) }}</dd>
                </div>
              </dl>

              <div class="route-footer mt-auto">
                <p v-if="route.safety_status" class="mb-2">
                  <strong>Safety:</strong> {{ route.safety_status }}
                </p>
                <p v-if="route.safety_status_note" class="mb-2">
                  {{ route.safety_status_note }}
                </p>
                <p v-if="route.avg_rating != null" class="small mb-0">
                  Rating: {{ route.avg_rating }}<span v-if="route.review_count != null">
                    · {{ route.review_count }} reviews</span
                  >
                </p>
              </div>
            </div>
          </article>
        </RouterLink>
      </div>
    </div>
  </main>
</template>

<style scoped>
.routes-page {
  max-width: 1200px;
}

.routes-heading {
  max-width: 760px;
}

.routes-eyebrow,
.route-eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.route-card {
  border-color: currentColor;
  border-radius: 0.75rem;
}

.route-link {
  display: block;
  height: 100%;
  color: inherit;
  cursor: pointer;
  text-decoration: none;
}

.route-link:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
  border-radius: 0.75rem;
}

.route-facts dt {
  font-weight: 600;
}

.route-footer {
  border-top: 1px solid currentColor;
  padding-top: 1rem;
}

.routes-message {
  border: 1px solid currentColor;
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
}
</style>

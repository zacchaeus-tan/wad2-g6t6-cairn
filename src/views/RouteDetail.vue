<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { fetchRouteById } from '../controller/routesController'
import { useReviewsStore } from '../controller/reviewsStore'
import { useAuthStore } from '@/controller/authStore'
import ReviewList from '../components/reviews/ReviewList.vue'
import ReviewSummary from '../components/reviews/ReviewSummary.vue'
import ReviewForm from '../components/reviews/ReviewForm.vue'
import { generateItinerary } from '../controller/itineraryController'
import ItineraryForm from '../components/itinerary/ItineraryForm.vue'
import ItineraryDay from '../components/itinerary/ItineraryDay.vue'
import { checkRouteSuitability } from '@/lib/matching'

const routeParams = useRoute()
const reviewsStore = useReviewsStore()
const auth = useAuthStore()
const route = ref(null)
const loading = ref(true)
const error = ref('')

const itinerary = ref(null)
const itineraryLoading = ref(false)
const itineraryError = ref('')

async function onGenerate(form) {
  itineraryLoading.value = true
  itineraryError.value = ''
  try {
    itinerary.value = await generateItinerary(route.value, form)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    itineraryError.value = `Unable to generate an itinerary: ${message}`
  } finally {
    itineraryLoading.value = false
  }
}

// Recomputed whenever the route or the signed-in user's profile changes.
const suitability = computed(() => {
  if (!route.value || !auth.profile) return null
  return checkRouteSuitability(auth.profile, route.value)
})

const verdictLabels = {
  comfortable: 'Comfortable — within what you have done before',
  good_challenge: 'Good challenge — a step up in one or two areas',
  stretch: 'A stretch — well beyond what you have done so far',
  unknown: 'Not enough information yet',
}

const verdictClasses = {
  comfortable: 'alert-success',
  good_challenge: 'alert-info',
  stretch: 'alert-warning',
  unknown: 'alert-secondary',
}

const ruleLabels = {
  difficulty: 'Difficulty',
  distance: 'Distance',
  elevation_gain: 'Elevation gain',
  altitude: 'Altitude',
  trip_type: 'Trip length',
}

const statusBadges = {
  pass: { text: 'Done before', class: 'bg-success' },
  fail: { text: 'New for you', class: 'bg-warning text-dark' },
  unknown: { text: 'Unknown', class: 'bg-secondary' },
}

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

function formatYesNo(value) {
  if (value == null) {
    return 'Not listed'
  }

  return value ? 'Yes' : 'No'
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

  if (route.value) {
    await Promise.all([
      reviewsStore.fetchForRoute(routeParams.params.id),
      reviewsStore.fetchCategories(),
    ])
  }
})

// After a review is saved or deleted, reload the route so its community
// stats (average rating, effective difficulty, hazard) show the new values.
async function reloadRoute() {
  try {
    route.value = await fetchRouteById(routeParams.params.id)
  } catch (err) {
    console.warn('Could not reload the route after a review change:', err)
  }
}
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
                <dd>{{ formatYesNo(route.is_multiday) }}</dd>
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

        <section class="col-12" aria-labelledby="route-match-title">
          <div class="route-detail-section">
            <h2 id="route-match-title" class="h4 mb-4">Is this route right for you?</h2>

            <p v-if="!auth.isLoggedIn" class="alert alert-secondary mb-0">
              <RouterLink :to="{ name: 'auth', query: { redirect: routeParams.fullPath } }">Sign in</RouterLink>
              to compare this route with your hiking experience.
            </p>

            <p v-else-if="!suitability" class="mb-0" role="status">Loading your profile...</p>

            <template v-else>
              <p class="alert mb-4" :class="verdictClasses[suitability.verdict]">
                <strong>{{ verdictLabels[suitability.verdict] }}</strong>
                <template v-if="suitability.verdict === 'unknown'">
                  — <RouterLink to="/quiz">update your hiking profile</RouterLink> to see how this route compares.
                </template>
              </p>

              <ul class="list-unstyled route-match-checks mb-0">
                <template v-for="check in suitability.checks" :key="check.rule">
                  <li v-if="check.status !== 'not_applicable'">
                    <span class="badge me-2" :class="statusBadges[check.status].class">
                      {{ statusBadges[check.status].text }}
                    </span>
                    <strong>{{ ruleLabels[check.rule] }}:</strong> {{ check.message }}
                  </li>
                </template>
              </ul>

              <p
                v-for="warning in suitability.warnings"
                :key="warning"
                class="alert alert-danger mt-4 mb-0"
                role="note"
              >
                {{ warning }}
              </p>

              <p class="small text-body-secondary mt-3 mb-0">
                Based on your quiz answers. Only you know your real fitness, so treat this as a guide.
              </p>
            </template>
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

        <section class="col-12" aria-labelledby="itinerary-title">
          <div class="route-detail-section">
            <h2 id="itinerary-title" class="h4 mb-2">Plan your itinerary</h2>
            <p class="mb-4">
              Choose when you're starting, how many days you have and your pace, and we'll suggest
              a day-by-day plan.
            </p>

            <ItineraryForm
              v-if="auth.isLoggedIn"
              :route="route"
              :loading="itineraryLoading"
              @generate="onGenerate"
            />
            <p v-else class="alert alert-secondary mb-0">
              <RouterLink :to="{ name: 'auth', query: { redirect: routeParams.fullPath } }">Sign in</RouterLink>
              to generate an itinerary.
            </p>

            <p v-if="itineraryError" class="alert alert-danger mt-4 mb-0" role="alert">
              {{ itineraryError }}
            </p>

            <template v-if="itinerary">
              <p v-if="itinerary.summary" class="lead mt-4">{{ itinerary.summary }}</p>

              <div class="row row-cols-1 row-cols-md-2 g-3 mt-1">
                <div v-for="day in itinerary.days" :key="day.day" class="col">
                  <ItineraryDay :day="day" />
                </div>
              </div>

              <template v-if="itinerary.tips && itinerary.tips.length">
                <h3 class="h5 mt-4">Tips</h3>
                <ul>
                  <li v-for="tip in itinerary.tips" :key="tip">{{ tip }}</li>
                </ul>
              </template>

              <p class="small text-body-secondary mt-3 mb-0">
                AI-generated. Check trail conditions, weather and permits before you hike.
              </p>
            </template>
          </div>
        </section>

        <section class="col-12" aria-labelledby="route-reviews-title">
          <div class="route-detail-section">
            <h2 id="route-reviews-title" class="h4 mb-4">Community reviews</h2>
            <ReviewSummary :route="route" />
            <ReviewForm
              v-if="auth.isLoggedIn"
              :route="route"
              :user-id="auth.user.id"
              @saved="reloadRoute"
              @deleted="reloadRoute"
            />
            <p v-else class="alert alert-secondary">
              <RouterLink :to="{ name: 'auth', query: { redirect: routeParams.fullPath } }">Sign in</RouterLink>
              to leave a review.
            </p>
            <p v-if="reviewsStore.loadError" role="alert">
              Unable to load reviews: {{ reviewsStore.loadError }}
            </p>
            <ReviewList v-else :reviews="reviewsStore.reviews" />
          </div>
        </section>
      </div>


      <section class="mb-4" aria-labelledby="gear-checklist-title">
        <h2 id="gear-checklist-title" class="h5">Gear checklist</h2>
        <p class="alert alert-secondary mb-0">
          The gear checklist is temporarily unavailable while its sign-in integration is being completed.
        </p>
      </section>
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

.route-match-checks li + li {
  margin-top: 0.75rem;
}
</style>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { checkRouteSuitability } from '@/lib/matching'

const props = defineProps({
  route: { type: Object, required: true },
  isLoggedIn: { type: Boolean, required: true },
  profile: { type: Object, default: null },
  signInTo: { type: Object, required: true },
})

// Recomputed whenever the route or the signed-in user's profile changes.
const suitability = computed(() => {
  if (!props.profile) return null
  return checkRouteSuitability(props.profile, props.route)
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
</script>

<template>
  <section class="route-suitability" aria-labelledby="route-match-title">
    <h2 id="route-match-title" class="h4 mb-4">Is this route right for you?</h2>

    <p v-if="!isLoggedIn" class="alert alert-secondary mb-0">
      <RouterLink :to="signInTo">Sign in</RouterLink>
      to compare this route with your hiking experience.
    </p>

    <p v-else-if="!suitability" class="mb-0" role="status">Loading your profile...</p>

    <template v-else>
      <p class="alert mb-4" :class="verdictClasses[suitability.verdict]">
        <strong>{{ verdictLabels[suitability.verdict] }}</strong>
        <template v-if="suitability.verdict === 'unknown'">
          — <RouterLink to="/quiz">update your hiking profile</RouterLink> to see how this route
          compares.
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
  </section>
</template>

<style scoped>
.route-suitability {
  border: 1px solid currentColor;
  border-radius: 0.75rem;
  padding: 1.5rem;
  background-color: #fbfaf7;
}

.route-match-checks li + li {
  margin-top: 0.75rem;
}
</style>

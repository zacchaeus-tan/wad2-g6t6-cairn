<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { motion } from 'motion-v'
import { checkRouteSuitability } from '@/lib/matching'

// The personal verdict on pine: one row per rule check, with a solid mark so
// pass and fail read at a glance. The checks themselves come from lib/matching.js.
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

// Rules that do not apply to this route get no row
const checks = computed(() =>
  suitability.value.checks.filter((check) => check.status !== 'not_applicable'),
)

const verdictLabels = {
  comfortable: 'Comfortable',
  good_challenge: 'Good challenge',
  stretch: 'A stretch',
  unknown: 'Not enough information yet',
}

const verdictDescriptions = {
  comfortable: 'Within what you have done before.',
  good_challenge: 'A step up in one or two areas.',
  stretch: 'Well beyond what you have done so far.',
}

// How many bars of the meter fill, and in which heat colour
const verdictMeter = {
  comfortable: { bars: 1, color: '#6fdc8c' },
  good_challenge: { bars: 2, color: '#f2d34f' },
  stretch: { bars: 3, color: '#ff9f43' },
  unknown: { bars: 0, color: '' },
}

const meter = computed(() => verdictMeter[suitability.value.verdict])

const ruleLabels = {
  difficulty: 'Difficulty',
  distance: 'Distance',
  elevation_gain: 'Elevation gain',
  altitude: 'Altitude',
  trip_type: 'Trip length',
}

const statusLabels = {
  pass: 'Within your experience',
  fail: 'New for you',
  unknown: 'Unknown',
}

// Drawn tick, cross and question mark for each mark
const statusIcons = {
  pass: 'm5 12 5 5 9-10',
  fail: 'M6 6l12 12M18 6 6 18',
  unknown: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.1',
}

const EASE = [0.16, 1, 0.3, 1]

// Filled bars grow up from the base one after another once the band is in view
function barVariants(bar) {
  return {
    hidden: { scaleY: 0 },
    shown: { scaleY: 1, transition: { duration: 0.5, ease: EASE, delay: 0.2 + bar * 0.12 } },
  }
}

// Rows arrive one at a time, 60ms apart, rising 12px with a fade
const listVariants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06 } },
}

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}
</script>

<template>
  <section class="fit-check" aria-labelledby="route-match-title">
    <div class="fit-check-top">
      <h2 id="route-match-title" class="cairn-headline">Is this route right for you?</h2>
      <p v-if="isLoggedIn && suitability" class="fit-check-verdict">
        <motion.span
          class="fit-check-meter"
          :style="{ '--heat': meter.color }"
          aria-hidden="true"
          initial="hidden"
          while-in-view="shown"
          :in-view-options="{ once: true }"
        >
          <i v-for="bar in 3" :key="bar">
            <motion.b v-if="bar <= meter.bars" :variants="barVariants(bar)" />
          </i>
        </motion.span>
        {{ verdictLabels[suitability.verdict] }}
      </p>
    </div>

    <p v-if="!isLoggedIn" class="fit-check-message">
      <RouterLink class="fit-check-link" :to="signInTo">Sign in</RouterLink>
      to compare this route with your hiking experience.
    </p>

    <p v-else-if="!suitability" class="fit-check-message" role="status">Loading your profile...</p>

    <template v-else>
      <p v-if="suitability.verdict === 'unknown'" class="fit-check-message">
        <RouterLink class="fit-check-link" to="/quiz">Update your hiking profile</RouterLink>
        to see how this route compares.
      </p>
      <p v-else class="fit-check-message">{{ verdictDescriptions[suitability.verdict] }}</p>

      <motion.ul
        class="fit-check-list"
        :variants="listVariants"
        initial="hidden"
        while-in-view="shown"
        :in-view-options="{ once: true, amount: 0.3 }"
      >
        <motion.li
          v-for="check in checks"
          :key="check.rule"
          :class="`is-${check.status}`"
          :variants="rowVariants"
        >
          <span class="fit-check-mark" role="img" :aria-label="statusLabels[check.status]">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="statusIcons[check.status]" /></svg>
          </span>
          <span><strong>{{ ruleLabels[check.rule] }}</strong> {{ check.message }}</span>
        </motion.li>
      </motion.ul>

      <p v-for="warning in suitability.warnings" :key="warning" class="fit-check-warning" role="note">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4.5M12 17.2v.1" /></svg>
        {{ warning }}
      </p>

      <p class="fit-check-note">
        Based on your quiz answers. Only you know your real fitness, so treat this as a guide.
      </p>
    </template>
  </section>
</template>

<style scoped>
.fit-check {
  display: grid;
  gap: 24px;
  padding: clamp(24px, 3vw, 44px);
  background: var(--pine);
  color: var(--paper);
  box-shadow: var(--shadow-stop);
}

.fit-check-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 16px 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgb(242 239 234 / 0.9);
}

.fit-check-verdict {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: clamp(22px, 2.2vw, 30px);
  font-weight: 900;
}

.fit-check-meter {
  display: inline-grid;
  grid-auto-flow: column;
  gap: 3px;
}

.fit-check-meter i {
  display: grid;
  width: 10px;
  height: 32px;
  background: rgb(242 239 234 / 0.25);
}

/* The heat fill grows from the bottom of its track */
.fit-check-meter b {
  background: var(--heat);
  transform-origin: bottom;
}

.fit-check-message {
  font-size: 17px;
  line-height: 26px;
  color: var(--lichen);
}

.fit-check-link {
  color: var(--white) !important;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.fit-check-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.fit-check-list li {
  display: grid;
  grid-template-columns: 32px 1fr;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid rgb(242 239 234 / 0.18);
  font-size: 18px;
  line-height: 26px;
}

.fit-check-list li strong {
  display: inline-block;
  min-width: 200px;
  margin-right: 8px;
  font-weight: 900;
}

/* Solid marks: paper box with a pine tick for pass, blaze box with a white cross for fail */
.fit-check-mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
}

.fit-check-mark svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke-width: 3.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.is-pass .fit-check-mark {
  background: var(--paper);
}

.is-pass .fit-check-mark svg {
  stroke: var(--pine);
}

.is-fail .fit-check-mark {
  background: var(--blaze);
  box-shadow: 0 0 0 3px var(--ember);
}

.is-fail .fit-check-mark svg {
  stroke: var(--white);
}

.is-unknown .fit-check-mark {
  border: 2px solid rgb(242 239 234 / 0.6);
}

.is-unknown .fit-check-mark svg {
  stroke: var(--paper);
  stroke-width: 2.4;
}

.fit-check-list li.is-fail {
  color: #ffd2bd;
}

.fit-check-list li.is-fail strong {
  color: var(--white);
}

.fit-check-warning {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #ffe7a8;
  font-size: 16px;
  line-height: 24px;
}

.fit-check-warning svg {
  width: 20px;
  height: 20px;
  flex: none;
  margin-top: 2px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.fit-check-note {
  color: var(--lichen);
  font-size: 14px;
}

@media (max-width: 700px) {
  .fit-check-list li {
    font-size: 16px;
  }

  .fit-check-list li strong {
    display: block;
    min-width: 0;
  }
}
</style>

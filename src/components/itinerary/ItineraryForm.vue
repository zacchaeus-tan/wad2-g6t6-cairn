<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import {
  LONG_ITINERARY_DAYS,
  PACES,
  maxDaysFor,
  todayString,
} from '@/controller/itineraryController'

const props = defineProps({
  route: Object,
  weather: { type: Object, default: null },
  weatherReady: { type: Boolean, default: true }, // is forecast request ready
  loading: Boolean,
})

const emit = defineEmits(['generate'])

const maxDays = computed(() => maxDaysFor(props.route))

const today = todayString()
const startDate = ref(today)
const days = ref(props.route.duration_days > 0 ? Math.min(props.route.duration_days, maxDays.value) : 1)
const pace = ref('moderate')

const isValid = computed(
  () =>
    startDate.value >= today &&
    Number.isInteger(days.value) &&
    days.value >= 1 &&
    days.value <= maxDays.value,
)

const isLong = computed(() => days.value > LONG_ITINERARY_DAYS)

// Text that steps forward while the plan is being written, then stays on the last step
const loadingMessages = computed(() => {
  const steps = ['Reading the route…']
  if (props.weather) steps.push('Checking the forecast…')
  steps.push('Planning your days…')
  return steps
})

const messageIndex = ref(0)
let messageTimer = null

watch(
  () => props.loading,
  (isLoading) => {
    clearInterval(messageTimer)
    messageIndex.value = 0
    if (isLoading) {
      messageTimer = setInterval(() => {
        messageIndex.value = Math.min(messageIndex.value + 1, loadingMessages.value.length - 1)
      }, 3500)
    }
  },
)

onBeforeUnmount(() => clearInterval(messageTimer))

const generateLabel = computed(() =>
  props.loading ? loadingMessages.value[messageIndex.value] : 'Generate plan',
)

function submit() {
  emit('generate', {
    startDate: startDate.value,
    days: days.value,
    pace: pace.value,
  })
}
</script>

<template>
  <form class="itinerary-form" @submit.prevent="submit">
    <label class="itinerary-field" for="itinerary-start">
      <span class="cairn-label">Start date</span>
      <input id="itinerary-start" v-model="startDate" type="date" class="cairn-input" :min="today" required />
    </label>

    <label class="itinerary-field" for="itinerary-days">
      <span class="cairn-label">Number of days</span>
      <input
        id="itinerary-days"
        v-model.number="days"
        type="number"
        class="cairn-input"
        min="1"
        :max="maxDays"
        required
      />
    </label>

    <div class="itinerary-field">
      <span id="itinerary-pace" class="cairn-label">Pace</span>
      <div class="itinerary-pace" role="group" aria-labelledby="itinerary-pace">
        <button
          v-for="p in PACES"
          :key="p"
          type="button"
          :aria-pressed="pace === p ? 'true' : 'false'"
          @click="pace = p"
        >
          {{ p.charAt(0).toUpperCase() + p.slice(1) }}
        </button>
      </div>
    </div>

    <button
      type="submit"
      class="cairn-btn is-blaze itinerary-generate"
      :class="{ 'is-loading': loading }"
      :disabled="!isValid || loading || !weatherReady"
      :aria-busy="loading"
    >
      <!-- Progress fill that creeps across while the plan is written -->
      <motion.span
        v-if="loading"
        class="itinerary-generate-fill"
        aria-hidden="true"
        :initial="{ width: '0%' }"
        :animate="{ width: '92%' }"
        :transition="{ duration: 18, ease: [0.1, 0.7, 0.2, 1] }"
      />

      <span class="itinerary-generate-label" aria-live="polite">
        <span v-if="loading" class="itinerary-generate-spinner" aria-hidden="true"></span>
        <AnimatePresence mode="wait" :initial="false">
          <motion.span
            :key="generateLabel"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -8 }"
            :transition="{ duration: 0.2 }"
          >
            {{ generateLabel }}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>

    <p class="itinerary-hint cairn-fine">
      <template v-if="route.duration_days">Usually {{ route.duration_days }} days · </template>
      up to {{ maxDays }} days
      <template v-if="isLong"> · longer itineraries can take up to a minute to generate</template>
    </p>
  </form>
</template>

<style scoped>
.itinerary-form {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr auto auto;
  align-items: end;
  gap: 16px 20px;
}

.itinerary-field {
  display: grid;
  gap: 8px;
}

.itinerary-field .cairn-label {
  color: var(--granite-700);
}

.itinerary-pace {
  display: inline-flex;
  width: max-content;
  border: 2px solid var(--ink);
}

.itinerary-pace button {
  min-height: 44px;
  padding: 0 14px;
  border: 0;
  background: var(--white);
  color: var(--ink);
  font: 700 13px var(--font);
  cursor: pointer;
}

.itinerary-pace button + button {
  border-left: 1px solid var(--ink);
}

.itinerary-pace button[aria-pressed='true'] {
  background: var(--ink);
  color: var(--ground);
}

.itinerary-pace button:focus-visible {
  outline: 3px solid var(--lake);
  outline-offset: 2px;
}

.itinerary-generate {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.itinerary-generate-label {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.itinerary-generate-fill {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 0;
  background: rgb(255 255 255 / 0.28);
}

/* Keep the button at full strength while it works, even though it is disabled */
.itinerary-generate.is-loading:disabled {
  opacity: 1;
  cursor: progress;
}

.itinerary-generate-spinner {
  flex: none;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: itinerary-spin 0.7s linear infinite;
}

@keyframes itinerary-spin {
  to {
    transform: rotate(360deg);
  }
}

.itinerary-hint {
  grid-column: 1 / -1;
}

@media (max-width: 900px) {
  .itinerary-form {
    grid-template-columns: 1fr 1fr;
  }

  .itinerary-form .cairn-btn {
    grid-column: 1 / -1;
  }
}
</style>

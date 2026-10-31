<script setup>
import { computed } from 'vue'
import { motion } from 'motion-v'

const props = defineProps({
  checkedCount: {
    type: Number,
    required: true,
  },
  totalCount: {
    type: Number,
    required: true,
  },
  progress: {
    type: Number,
    required: true,
  },
})

const isComplete = computed(() => props.totalCount > 0 && props.progress === 100)
</script>

<template>
  <div>
    <!-- Packing complete message -->
    <motion.div
      v-if="isComplete"
      class="gear-complete-banner"
      role="status"
      aria-live="polite"
      :initial="{ opacity: 0, y: 12, scale: 0.97 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{
        type: 'spring',
        stiffness: 300,
        damping: 22,
      }"
    >
      <span class="gear-complete-icon" aria-hidden="true"> ✓ </span>

      <div>
        <strong>Packing complete!</strong>
        <p>You’ve checked off every item. You're ready for the trail!</p>
      </div>
    </motion.div>

    <!-- Progress bar -->
    <div class="gear-progress-card">
      <div class="gear-progress-top">
        <div class="gear-progress-number">
          <strong>{{ checkedCount }}</strong>
          <span>/ {{ totalCount }} items packed</span>
        </div>

        <span class="gear-progress-percent"> {{ progress }}<small>%</small> </span>
      </div>

      <div
        class="gear-progress-track"
        role="progressbar"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`${progress}% of gear packed`"
      >
        <motion.div
          class="gear-progress-fill"
          :initial="{ width: '0%' }"
          :animate="{ width: `${progress}%` }"
          :transition="{
            duration: 0.65,
            ease: 'easeOut',
          }"
        />
      </div>

      <p class="gear-progress-note">
        {{
          isComplete
            ? 'Every item on your list is checked off.'
            : 'Check off each item as you get it ready.'
        }}
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Completion banner */
.gear-complete-banner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 22px 0 14px;
  padding: 19px 22px;
  border: 1px solid #b8d0bd;
  background: #e3eee5;
  color: #244a35;
}

.gear-complete-icon {
  display: grid;
  place-items: center;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--gear-pine, #1f5b43);
  color: white;
  font-size: 21px;
  font-weight: 900;
}

.gear-complete-banner strong {
  font-size: 16px;
  font-weight: 900;
}

.gear-complete-banner p {
  margin: 4px 0 0 !important;
  color: #617568;
  font-size: 12px;
}

/* Progress card */
.gear-progress-card {
  margin: 22px 0;
  padding: 22px 24px;
  border: 1px solid #d3dfd5;
  background: #e5ece5;
}

.gear-progress-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.gear-progress-number {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-top: 5px;
}

.gear-progress-number strong {
  font-size: 30px;
  font-weight: 900;
  letter-spacing: -0.06em;
}

.gear-progress-number span,
.gear-progress-note {
  color: #657169;
  font-size: 13px;
}

.gear-progress-percent {
  color: var(--gear-pine, #1f5b43);
  font-size: 28px;
  font-weight: 900;
}

.gear-progress-percent small {
  font-size: 14px;
}

.gear-progress-track {
  height: 7px;
  margin-top: 16px;
  overflow: hidden;
  background: #cbd8ce;
}

.gear-progress-fill {
  height: 100%;
  background: var(--gear-pine, #1f5b43);
}

.gear-progress-note {
  margin-top: 9px !important;
}

@media (max-width: 650px) {
  .gear-progress-card {
    padding: 17px;
  }

  .gear-complete-banner {
    padding: 16px;
  }
}
</style>

<script setup>
import { difficultyLabel } from '@/lib/format'
import DifficultyMark from '@/components/common/DifficultyMark.vue'
import WarningIcon from '@/components/common/WarningIcon.vue'

// The line under a review, on the route page and in the profile: how hard it felt, whether it was
// finished, what the slot adds (links to act on it), and any incidents.
defineProps({
  review: { type: Object, required: true },
})
</script>

<template>
  <div class="review-entry-meta d-flex flex-wrap align-items-center row-gap-2 column-gap-3 mt-2">
    <span class="d-inline-flex align-items-center gap-2">
      Felt {{ difficultyLabel(review.perceived_difficulty) }}
      <DifficultyMark :grade="review.perceived_difficulty" :show-label="false" />
    </span>
    <span :class="review.completed ? 'is-done' : 'is-turned'">
      {{ review.completed ? 'Completed' : 'Did not complete' }}
    </span>
    <slot />
    <div
      v-for="incident in review.review_incidents"
      :key="incident.id"
      class="review-entry-incident w-100 d-flex align-items-start gap-2"
    >
      <WarningIcon />
      <div>
        <strong>{{ incident.incident_categories.label }}</strong>
        <p>{{ incident.note }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-entry-meta {
  color: var(--granite-700);
  font-size: 13px;
}

.is-done {
  color: var(--pine);
  font-weight: 700;
}

.is-turned {
  color: var(--warning);
  font-weight: 700;
}

.review-entry-incident {
  padding: 6px 10px;
  background: var(--warning-mist);
  color: #5c3d00;
}

.review-entry-incident svg {
  width: 20px;
  height: 18px;
  flex: none;
  margin-top: 1px;
}

.review-entry-incident p {
  margin: 0;
}
</style>

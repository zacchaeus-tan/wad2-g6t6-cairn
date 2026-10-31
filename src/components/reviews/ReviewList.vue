<script setup>
import { ref } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { difficultyLabel, formatDate } from '@/lib/format'
import { REVIEWS_PAGE_SIZE } from '@/controller/reviewsStore'
import DifficultyMark from '@/components/common/DifficultyMark.vue'
import StarIcon from '@/components/common/StarIcon.vue'
import WarningIcon from '@/components/common/WarningIcon.vue'

// no need to declare a variable as it is only used in the template
const props = defineProps({
  reviews: { type: Array, required: true },
  userId: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
})

const emit = defineEmits(['edit', 'delete'])

// Deleting can't be undone, so it takes a second click
const confirmingId = ref(null)

function isOwn(review) {
  return Boolean(props.userId) && review.user_id === props.userId
}

function confirmDelete(review) {
  confirmingId.value = null
  emit('delete', review)
}

// display_name can be empty, so fall back to a generic name
function nameOf(review) {
  return review.profiles?.display_name || 'Hiker'
}
</script>

<template>
  <p v-if="!reviews.length" class="review-list-empty">No reviews yet.</p>

  <AnimatePresence v-else as="div" class="review-list">
    <motion.article
      v-for="(review, index) in reviews"
      :key="review.id"
      class="review-entry"
      :initial="{ opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }"
      :exit="{ opacity: 0 }"
      :transition="{
        duration: 0.45,
        delay: (index % REVIEWS_PAGE_SIZE) * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }"
    >
      <span class="review-entry-who">
        {{ nameOf(review).charAt(0).toUpperCase() }}
      </span>
      <div>
        <div class="review-entry-top">
          <strong>
            {{ nameOf(review) }}
            <span class="review-entry-stars">
              <StarIcon v-for="n in 5" :key="n" :fill="n <= review.rating ? 1 : 0" />
            </span>
          </strong>
          <time :datetime="review.created_at">{{ formatDate(review.created_at) }}</time>
        </div>

        <p v-if="review.review_text" class="review-entry-text">{{ review.review_text }}</p>

        <div class="review-entry-meta">
          <span class="review-entry-felt">
            Felt {{ difficultyLabel(review.perceived_difficulty) }}
            <DifficultyMark :grade="review.perceived_difficulty" :show-label="false" />
          </span>
          <span :class="review.completed ? 'is-done' : 'is-turned'">
            {{ review.completed ? 'Completed' : 'Did not complete' }}
          </span>
          <span v-if="isOwn(review) || isAdmin" class="review-entry-actions">
            <template v-if="confirmingId === review.id">
              <button type="button" class="cairn-link is-danger" @click="confirmDelete(review)">
                Confirm delete
              </button>
              <button type="button" class="cairn-link" @click="confirmingId = null">Cancel</button>
            </template>
            <template v-else>
              <button v-if="isOwn(review)" type="button" class="cairn-link" @click="emit('edit')">
                Edit
              </button>
              <button type="button" class="cairn-link" @click="confirmingId = review.id">
                Delete
              </button>
            </template>
          </span>
          <div
            v-for="incident in review.review_incidents"
            :key="incident.id"
            class="review-entry-incident"
          >
            <WarningIcon />
            <div>
              <strong>{{ incident.incident_categories.label }}</strong>
              <p>{{ incident.note }}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  </AnimatePresence>
</template>

<style scoped>
.review-list-empty {
  padding: 20px 0;
  border-top: 2px solid var(--ink);
  color: var(--granite-700);
}

.review-list {
  display: grid;
  border-top: 2px solid var(--ink);
}

.review-entry {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid var(--granite-200);
}

.review-entry-who {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  background: var(--pine);
  color: var(--paper);
  font-size: 17px;
  font-weight: 900;
}

.review-entry-actions {
  display: inline-flex;
  gap: 14px;
  font-size: 14px;
}

.review-entry-actions .is-danger {
  color: var(--blaze-deep);
}

.review-entry-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
}

.review-entry-top strong {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.review-entry-top time {
  color: var(--granite-500);
  font-size: 13px;
}

.review-entry-stars {
  --star-off: var(--granite-300);
  display: inline-flex;
  gap: 2px;
}

.review-entry-stars svg {
  width: 15px;
  height: 15px;
}

.review-entry-text {
  margin: 8px 0 10px !important;
  font-size: 17px;
  line-height: 26px;
}

.review-entry-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 8px;
  color: var(--granite-700);
  font-size: 13px;
}

.review-entry-felt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
  flex-basis: 100%;
  display: flex;
  align-items: flex-start;
  gap: 8px;
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

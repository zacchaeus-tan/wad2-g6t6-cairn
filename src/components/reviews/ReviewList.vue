<script setup>
import { AnimatePresence, motion } from 'motion-v'
import { formatDate } from '@/lib/format'
import { REVIEWS_PAGE_SIZE } from '@/controller/reviewsStore'
import StarIcon from '@/components/common/StarIcon.vue'
import TrashButton from '@/components/common/TrashButton.vue'
import ReviewEntryMeta from './ReviewEntryMeta.vue'

// Your own review is edited and deleted from the "Edit your review" button above the list.
// Admins can delete anyone's review from here, but not edit it.
defineProps({
  reviews: { type: Array, required: true },
  isAdmin: { type: Boolean, default: false },
})

const emit = defineEmits(['delete'])

// display_name can be empty, so fall back to a generic name
function nameOf(review) {
  return review.profiles?.display_name || 'Hiker'
}
</script>

<template>
  <p v-if="!reviews.length" class="review-list-empty">No reviews yet.</p>

  <AnimatePresence v-else as="div" class="review-list d-grid">
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
        <div
          class="review-entry-top d-flex flex-wrap justify-content-between align-items-baseline gap-3"
        >
          <strong class="d-inline-flex align-items-center gap-2">
            {{ nameOf(review) }}
            <span class="review-entry-stars">
              <StarIcon v-for="n in 5" :key="n" :fill="n <= review.rating ? 1 : 0" />
            </span>
          </strong>
          <span class="d-inline-flex align-items-center gap-2">
            <time :datetime="review.created_at">{{ formatDate(review.created_at) }}</time>
            <TrashButton
              v-if="isAdmin"
              :label="`Delete ${nameOf(review)}'s review`"
              @click="emit('delete', review)"
            />
          </span>
        </div>

        <p v-if="review.review_text" class="review-entry-text mt-2 mb-2">
          {{ review.review_text }}
        </p>

        <ReviewEntryMeta :review="review" />
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
  border-top: 2px solid var(--ink);
}

.review-entry {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid #c9d0cb;
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

.review-entry-top strong {
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
  font-size: 17px;
  line-height: 26px;
}
</style>

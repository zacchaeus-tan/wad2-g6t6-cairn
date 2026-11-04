<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { AnimatePresence, motion } from 'motion-v'
import { useReviewsStore } from '@/controller/reviewsStore'
import NumberTicker from '@/components/common/NumberTicker.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ReviewForm from './ReviewForm.vue'
import ReviewList from './ReviewList.vue'

// The reviews section: a summary that stays put while the entries stack beside it.
const props = defineProps({
  route: { type: Object, required: true },
  userId: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
  signInTo: { type: Object, required: true },
})

const emit = defineEmits(['saved', 'deleted'])

const reviewsStore = useReviewsStore()
const formOpen = ref(false)

const hasOwnReview = computed(() => Boolean(reviewsStore.myReview(props.userId)))

// One row per star rating, 5 first; share is that rating's slice of all reviews (0 to 1)
const starRows = computed(() =>
  [5, 4, 3, 2, 1].map((stars) => {
    const count = props.route.rating_counts?.[stars] ?? 0
    return { stars, count, share: count / (props.route.review_count || 1) }
  }),
)

// The averages are empty until a route has its first review
function formatPercent(rate) {
  return rate == null ? '—' : `${Math.round(rate * 100)}%`
}

function onSaved() {
  formOpen.value = false
  emit('saved')
}

function onDeleted() {
  formOpen.value = false
  emit('deleted')
}

// An admin deleting someone's review from the list; it asks first
const reviewToDelete = ref(null)
const deleting = ref(false)

async function deleteFromList() {
  deleting.value = true
  const deleted = await reviewsStore.remove(reviewToDelete.value.id, props.route.id)
  deleting.value = false
  reviewToDelete.value = null
  if (deleted) onDeleted()
}
</script>

<template>
  <article class="register">
    <div class="register-head">
      <h2 class="cairn-headline">Trail register</h2>
      <button v-if="userId" type="button" class="cairn-btn is-small" @click="formOpen = !formOpen">
        {{ formOpen ? 'Close' : hasOwnReview ? 'Edit your review' : 'Write a review' }}
      </button>
      <p v-else class="cairn-fine">
        <RouterLink :to="signInTo">Sign in</RouterLink>
        to leave a review.
      </p>
    </div>

    <!-- The form grows open under the button and shrinks away before it is removed -->
    <AnimatePresence>
      <motion.div
        v-if="userId && formOpen"
        class="register-form"
        :initial="{ height: 0 }"
        :animate="{ height: 'auto' }"
        :exit="{ height: 0 }"
        :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
      >
        <ReviewForm :route="route" :user-id="userId" @saved="onSaved" @deleted="onDeleted" />
      </motion.div>
    </AnimatePresence>

    <div class="register-body">
      <aside class="register-summary">
        <p class="register-score cairn-data">
          <template v-if="route.avg_rating != null">
            <NumberTicker :value="route.avg_rating" :decimals="1" /><span
              class="register-score-out"
            >
              / 5</span
            >
          </template>
          <span v-else class="register-score-empty">No ratings yet</span>
        </p>

        <!-- Placeholder: the star breakdown needs counts stored on the route (a later task) -->
        <div class="register-stars">
          <div v-for="row in starRows" :key="row.stars" class="register-stars-row cairn-data">
            <span>{{ row.stars }}</span>
            <span class="register-stars-bar">
              <motion.span
                class="register-stars-fill"
                :initial="{ scaleX: 0 }"
                :animate="{ scaleX: row.share }"
                :transition="{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }"
                :style="{ originX: 0 }"
              />
            </span>
            <span>{{ row.count }}</span>
          </div>
        </div>

        <dl class="register-facts">
          <div>
            <dt class="cairn-label">Completed</dt>
            <dd class="cairn-data">{{ formatPercent(route.completion_rate) }}</dd>
          </div>
          <div>
            <dt class="cairn-label">Reviews</dt>
            <dd class="cairn-data">{{ route.review_count }}</dd>
          </div>
        </dl>
      </aside>

      <div>
        <p v-if="reviewsStore.loadError">Unable to load reviews: {{ reviewsStore.loadError }}</p>
        <template v-else>
          <p v-if="reviewsStore.error && !formOpen" class="register-error" role="alert">
            {{ reviewsStore.error }}
          </p>
          <ReviewList
            :reviews="reviewsStore.reviews"
            :is-admin="isAdmin"
            @delete="reviewToDelete = $event"
          />
          <div v-if="reviewsStore.hasMore" class="register-more">
            <button
              type="button"
              class="cairn-btn is-ghost is-small"
              :disabled="reviewsStore.loadingMore"
              @click="reviewsStore.loadMore(route.id)"
            >
              {{ reviewsStore.loadingMore ? 'Loading...' : 'Show more' }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <ConfirmDialog
      :open="Boolean(reviewToDelete)"
      title="Delete this review?"
      confirm-label="Delete review"
      :disabled="deleting"
      @confirm="deleteFromList"
      @cancel="reviewToDelete = null"
    >
      {{ reviewToDelete?.profiles?.display_name || 'This hiker' }}'s rating, review and any
      incidents they flagged will be removed from this route. You can't undo this.
    </ConfirmDialog>
  </article>
</template>

<style scoped>
.register {
  display: grid;
  gap: 28px;
}

.register-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.register-form {
  overflow: hidden;
}

.register-body {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  align-items: start;
  gap: 36px;
}

.register-summary {
  position: sticky;
  top: 80px;
  display: grid;
  gap: 18px;
}

.register-score {
  font-size: 84px;
  font-weight: 600;
  line-height: 0.85;
  letter-spacing: -0.04em;
}

.register-score-out {
  color: var(--granite-500);
  font-size: 0.32em;
  letter-spacing: 0;
}

.register-score .register-score-empty {
  color: var(--granite-700);
  font: 900 22px var(--font);
  letter-spacing: 0;
}

.register-stars {
  display: grid;
  gap: 6px;
}

.register-stars-row {
  display: grid;
  grid-template-columns: 22px 1fr 24px;
  align-items: center;
  gap: 8px;
  color: var(--granite-700);
  font-size: 13px;
  font-weight: 600;
}

.register-stars-bar {
  height: 8px;
  background-color: #c9d0cb;
}

.register-stars-fill {
  display: block;
  height: 100%;
  background: var(--blaze);
}

.register-facts {
  display: grid;
  grid-template-columns: repeat(2, auto);
  justify-content: start;
  gap: 12px 24px;
  margin: 0;
  padding-top: 14px;
  border-top: 1px solid #c9d0cb;
}

.register-facts dd {
  margin: 4px 0 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.1;
}

.register-error {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #fdecea;
  color: #b42318;
  font-size: 14px;
}

.register-more {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}

@media (max-width: 900px) {
  .register-body {
    grid-template-columns: 1fr;
  }

  .register-summary {
    position: static;
  }
}
</style>

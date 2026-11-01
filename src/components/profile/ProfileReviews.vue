<script setup>
import { nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { AnimatePresence, motion } from 'motion-v'
import { useMyReviewsStore } from '@/controller/myReviewsStore'
import { REVIEWS_PAGE_SIZE } from '@/controller/reviewsStore'
import { formatDate } from '@/lib/format'
import { useRowArrivals } from '@/lib/useRowArrivals'
import NoticeBox from '@/components/common/NoticeBox.vue'
import StarIcon from '@/components/common/StarIcon.vue'
import ReviewEntryMeta from '@/components/reviews/ReviewEntryMeta.vue'
import ProfileLoadError from './ProfileLoadError.vue'
import ProfileSkeleton from './ProfileSkeleton.vue'

const myReviewsStore = useMyReviewsStore()
const rowMotion = useRowArrivals()

const titleId = (review) => `my-review-${review.id}`

async function showMore() {
  const firstNew = myReviewsStore.reviews.length
  await myReviewsStore.loadMore()
  // The button has gone with the last page, so keyboard focus moves on to the new entries
  if (myReviewsStore.hasMore || myReviewsStore.error) return
  await nextTick()
  document.getElementById(titleId(myReviewsStore.reviews[firstNew]))?.focus()
}

function retry() {
  return myReviewsStore.reviews.length ? myReviewsStore.loadMore() : myReviewsStore.loadFirst()
}
</script>

<template>
  <section class="my-reviews" aria-labelledby="my-reviews-title">
    <h2 id="my-reviews-title" class="cairn-headline">My reviews</h2>

    <ProfileSkeleton v-if="myReviewsStore.loading">Loading your reviews...</ProfileSkeleton>

    <NoticeBox v-else-if="!myReviewsStore.error && !myReviewsStore.reviews.length" type="empty">
      You haven't reviewed any routes yet.
      <RouterLink class="cairn-link" to="/routes">Find a route</RouterLink>
    </NoticeBox>

    <AnimatePresence v-if="myReviewsStore.reviews.length" as="ul" class="my-reviews-list">
      <motion.li
        v-for="(review, index) in myReviewsStore.reviews"
        :key="review.id"
        v-bind="rowMotion('review-' + review.id, index % REVIEWS_PAGE_SIZE)"
        class="my-review"
      >
        <div class="my-review-top">
          <div class="my-review-route">
            <h3>
              <RouterLink :id="titleId(review)" :to="'/routes/' + review.route_id">
                {{ review.routes?.name ?? 'This route' }}
              </RouterLink>
            </h3>
            <p v-if="review.routes?.country" class="cairn-label">{{ review.routes.country }}</p>
          </div>
          <div class="my-review-when">
            <span
              class="my-review-stars"
              role="img"
              :aria-label="`Rated ${review.rating} out of 5`"
            >
              <StarIcon v-for="n in 5" :key="n" :fill="n <= review.rating ? 1 : 0" />
            </span>
            <time :datetime="review.created_at">{{ formatDate(review.created_at) }}</time>
          </div>
        </div>

        <p v-if="review.review_text" class="my-review-text">{{ review.review_text }}</p>

        <ReviewEntryMeta :review="review">
          <RouterLink
            class="cairn-link my-review-edit"
            :to="{ path: '/routes/' + review.route_id, hash: '#reviews' }"
          >
            Edit review
            <span class="cairn-visually-hidden">of {{ review.routes?.name ?? 'this route' }}</span>
          </RouterLink>
        </ReviewEntryMeta>
      </motion.li>
    </AnimatePresence>

    <ProfileLoadError v-if="myReviewsStore.error" @retry="retry">
      {{ myReviewsStore.error }}
    </ProfileLoadError>

    <div v-if="myReviewsStore.reviews.length" class="my-reviews-more">
      <p class="cairn-fine" aria-live="polite">
        Showing <span class="cairn-data">{{ myReviewsStore.reviews.length }}</span> of
        <span class="cairn-data">{{ myReviewsStore.total }}</span>
      </p>
      <button
        v-if="myReviewsStore.hasMore && !myReviewsStore.error"
        type="button"
        class="cairn-btn is-ghost is-small"
        :disabled="myReviewsStore.loadingMore"
        @click="showMore"
      >
        {{ myReviewsStore.loadingMore ? 'Loading...' : 'Show more' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.my-reviews {
  display: grid;
  gap: 24px;
}

.my-reviews-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 2px solid var(--ink);
  border-bottom: 2px solid var(--ink);
}

.my-review {
  padding: 20px 0;
}

.my-review + .my-review {
  border-top: 1px solid var(--granite-200);
}

.my-review-top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px 24px;
}

.my-review-route {
  display: grid;
  flex: 1 1 14rem;
  gap: 4px;
  min-width: 0;
}

.my-review-route h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  line-height: 24px;
  overflow-wrap: anywhere;
}

.my-review-route a {
  color: inherit;
}

.my-review-route a:focus-visible,
.my-review-edit:focus-visible {
  outline: 3px solid var(--lake);
  outline-offset: 2px;
}

.my-review-when {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--granite-500);
  font-size: 13px;
}

.my-review-stars {
  --star-off: var(--granite-300);
  display: inline-flex;
  gap: 2px;
}

.my-review-stars svg {
  width: 15px;
  height: 15px;
}

.my-review-text {
  margin: 8px 0 10px;
  font-size: 17px;
  line-height: 26px;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.my-reviews-more {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px 16px;
}
</style>

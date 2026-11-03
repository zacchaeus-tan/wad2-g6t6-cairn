<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { AnimatePresence, motion } from 'motion-v'
import { useAdminStore } from '@/controller/adminStore'
import { formatDate } from '@/lib/format'
import { rowMotion } from '@/lib/motion'
import AdminNote from '@/components/admin/AdminNote.vue'
import DifficultyMark from '@/components/common/DifficultyMark.vue'
import StarIcon from '@/components/common/StarIcon.vue'

const adminStore = useAdminStore()
const confirmingId = ref(null) // removing can't be undone, so it takes a second click
const removing = ref(false)
const removed = ref(false)

const nameOf = (review) => review.profiles?.display_name || 'Unknown hiker'

function askToRemove(review) {
  confirmingId.value = review.id
  removed.value = false
}

async function remove(review) {
  removing.value = true
  removed.value = await adminStore.removeReview(review)
  removing.value = false
  confirmingId.value = null
}
</script>

<template>
  <div>
    <AdminNote v-if="removed" class="mt-0 mb-3">
      Review removed, and the route's stats were updated.
    </AdminNote>

    <p v-if="!adminStore.recentReviews.length" class="admin-empty">No reviews yet.</p>

    <!-- Laid out like the trail register on a route page. Starts shown, as the tab
         may be hidden on load (see AttentionGroup). -->
    <AnimatePresence v-else :initial="false" as="ul" class="admin-list">
      <motion.li
        v-for="review in adminStore.recentReviews"
        :key="review.id"
        v-bind="rowMotion"
        layout="position"
        class="admin-item has-mark"
        :class="{ 'is-confirming': confirmingId === review.id }"
      >
        <span class="admin-mark is-avatar">{{ nameOf(review).charAt(0).toUpperCase() }}</span>
        <div class="admin-item-body">
          <p class="admin-review-top">
            <strong>{{ nameOf(review) }}</strong>
            <span class="admin-review-stars" :aria-label="`${review.rating} out of 5`">
              <StarIcon v-for="n in 5" :key="n" :fill="n <= review.rating ? 1 : 0" />
            </span>
            <time :datetime="review.created_at">{{ formatDate(review.created_at) }}</time>
          </p>
          <p class="cairn-fine">
            on
            <RouterLink :to="{ name: 'route-detail', params: { id: review.route_id } }">{{
              review.routes?.name || 'a route'
            }}</RouterLink>
            <template v-if="review.perceived_difficulty">
              · felt <DifficultyMark :grade="review.perceived_difficulty" />
            </template>
            · {{ review.completed ? 'finished' : 'did not finish' }}
          </p>
          <p v-if="review.review_text" class="admin-review-text">{{ review.review_text }}</p>
          <p v-for="incident in review.review_incidents" :key="incident.id" class="cairn-fine">
            <span class="admin-tag is-caution">Incident</span>
            {{ incident.incident_categories?.label
            }}<template v-if="incident.note">: “{{ incident.note }}”</template>
          </p>
        </div>
        <div class="admin-actions">
          <template v-if="confirmingId === review.id">
            <button
              type="button"
              class="cairn-btn is-blaze is-small"
              :disabled="removing"
              @click="remove(review)"
            >
              {{ removing ? 'Removing…' : 'Confirm remove' }}
            </button>
            <button type="button" class="cairn-link" @click="confirmingId = null">Cancel</button>
          </template>
          <button v-else type="button" class="cairn-link is-danger" @click="askToRemove(review)">
            Remove
          </button>
        </div>
      </motion.li>
    </AnimatePresence>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAdminStore } from '@/controller/adminStore'
import { difficultyLabel, formatDate } from '@/lib/format'

const adminStore = useAdminStore()
const confirmingId = ref(null) // removing can't be undone, so it takes a second click
const removingId = ref(null)
const removed = ref(false)

function askToRemove(review) {
  confirmingId.value = review.id
  removed.value = false
}

async function remove(review) {
  removingId.value = review.id
  removed.value = await adminStore.removeReview(review)
  removingId.value = null
  confirmingId.value = null
}
</script>

<template>
  <div>
    <p v-if="removed" class="admin-note mt-0 mb-3" role="status">
      Review removed, and the route's stats were updated.
    </p>

    <p v-if="!adminStore.recentReviews.length" class="admin-empty">No reviews yet.</p>

    <template v-else>
      <p class="admin-hint mb-2">
        Newest first. Remove fake or abusive reviews so they stop affecting a route's grade and
        hazard level.
      </p>
      <ul class="admin-list">
        <li v-for="review in adminStore.recentReviews" :key="review.id" class="admin-item">
          <div class="admin-item-body">
            <p>
              <strong>{{ review.profiles?.display_name || 'Unknown hiker' }}</strong>
              on
              <RouterLink :to="{ name: 'route-detail', params: { id: review.route_id } }">{{
                review.routes?.name || 'a route'
              }}</RouterLink>
            </p>
            <p class="cairn-fine">
              {{ review.rating }} / 5
              <template v-if="review.perceived_difficulty">
                · felt {{ difficultyLabel(review.perceived_difficulty) }}
              </template>
              · {{ review.completed ? 'finished' : 'did not finish' }} ·
              {{ formatDate(review.created_at) }}
            </p>
            <p v-if="review.review_text">{{ review.review_text }}</p>
            <p v-for="incident in review.review_incidents" :key="incident.id" class="cairn-fine">
              <span class="admin-tag">Incident</span>
              {{ incident.incident_categories?.label
              }}<template v-if="incident.note">: “{{ incident.note }}”</template>
            </p>
          </div>
          <div class="admin-actions">
            <template v-if="confirmingId === review.id">
              <button
                type="button"
                class="cairn-btn is-blaze is-small"
                :disabled="removingId === review.id"
                @click="remove(review)"
              >
                {{ removingId === review.id ? 'Removing…' : 'Confirm remove' }}
              </button>
              <button type="button" class="cairn-link" @click="confirmingId = null">Cancel</button>
            </template>
            <button v-else type="button" class="cairn-link" @click="askToRemove(review)">
              Remove
            </button>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

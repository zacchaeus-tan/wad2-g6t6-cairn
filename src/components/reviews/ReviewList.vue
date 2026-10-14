<script setup>
import { difficultyLabel, formatDate } from '@/lib/format'

// no need to declare a variable as it is only used in the template
defineProps({
  reviews: { type: Array, required: true },
})
</script>

<template>
  <p v-if="!reviews.length">No reviews yet.</p>

  <article v-for="review in reviews" :key="review.id">
    <p>
      <strong>{{ review.profiles?.display_name || 'Hiker' }}</strong>
      {{ '★'.repeat(review.rating) }}{{ '☆'.repeat(5 - review.rating) }}
    </p>
    <p>
      {{ formatDate(review.created_at) }} · Felt
      {{ difficultyLabel(review.perceived_difficulty) }} ·
      {{ review.completed ? 'Completed' : 'Did not complete' }}
    </p>
    <p>{{ review.review_text }}</p>
    <ul v-if="review.review_incidents.length">
      <li v-for="incident in review.review_incidents" :key="incident.id">
        <strong>{{ incident.category }}</strong> — {{ incident.note }}
      </li>
    </ul>
  </article>
</template>

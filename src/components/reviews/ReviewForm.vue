<script setup>
import { ref, computed, watch } from 'vue'
import { useReviewsStore } from '@/controller/reviewsStore'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import TrashButton from '@/components/common/TrashButton.vue'
import IncidentFields from './IncidentFields.vue'

const props = defineProps({
  route: { type: Object, required: true },
  userId: { type: String, required: true },
})

const emit = defineEmits(['saved', 'deleted'])

const reviewsStore = useReviewsStore()
const saving = ref(false)

// null means "not chosen yet", so the dropdowns start on their placeholder.
const form = ref({
  rating: null,
  perceivedDifficulty: null,
  completed: null,
  reviewText: '',
  incidents: [],
})

const myReview = computed(() => reviewsStore.myReview(props.userId))

function resetForm() {
  if (myReview.value) {
    form.value = {
      rating: myReview.value.rating,
      perceivedDifficulty: myReview.value.perceived_difficulty,
      completed: myReview.value.completed,
      reviewText: myReview.value.review_text || '',
      incidents: (myReview.value.review_incidents || []).map((i) => ({
        category: i.category,
        note: i.note,
      })),
    }
  } else {
    form.value = {
      rating: null,
      perceivedDifficulty: null,
      completed: null,
      reviewText: '',
      incidents: [],
    }
  }
}

watch(myReview, resetForm, { immediate: true })

function addIncident() {
  form.value.incidents.push({ category: '', note: '' })
}

async function submitReview() {
  saving.value = true

  const submitted = await reviewsStore.save({
    routeId: props.route.id,
    userId: props.userId,
    rating: form.value.rating,
    perceivedDifficulty: form.value.perceivedDifficulty,
    completed: form.value.completed,
    reviewText: form.value.reviewText,
    incidents: form.value.incidents,
  })

  saving.value = false
  if (submitted) emit('saved')
}

// Deleting can't be undone, so it asks first
const confirmingDelete = ref(false)
const deleting = ref(false)

async function deleteReview() {
  deleting.value = true
  const deleted = await reviewsStore.remove(myReview.value.id, props.route.id)
  deleting.value = false
  confirmingDelete.value = false
  if (deleted) emit('deleted')
}
</script>

<template>
  <form class="review-form d-grid gap-3 p-4" @submit.prevent="submitReview">
    <h3 class="review-form-title">{{ myReview ? 'Edit your review' : 'Write a review' }}</h3>

    <!-- Bootstrap grid: 3 across from md (768px) up, stacked on phones -->
    <div class="row row-cols-1 row-cols-md-3 g-3">
      <label class="review-form-field d-grid gap-2">
        <span class="cairn-label">Quality (1–5)</span>
        <select v-model.number="form.rating" class="cairn-input">
          <option :value="null" disabled>Select rating</option>
          <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>

      <label class="review-form-field d-grid gap-2">
        <span class="cairn-label">How hard did it feel?</span>
        <select v-model.number="form.perceivedDifficulty" class="cairn-input">
          <option :value="null" disabled>Select difficulty</option>
          <option :value="1">Easy</option>
          <option :value="2">Moderate</option>
          <option :value="3">Hard</option>
          <option :value="4">Strenuous</option>
        </select>
      </label>

      <label class="review-form-field d-grid gap-2">
        <span class="cairn-label">Did you finish?</span>
        <select v-model="form.completed" class="cairn-input">
          <option :value="null" disabled>Select an answer</option>
          <option :value="true">Completed</option>
          <option :value="false">Did not complete</option>
        </select>
      </label>
    </div>

    <label class="review-form-field d-grid gap-2">
      <span class="cairn-label">Your review</span>
      <textarea
        v-model="form.reviewText"
        class="cairn-input review-form-text"
        rows="3"
        placeholder="How was it?"
      ></textarea>
    </label>

    <IncidentFields
      v-for="(incident, index) in form.incidents"
      :key="index"
      v-model="form.incidents[index]"
      :categories="reviewsStore.categories"
      @remove="form.incidents.splice(index, 1)"
    />

    <div class="d-flex flex-wrap align-items-center gap-2">
      <button type="button" class="cairn-btn is-ghost is-small" @click="addIncident">
        Flag an incident
      </button>
      <button :disabled="saving" type="submit" class="cairn-btn is-small">
        {{ myReview ? 'Update review' : 'Submit review' }}
      </button>
      <TrashButton
        v-if="myReview"
        class="ms-auto"
        label="Delete your review"
        @click="confirmingDelete = true"
      />
    </div>

    <p v-if="reviewsStore.error" class="review-form-error">
      {{ reviewsStore.error }}
    </p>

    <ConfirmDialog
      :open="confirmingDelete"
      title="Delete your review?"
      confirm-label="Delete review"
      :disabled="deleting"
      @confirm="deleteReview"
      @cancel="confirmingDelete = false"
    >
      Your rating, review and any incidents you flagged will be removed from this route. You can't
      undo this.
    </ConfirmDialog>
  </form>
</template>

<style scoped>
.review-form {
  border: 2px solid var(--ink);
  background: var(--white);
}

.review-form-title {
  font-size: 18px;
  font-weight: 900;
}

.review-form-field .cairn-label {
  color: var(--granite-700);
}

.review-form-text {
  min-height: 96px;
  padding: 10px 12px;
  resize: vertical;
}

.review-form-error {
  padding: 10px 12px;
  background: #fdecea;
  color: #b42318;
  font-size: 14px;
}
</style>

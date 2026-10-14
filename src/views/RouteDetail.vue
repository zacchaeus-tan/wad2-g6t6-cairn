<script setup>
import { onMounted, ref, computed, watch, onBeforeUnmount } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { fetchRouteById } from '../controller/routesController'
import { useChecklistStore } from '@/stores/checklist'
import { useAuthStore } from '@/stores/auth'
import ChecklistForm from '@/components/checklist/ChecklistItemForm.vue'

const routeParams = useRoute()
const route = ref(null)
const loading = ref(true)
const error = ref('')

const difficultyLabels = {
  1: 'Easy',
  2: 'Moderate',
  3: 'Hard',
  4: 'Strenuous',
}

function formatValue(value, unit = '') {
  if (value == null || value === '') {
    return 'Not listed'
  }

  return `${value}${unit}`
}

function formatDifficulty(value) {
  if (value == null || value === '') {
    return 'Not rated'
  }

  return difficultyLabels[value] ?? value
}

function formatBoolean(value) {
  if (value == null) {
    return 'Not listed'
  }

  return value ? 'Required' : 'Not required'
}

function formatDuration(value) {
  if (value == null || value === '') {
    return 'Not listed'
  }

  return `${value} ${Number(value) === 1 ? 'day' : 'days'}`
}

function formatCompletionRate(value) {
  if (value == null || value === '') {
    return 'Not listed'
  }

  const rate = Number(value)
  return Number.isFinite(rate)
    ? `${(rate * 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}%`
    : value
}

onMounted(async () => {
  try {
    route.value = await fetchRouteById(routeParams.params.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error.value = `Unable to load this route: ${message}`
  } finally {
    loading.value = false
  }
})

const checklistStore = useChecklistStore()
const auth = useAuthStore()

// for checklists
watch( () => [route.value?.id, auth.isLoggedIn],
  ([routeId, loggedIn]) => {
    if (routeId && loggedIn) checklistStore.loadForRoute(routeId)
    else checklistStore.reset()
  },
  { immediate: true },
)

// clear shared store when leaving, so another route never shows this checklist
onBeforeUnmount(() => checklistStore.reset())

async function generateChecklist() {
  if (checklistStore.items.length &&
      !confirm('Generating a new checklist will delete the current one and replace it. Continue?'))
  {return}
  await checklistStore.generate(route.value, weather.value, auth.profile)
}

const showForm = ref(false)      // is the add/edit form visible
const editingItem = ref(null)    // null = add mode, an item = edit mode

function openForm(item = null) {
  editingItem.value = item
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingItem.value = null
  checklistStore.error = null
}

const isSaved = computed(() => Boolean(checklistStore.checklist?.is_saved))
watch(isSaved, (saved) => {
  if (!saved) {
    closeForm()
  }
})

</script>

<template>
  <main class="container route-detail-page py-5">
    <RouterLink class="back-link mb-4" to="/routes">Back to all routes</RouterLink>

    <p v-if="loading" role="status">Loading route...</p>
    <p v-else-if="error" class="route-detail-message" role="alert">{{ error }}</p>
    <p v-else-if="!route" class="route-detail-message">This route could not be found.</p>

    <template v-else>
      <header class="route-detail-heading mb-5">
        <p v-if="route.country" class="route-eyebrow mb-2">{{ route.country }}</p>
        <h1 class="display-5 fw-semibold mb-3">{{ route.name }}</h1>
        <p v-if="route.technical_rating" class="lead mb-0">
          Official rating: {{ route.technical_rating }}
        </p>
      </header>

      <div class="row g-4">
        <section class="col-12 col-lg-6" aria-labelledby="route-overview-title">
          <div class="route-detail-section h-100">
            <h2 id="route-overview-title" class="h4 mb-4">Route overview</h2>
            <dl class="route-detail-facts">
              <div>
                <dt>Distance</dt>
                <dd>{{ formatValue(route.distance_km, ' km') }}</dd>
              </div>
              <div>
                <dt>Elevation gain</dt>
                <dd>{{ formatValue(route.elevation_gain_m, ' m') }}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{{ formatDuration(route.duration_days) }}</dd>
              </div>
              <div>
                <dt>Maximum altitude</dt>
                <dd>{{ formatValue(route.altitude_m, ' m') }}</dd>
              </div>
              <div>
                <dt>Multiday route</dt>
                <dd>{{ formatBoolean(route.is_multiday) }}</dd>
              </div>
              <div>
                <dt>Permit</dt>
                <dd>{{ formatBoolean(route.permit_required) }}</dd>
              </div>
              <div>
                <dt>Guide</dt>
                <dd>{{ formatBoolean(route.guide_required) }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="col-12 col-lg-6" aria-labelledby="route-feedback-title">
          <div class="route-detail-section h-100">
            <h2 id="route-feedback-title" class="h4 mb-4">Difficulty and community feedback</h2>
            <dl class="route-detail-facts">
              <div>
                <dt>Official difficulty</dt>
                <dd>{{ formatDifficulty(route.official_difficulty ?? route.technical_rating) }}</dd>
              </div>
              <div>
                <dt>Community-adjusted difficulty</dt>
                <dd>{{ formatDifficulty(route.effective_difficulty) }}</dd>
              </div>
              <div>
                <dt>Average perceived difficulty</dt>
                <dd>{{ formatValue(route.avg_perceived_difficulty, ' / 4') }}</dd>
              </div>
              <div>
                <dt>Average rating</dt>
                <dd>{{ formatValue(route.avg_rating, ' / 5') }}</dd>
              </div>
              <div>
                <dt>Reviews</dt>
                <dd>{{ formatValue(route.review_count) }}</dd>
              </div>
              <div>
                <dt>Completion rate</dt>
                <dd>{{ formatCompletionRate(route.completion_rate) }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="col-12" aria-labelledby="route-safety-title">
          <div class="route-detail-section">
            <h2 id="route-safety-title" class="h4 mb-4">Safety and hazards</h2>
            <dl class="route-detail-facts">
              <div>
                <dt>Safety status</dt>
                <dd>{{ formatValue(route.safety_status) }}</dd>
              </div>
              <div>
                <dt>Safety note</dt>
                <dd>{{ formatValue(route.safety_status_note) }}</dd>
              </div>
              <div>
                <dt>Community hazard level</dt>
                <dd>{{ formatValue(route.community_hazard_level) }}</dd>
              </div>
              <div>
                <dt>Community hazard note</dt>
                <dd>{{ formatValue(route.community_hazard_note) }}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>


  <!-- gear checklist -->
  <section class="mb-4">
        <h2 class="h5">Gear checklist</h2>
        <div v-if="!auth.isLoggedIn" class="alert alert-secondary">
          <RouterLink to="/auth">Sign in</RouterLink> to make a new checklist.
        </div>
        <div v-else>
          <div class="d-flex flex-wrap gap-2 mb-2">
            <button class="btn btn-sm btn-outline-primary mb-2" :disabled="checklistStore.loading||isSaved||!auth.profile" 
            @click="generateChecklist">
              {{ checklistStore.loading ? 'Generating...' :(checklistStore.items.length ? 'Regenerate' : 'Generate checklist') }}
            </button>

            <button v-if="checklistStore.checklist"
                class="btn btn-sm"
                :class="isSaved ? 'btn-warning' : 'btn-outline-warning'"
                @click="checklistStore.toggleSaved()">
                {{ isSaved ? '★ Saved' : '☆ Save checklist' }}
              </button>
          </div>

          <p v-if="checklistStore.checklist && !isSaved" class="small text-muted">
            Save this checklist to edit it and find it in your profile.
          </p>
          <p v-if="isSaved" class="small text-muted">
            To generate a new checklist, unsave this one first by clicking "★ Saved".
            Generating a new checklist deletes this one.
          </p>
          <p v-if="isSaved && !checklistStore.items.length" class="small text-muted">
            This checklist is empty. Add items below, or unsave it to generate a new one.
          </p>

          <div v-if="checklistStore.error && !showForm" class="alert alert-danger py-2 small">
            {{ checklistStore.error }}
          </div>

          <!-- existing checklist items -->
          <ul v-if="checklistStore.items.length" class="list-group mb-2">
            <li v-for="item in checklistStore.items" :key="item.id" class="list-group-item d-flex align-items-start gap-2">
              <input class="form-check-input mt-1" type="checkbox" :checked="item.checked" @change="checklistStore.toggleChecked(item.id,!item.checked)" />
              <div class="flex-grow-1">
                <span :class="{ 'text-decoration-line-through text-muted': item.checked }">
                  {{ item.label }} 
                  <span v-if="item.quantity" class="text-muted">— {{ item.quantity }}</span>
                </span>
                <div v-if="item.reason" class="small text-muted">{{ item.reason }}</div>
              </div>
              <div v-if="isSaved">
                <button class="btn btn-sm btn-link text-primary p-0" @click="openForm(item)">edit</button>
                <span> | </span>
                <button class="btn btn-sm btn-link text-danger p-0" @click="checklistStore.deleteItem(item.id)">remove</button>
              </div>
            </li>
          </ul>
        
          <div v-if="checklistStore.checklist && isSaved" class="mt-3">
            <button v-if="!showForm" class="btn btn-sm btn-outline-secondary"
              @click="openForm()">+ Add item</button>
            <ChecklistForm v-else :key="editingItem?.id ?? 'new'" :item="editingItem" @done="closeForm" />
          </div>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.route-detail-page {
  max-width: 1200px;
}

.back-link {
  display: inline-block;
}

.route-detail-heading {
  max-width: 760px;
}

.route-eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.route-detail-section,
.route-detail-message {
  border: 1px solid currentColor;
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.route-detail-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: 1.25rem;
  margin-bottom: 0;
}

.route-detail-facts dt {
  font-weight: 600;
}

.route-detail-facts dd {
  margin-bottom: 0;
}
</style>

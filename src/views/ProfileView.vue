<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/controller/authStore'
import { useChecklistStore } from '@/controller/checklistStore'
import ChecklistForm from '@/components/checklist/ChecklistForm.vue'
import { genderLabels } from '@/lib/countries'

// the router guard only lets signed-in users reach this page
const auth = useAuthStore()

// "Singapore · 21 · Female", skipping anything not filled in
const profileDetails = computed(() => {
  const p = auth.profile
  if (!p) return ''
  const gender = p.gender === 'prefer_not_to_say' ? null : genderLabels[p.gender]
  return [p.country, p.age, gender].filter(Boolean).join(' · ')
})

// ---------- saved gear checklists ----------
const checklistStore = useChecklistStore()

const categoryLabels = {
  clothing: 'Clothing',
  safety: 'Safety',
  navigation: 'Navigation',
  water_food: 'Water & Food',
  shelter: 'Shelter',
  documents: 'Documents',
  other: 'Other',
}

onMounted(async () => {
  checklistStore.reset()
  await checklistStore.loadSaved()
})

function groupByCategory(items) {
  const groups = []
  for (const key of Object.keys(categoryLabels)) {
    const inCategory = items.filter((i) => i.category === key)
    if (inCategory.length > 0) {
      groups.push({ key, label: categoryLabels[key], items: inCategory })
    }
  }
  return groups
}

// which checklists are expanded
const openIds = ref([])

function isOpen(id) {
  return openIds.value.includes(id)
}

function toggleOpen(id) {
  if (isOpen(id)) {
    openIds.value = openIds.value.filter((x) => x !== id)
    if (formState.value?.checklistId === id) closeForm()
  } else {
    openIds.value.push(id)
  }
}

// the one open add/edit form: { checklistId, item } (item = null means add)
const formState = ref(null)

function openForm(checklistId, item = null) {
  checklistStore.clearError()
  formState.value = { checklistId, item }
}

function closeForm() {
  formState.value = null
  checklistStore.clearError()
}

// the store writes to the database; the profile page then refreshes its list
async function onFormDone() {
  closeForm()
  await checklistStore.loadSaved()
}

async function onRemove(item) {
  if (await checklistStore.deleteItem(item.id)) {
    if (formState.value?.item?.id === item.id) closeForm()
    await checklistStore.loadSaved()
  }
}

async function onToggle(item) {
  const checked = !item.is_checked
  if (await checklistStore.toggleChecked(item.id, checked)) {
    item.is_checked = checked // update locally, no reload needed
  }
}

function packedCount(items) {
  return items.filter((i) => i.is_checked).length
}

</script>

<template>
  <div class="container" style="max-width: 720px">
    <h1 class="h3 mb-3">My profile</h1>

    <div v-if="!auth.profile" class="alert alert-warning">
      We couldn't load your profile. Try refreshing the page.
    </div>

    <!-- quiz summary -->
    <div v-else class="card mb-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h2 class="h5 mb-1">{{ auth.profile.display_name || auth.user.email }}</h2>
            <p v-if="profileDetails" class="small text-muted mb-2">{{ profileDetails }}</p>
            <p v-if="auth.profile.about" class="mb-2" style="white-space: pre-line">{{ auth.profile.about }}</p>
            <p class="small text-muted mb-2">
              Experience: {{ auth.profile.experience_level || 'not set' }}
            </p>
            <p v-if="auth.profile.fitness_score != null" class="mb-0">
              Fitness score: <strong>{{ auth.profile.fitness_score }}</strong> / 100
            </p>
          </div>

          <RouterLink class="btn btn-sm btn-outline-primary" :to="{ name: 'quiz' }">
            {{ auth.profile.fitness_score != null ? 'Retake quiz' : 'Take the quiz' }}
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- saved gear checklists go here once the checklist store supports listing them -->
    <section class="checklists" aria-labelledby="saved-checklists-title">
      <h2 id="saved-checklists-title" class="h4 mb-3">My saved gear checklists</h2>

      <p v-if="checklistStore.savedLoading && !checklistStore.savedChecklists.length" role="status">
        Loading your checklists...
      </p>

      <div v-if="checklistStore.error && !formState" class="alert alert-danger py-2 small" role="alert">
        {{ checklistStore.error }}
      </div>

      <p
        v-if="!checklistStore.savedLoading && !checklistStore.error && !checklistStore.savedChecklists.length"
        class="alert alert-secondary"
      >
        You have no saved checklists yet. Open a route, generate a gear checklist and click
        "Save checklist" to see it here.
      </p>

      <div v-for="c in checklistStore.savedChecklists" :key="c.id" class="card mb-3">
        <div class="card-body">
         
          <div class="checklist-header">
            <button
              type="button"
              class="checklist-toggle"
              :aria-expanded="isOpen(c.id)"
              :aria-controls="'checklist-' + c.id"
              @click="toggleOpen(c.id)"
            >
              <span class="checklist-title">
                <span aria-hidden="true">{{ isOpen(c.id) ? '▾' : '▸' }}</span>
                {{ c.route_name }}
              </span>
              <span class="checklist-meta">
                <template v-if="c.country">{{ c.country }} · </template>
                {{ packedCount(c.items) }} / {{ c.items.length }} packed
              </span>
            </button>
            <RouterLink class="btn btn-sm btn-outline-secondary" :to="'/routes/' + c.route_id">
              View route
            </RouterLink>
          </div>

          <!-- body: only when expanded -->
          <div v-if="isOpen(c.id)" :id="'checklist-' + c.id" class="checklist-body">
            <p v-if="!c.items.length" class="checklist-meta">
              This checklist is empty. Add an item below.
            </p>

            <div v-for="group in groupByCategory(c.items)" :key="group.key" class="checklist-group">
              <h4 class="checklist-group-title">{{ group.label }}</h4>
              <ul class="checklist-list">
                <li v-for="item in group.items" :key="item.id" class="checklist-item">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    :checked="item.is_checked"
                    :aria-label="'Mark ' + item.label + ' as packed'"
                    @change="onToggle(item)"
                  />
                  <div class="checklist-item-text">
                    <span :class="{ 'checklist-item-done': item.is_checked }">
                      {{ item.label }}
                      <span v-if="item.quantity" class="checklist-meta-inline">— {{ item.quantity }}</span>
                    </span>
                    <div v-if="item.reason" class="checklist-meta">{{ item.reason }}</div>
                  </div>
                  <div class="checklist-actions">
                    <button type="button" class="checklist-action-edit" @click="openForm(c.id, item)">edit</button>
                    <span aria-hidden="true">|</span>
                    <button type="button" class="checklist-action-remove" @click="onRemove(item)">remove</button>
                  </div>
                </li>
              </ul>
            </div>

            <div class="checklist-form-area">
              <ChecklistForm
                v-if="formState?.checklistId === c.id"
                :key="formState.item?.id ?? 'new'"
                :item="formState.item"
                :checklist-id="c.id"
                @done="onFormDone"
              />
              <button
                v-else
                type="button"
                class="btn btn-sm btn-outline-secondary"
                @click="openForm(c.id)"
              >
                + Add item
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.checklist-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.checklist-toggle {
  flex: 1;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
}

.checklist-title {
  display: block;
  font-size: 1.25rem;
  font-weight: 500;
}

/* shared muted small text (country, reason, empty message) */
.checklist-meta {
  display: block;
  font-size: 0.875rem;
  color: #6c757d;
}

.checklist-meta-inline {
  color:  #6c757d;
}

.checklist-body {
  margin-top: 1rem;
}

.checklist-group {
  margin-bottom: 1rem;
}

.checklist-group-title {
  margin-bottom: 0.25rem;
  font-size: 1rem;
  text-transform: uppercase;
  color: #6c757d;
}

.checklist-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 0.375rem;
}

.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.checklist-item + .checklist-item {
  border-top: 1px solid #dee2e6;
}

.checklist-item .form-check-input {
  margin-top: 0.25rem;
}

.checklist-item-text {
  flex: 1;
}

.checklist-item-done {
  text-decoration: line-through;
  color: #6c757d;
}

/* edit | remove */
.checklist-actions {
  white-space: nowrap;
}

.checklist-actions button {
  padding: 0;
  border: 0;
  background: none;
  font-size: 0.875rem;
}

.checklist-action-edit {
  color: rgb(44, 118, 255);
}

.checklist-action-remove {
  color: rgb(255, 49, 49);
}

.checklist-form-area {
  margin-top: 1rem;
}
</style>
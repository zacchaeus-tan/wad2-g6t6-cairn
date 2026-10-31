<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { motion } from 'motion-v'

import { useAuthStore } from '@/controller/authStore'
import { useChecklistStore } from '@/controller/checklistStore'

import ChecklistForm from './ChecklistForm.vue'
import ChecklistCategory from './ChecklistCategory.vue'
import ChecklistProgress from './ChecklistProgress.vue'

import './checklist.css'
import clothingIcon from '@/assets/img/clothingIcon.png'
import safetyIcon from '@/assets/img/safetyIcon.png'
import navigationIcon from '@/assets/img/navigationIcon.png'
import foodIcon from '@/assets/img/foodIcon.png'
import shelterIcon from '@/assets/img/shelterIcon.png'
import documentIcon from '@/assets/img/documentIcon.png'

const props = defineProps({
  route: {
    type: Object,
    required: true,
  },
})

const currentRoute = useRoute()
const auth = useAuthStore()
const checklistStore = useChecklistStore()

const search = ref('')
const activeCategory = ref('all')
const showForm = ref(false)
const editingItem = ref(null)
const successMessage = ref('')
const collapsedCategories = ref([])
const deletingItemId = ref(null)

const categories = [
  { key: 'clothing', label: 'Clothing', icon: clothingIcon },
  { key: 'safety', label: 'Safety', icon: safetyIcon },
  { key: 'navigation', label: 'Navigation', icon: navigationIcon },
  { key: 'water_food', label: 'Water & food', icon: foodIcon },
  { key: 'shelter', label: 'Shelter', icon: shelterIcon },
  { key: 'documents', label: 'Documents', icon: documentIcon },
  { key: 'other', label: 'Other', icon: '✳' },
]

const isSaved = computed(() => Boolean(checklistStore.checklist?.is_saved))

const checkedCount = computed(() => checklistStore.items.filter((item) => item.is_checked).length)

const totalCount = computed(() => checklistStore.items.length)

const progress = computed(() =>
  totalCount.value ? Math.round((checkedCount.value / totalCount.value) * 100) : 0,
)

let successMessageTimer = null

// Collapse categories automatically when packing is complete.
watch(
  progress,
  (value) => {
    if (value === 100) {
      collapsedCategories.value = categories.map((category) => category.key)
    }
  },
  { immediate: true },
)

function toggleCategory(categoryKey) {
  collapsedCategories.value = collapsedCategories.value.includes(categoryKey)
    ? collapsedCategories.value.filter((key) => key !== categoryKey)
    : [...collapsedCategories.value, categoryKey]
}

const visibleItems = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()

  return checklistStore.items.filter((item) => {
    const matchesCategory = activeCategory.value === 'all' || item.category === activeCategory.value

    const matchesSearch =
      !query || `${item.label} ${item.reason || ''}`.toLocaleLowerCase().includes(query)

    return matchesCategory && matchesSearch
  })
})

const groupedItems = computed(() =>
  categories
    .map((category) => ({
      ...category,
      items: visibleItems.value.filter((item) => item.category === category.key),
    }))
    .filter((category) => category.items.length),
)

async function generateChecklist() {
  if (isSaved.value || checklistStore.loading) return

  if (
    checklistStore.items.length &&
    !window.confirm(
      'Generating a new checklist will delete the current one and replace it. Continue?',
    )
  ) {
    return
  }

  await checklistStore.generate(props.route)

  search.value = ''
  activeCategory.value = 'all'
  collapsedCategories.value = []
}

async function toggleSaved() {
  const success = await checklistStore.toggleSaved()

  if (success && !checklistStore.checklist?.is_saved) {
    closeForm()
  }
}

function openForm(item = null) {
  successMessage.value = ''
  checklistStore.clearError()
  editingItem.value = item
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingItem.value = null
  checklistStore.clearError()
}

function handleFormDone(result) {
  if (!result?.saved) {
    closeForm()
    return
  }

  closeForm()

  showSuccessMessage(
    result.action === 'updated' ? 'Changes saved successfully.' : 'Item added successfully.',
  )
}

async function toggleItem(item) {
  await checklistStore.toggleChecked(item.id, !item.is_checked)
}

async function removeItem(item) {
  if (deletingItemId.value !== null) return

  const confirmed = window.confirm(
    `Are you sure you want to remove “${item.label}” from this checklist?`,
  )

  if (!confirmed) return

  deletingItemId.value = item.id

  // Give Vue time to display the deleting indicator
  await nextTick()

  try {
    const success = await checklistStore.deleteItem(item.id)

    if (!success) {
      successMessage.value = ''
    }
  } catch (error) {
    console.error('Failed to remove checklist item:', error)
  } finally {
    deletingItemId.value = null
  }
}

function showSuccessMessage(message) {
  // Clear any previous timer
  if (successMessageTimer) {
    clearTimeout(successMessageTimer)
  }

  successMessage.value = message

  // Automatically remove the message after 10 seconds
  successMessageTimer = setTimeout(() => {
    successMessage.value = ''
    successMessageTimer = null
  }, 10000)
}

const isComplete = computed(() => totalCount.value > 0 && progress.value === 100)

const completionStars = Array.from({ length: 42 }, (_, index) => ({
  id: index,
  x: (index * 47 + 11) % 100,
  delay: (index % 14) * 65,
  drift: ((index * 19) % 150) - 75,
  size: 10 + (index % 5) * 3,
  rotation: (index * 41) % 360,
}))

onBeforeUnmount(() => {
  if (successMessageTimer) {
    clearTimeout(successMessageTimer)
  }
})
</script>

<template>
  <section class="gear-panel" aria-labelledby="gear-checklist-title">
    <!-- Full checklist confetti -->
    <div v-if="isComplete" class="gear-confetti-overlay" aria-hidden="true">
      <span
        v-for="star in completionStars"
        :key="star.id"
        class="gear-confetti-star"
        :style="{
          '--star-x': `${star.x}%`,
          '--star-delay': `${star.delay}ms`,
          '--star-drift': `${star.drift}px`,
          '--star-size': `${star.size}px`,
          '--star-rotation': `${star.rotation}deg`,
        }"
      >
        ★
      </span>
    </div>

    <div class="gear-heading-row">
      <div>
        <h2 id="gear-checklist-title" class="gear-title">Pack with purpose</h2>

        <p class="gear-intro">
          Generate a gear checklist tailored to this route, tick items off as you pack, and save
          your checklist to edit it or find it in your profile.
        </p>
      </div>
    </div>

    <!-- Sign-in state -->
    <div v-if="!auth.isLoggedIn" class="gear-signin">
      <div class="gear-signin-mark">✦</div>

      <div>
        <strong>Your checklist starts here</strong>
        <p>Sign in to generate and save a gear checklist for this route.</p>
      </div>

      <RouterLink
        class="gear-button gear-button-dark"
        :to="{
          name: 'auth',
          query: { redirect: currentRoute.fullPath },
        }"
      >
        Sign in
      </RouterLink>
    </div>

    <template v-else>
      <!-- Generate and save actions -->
      <div class="gear-action-row">
        <div class="gear-action-copy">
          <span class="gear-action-hint">
            {{
              isSaved
                ? 'Saved to your profile. Unsave it to enable regeneration.'
                : totalCount > 0
                  ? 'Your gear checklist is ready. Keep packing or refresh your list.'
                  : 'Generate a gear checklist tailored to this route.'
            }}
          </span>
        </div>

        <div class="gear-actions">
          <button
            type="button"
            class="gear-button gear-button-dark gear-regenerate-button"
            :class="{
              'is-loading': checklistStore.loading,
              'is-locked': isSaved,
            }"
            :disabled="checklistStore.loading || isSaved"
            :aria-disabled="checklistStore.loading || isSaved"
            @click="generateChecklist"
          >
            <span v-if="checklistStore.loading" class="gear-spinner"></span>

            {{
              checklistStore.loading
                ? totalCount
                  ? 'Regenerating your checklist…'
                  : 'Generating your checklist…'
                : isSaved
                  ? 'Regeneration locked'
                  : totalCount
                    ? 'Regenerate checklist'
                    : 'Generate gear checklist'
            }}
          </button>

          <button
            v-if="checklistStore.checklist"
            type="button"
            class="gear-button"
            :class="isSaved ? 'gear-button-saved' : 'gear-button-outline'"
            :aria-pressed="isSaved"
            @click="toggleSaved"
          >
            <span aria-hidden="true">
              {{ isSaved ? '★' : '☆' }}
            </span>
            {{ isSaved ? 'Saved to profile' : 'Save checklist' }}
          </button>
        </div>
      </div>

      <!-- Loading state -->
      <div
        v-if="checklistStore.loading"
        class="gear-loading-panel"
        role="status"
        aria-live="polite"
      >
        <div class="gear-loading-icon">
          <span class="gear-loading-orbit"></span>
          <span class="gear-loading-star">✦</span>
        </div>

        <div class="gear-loading-copy">
          <strong>
            {{ totalCount ? 'Refreshing your checklist' : 'Building your checklist' }}
          </strong>

          <p>
            {{
              totalCount
                ? 'Your updated checklist is being prepared. This may take a moment.'
                : 'Checking the route details and putting together a practical packing list.'
            }}
          </p>

          <div class="gear-loading-track">
            <span></span>
          </div>
        </div>
      </div>

      <!-- General checklist error -->
      <div v-if="checklistStore.error && !showForm" class="gear-error" role="alert">
        {{ checklistStore.error }}
      </div>

      <div v-if="totalCount" class="gear-workspace">
        <!-- Save confirmation -->
        <motion.div
          v-if="successMessage"
          class="gear-feedback"
          role="status"
          aria-live="polite"
          :initial="{ opacity: 0, y: -8, scale: 0.98 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{
            type: 'spring',
            stiffness: 420,
            damping: 28,
          }"
        >
          <span class="gear-feedback-icon">✓</span>
          <span>{{ successMessage }}</span>
        </motion.div>

        <!-- Progress and completion animation -->
        <ChecklistProgress
          :checked-count="checkedCount"
          :total-count="totalCount"
          :progress="progress"
        />

        <!-- Search -->
        <div class="gear-list-toolbar">
          <label class="gear-search">
            <span>⌕</span>

            <input
              v-model="search"
              type="search"
              placeholder="Find an item…"
              aria-label="Search gear items"
            />
          </label>

          <span class="gear-list-count"> {{ visibleItems.length }} ITEMS SHOWN </span>
        </div>

        <!-- Category filters -->
        <div class="gear-category-tabs" aria-label="Filter by category">
          <button
            type="button"
            :class="{ active: activeCategory === 'all' }"
            @click="activeCategory = 'all'"
          >
            All gear <span>{{ totalCount }}</span>
          </button>

          <button
            v-for="category in categories"
            :key="category.key"
            type="button"
            :class="{ active: activeCategory === category.key }"
            @click="activeCategory = category.key"
          >
            {{ category.label }}

            <span>
              {{ checklistStore.items.filter((item) => item.category === category.key).length }}
            </span>
          </button>
        </div>

        <div v-if="!visibleItems.length" class="gear-empty-filter">
          No gear matches this search. Try another term or category.
        </div>

        <!-- Category components -->
        <ChecklistCategory
          v-for="group in groupedItems"
          :key="group.key"
          :group="group"
          :collapsed="collapsedCategories.includes(group.key)"
          :is-saved="isSaved"
          :editing-item="editingItem"
          :show-form="showForm"
          :checklist-id="checklistStore.checklistId"
          :deleting-item-id="deletingItemId"
          @toggle-category="toggleCategory"
          @toggle-item="toggleItem"
          @edit-item="openForm"
          @remove-item="removeItem"
          @form-done="handleFormDone"
        />

        <!-- Add custom item -->
        <div v-if="isSaved" class="gear-add-row">
          <div v-if="showForm && !editingItem" class="gear-add-form-panel">
            <ChecklistForm
              key="new"
              class="gear-inline-form"
              :checklist-id="checklistStore.checklistId"
              @done="handleFormDone"
            />
          </div>

          <button v-else type="button" class="gear-add-button" @click="openForm()">
            <span>＋</span>
            Add a custom item
          </button>
        </div>
      </div>

      <!-- Save instructions -->
      <div v-if="checklistStore.checklist && !isSaved" class="gear-save-note">
        <span>✳</span>
        Save this checklist to add, edit or remove items and access it later from your profile.
      </div>

      <div v-if="isSaved" class="gear-save-note">
        <span>✳</span>
        This checklist is saved. To generate a new one, unsave it first. Generating a new checklist
        replaces the current unsaved checklist.
      </div>
    </template>

    <p class="gear-disclaimer">
      AI-GENERATED CHECKLIST · Check trail conditions, weather, permits and your own experience
      before setting out.
    </p>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { AnimatePresence, motion } from 'motion-v'
import { useChecklistStore } from '@/controller/checklistStore'
import ChecklistForm from './ChecklistForm.vue'
import ChecklistCategory from './ChecklistCategory.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const props = defineProps({
  route: { type: Object, required: true },
  weather: { type: Object, default: null },
  weatherReady: { type: Boolean, default: true }, // is forecast request ready
  itinerary: { type: Object, default: null }, // ai output
  trip: { type: Object, default: null }, // user input
  isLoggedIn: { type: Boolean, required: true },
  signInTo: { type: Object, required: true },
})

const checklistStore = useChecklistStore()

const categoryComponent = ref(null)
const generating = ref(false)
// Custom confirmation dialog
const confirmation = ref(null)

function generateChecklist() {
  // Ask for confirmation before replacing an existing checklist
  if (checklistStore.items.length) {
    confirmation.value = { type: 'regenerate' }
    return
  }

  runGenerateChecklist()
}

async function runGenerateChecklist() {
  generating.value = true

  try {
    await checklistStore.generate(props.route, props.weather, {
      itinerary: props.itinerary,
      trip: props.trip,
    })
  } finally {
    generating.value = false
  }
  categoryComponent.value?.resetCategory()
}

// Text that steps forward while the list is being written, then stays on the last step
const loadingMessages = computed(() => {
  const steps = ['Reading the route…']
  if (props.weather) steps.push('Checking the forecast…')
  if (props.trip && props.itinerary) steps.push('Fitting your itinerary…')
  steps.push('Creating your list…')
  return steps
})

const messageIndex = ref(0)
let messageTimer = null

watch(generating, (isGenerating) => {
  clearInterval(messageTimer)
  messageIndex.value = 0
  if (isGenerating) {
    messageTimer = setInterval(() => {
      messageIndex.value = Math.min(messageIndex.value + 1, loadingMessages.value.length - 1)
    }, 3500)
  }
})

onBeforeUnmount(() => clearInterval(messageTimer))

const generateLabel = computed(() => {
  if (generating.value) return loadingMessages.value[messageIndex.value]
  return checklistStore.items.length ? 'Regenerate' : 'Generate checklist'
})

const showForm = ref(false)
const editingItem = ref(null)

function openForm(item = null) {
  editingItem.value = item
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingItem.value = null
  checklistStore.clearError()
}

const isSaved = computed(() => Boolean(checklistStore.checklist?.is_saved))

async function onToggleSaved() {
  await checklistStore.toggleSaved()
  if (!isSaved.value) {
    closeForm()
  }
}

// Per-item delete confirmation
const deletingItemId = ref(null)

function removeItem(item) {
  if (deletingItemId.value !== null) return

  confirmation.value = {
    type: 'delete',
    item,
  }
}

async function confirmAction() {
  const action = confirmation.value

  if (!action) return

  confirmation.value = null

  if (action.type === 'delete') {
    deletingItemId.value = action.item.id

    try {
      await checklistStore.deleteItem(action.item.id)
    } finally {
      deletingItemId.value = null
    }
    return
  }

  if (action.type === 'regenerate') {
    await runGenerateChecklist()
  }
}

function cancelConfirmation() {
  confirmation.value = null
}

// Progress and completion
const totalCount = computed(() => checklistStore.items.length)
const checkedCount = computed(() => checklistStore.items.filter((i) => i.is_checked).length)
const progress = computed(() =>
  totalCount.value ? Math.round((checkedCount.value / totalCount.value) * 100) : 0,
)
const isComplete = computed(() => totalCount.value > 0 && progress.value === 100)

const completionStars = Array.from({ length: 42 }, (_, index) => ({
  id: index,
  x: (index * 47 + 11) % 100,
  delay: (index % 14) * 65,
  drift: ((index * 19) % 150) - 75,
  size: 10 + (index % 5) * 3,
  rotation: (index * 41) % 360,
}))
</script>

<template>
  <article class="gear">
    <!-- Yellow star confetti, clipped to the checklist area -->
    <div v-if="isComplete" class="gear-confetti" aria-hidden="true">
      <span
        v-for="star in completionStars"
        :key="star.id"
        class="gear-confetti-star"
        :style="{
          '--star-x': star.x + '%',
          '--star-delay': star.delay + 'ms',
          '--star-drift': star.drift + 'px',
          '--star-size': star.size + 'px',
          '--star-rotation': star.rotation + 'deg',
        }"
      >
        ★
      </span>
    </div>

    <h2 id="gear-title" class="cairn-headline">Gear checklist</h2>

    <p v-if="!isLoggedIn" class="gear-message">
      <RouterLink :to="signInTo">Sign in</RouterLink>
      to make a new checklist.
    </p>

    <p v-if="checklistStore.checklist && !isSaved" class="cairn-fine">
      Save this checklist to edit it and find it in your profile.
    </p>
    <p v-if="isSaved" class="cairn-fine">
      To generate a new checklist, unsave this one first by clicking "Saved". Generating a new
      checklist deletes this one.
    </p>
    <p v-if="isSaved && !checklistStore.items.length" class="cairn-fine">
      This checklist is empty. Add items, or unsave it to generate a new one.
    </p>

    <!-- Sheet above the sidebar until lg, then side by side; at xl the sidebar is about 280px.
         g-4 only: a wider gutter pushes the row past the container's padding and the page scrolls sideways -->
    <div v-if="isLoggedIn" class="row g-4 align-items-start">
      <div class="col-12 col-lg-8 col-xl-9">
        <!-- Tilted inside the column, so its corners turn into the gutter instead of past the screen edge -->
        <div class="gear-pad">
          <div class="gear-binding" aria-hidden="true"><i v-for="hole in 12" :key="hole"></i></div>
          <div class="gear-sheet">
            <div class="gear-sheet-head">
              <strong>{{ route.name }} · Packing List</strong>
            </div>

            <p v-if="!checklistStore.items.length" class="gear-empty">
              {{
                checklistStore.loading
                  ? 'Writing your list...'
                  : 'No items yet. Generate a checklist to start.'
              }}
            </p>

            <ChecklistCategory
              ref="categoryComponent"
              :items="checklistStore.items"
              v-slot="{ items, categoryLabels }"
            >
              <ul class="gear-list">
                <AnimatePresence mode="popLayout" :initial="false">
                  <!-- Phones stack the item and its buttons; from sm the buttons sit beside it -->
                  <motion.li
                    v-for="(item, index) in items"
                    :key="item.id"
                    class="gear-item row g-0 align-items-start align-items-sm-center pb-3 pb-sm-0"
                    :initial="{ opacity: 0, y: 8 }"
                    :animate="{ opacity: 1, y: 0 }"
                    :exit="{ opacity: 0 }"
                    :transition="{
                      duration: 0.2,
                      delay: Math.min(index, 5) * 0.03,
                    }"
                  >
                    <!-- The reason shares this column, so it can never squeeze the label -->
                    <div class="col-12 col-sm">
                      <!-- No wrapping on phones, so long text stays beside the checkbox -->
                      <label
                        class="gear-item-label d-flex flex-nowrap flex-sm-wrap align-items-start align-items-sm-center"
                      >
                        <input
                          class="mt-1 mt-sm-0"
                          type="checkbox"
                          :checked="item.is_checked"
                          :disabled="deletingItemId === item.id"
                          @change="checklistStore.toggleChecked(item.id, !item.is_checked)"
                        />

                        <span class="gear-item-text" :class="{ 'is-checked': item.is_checked }">
                          {{ item.label }}

                          <span v-if="item.quantity" class="gear-item-quantity">
                            — {{ item.quantity }}
                          </span>
                        </span>

                        <!-- No room for category tags on phones -->
                        <span class="gear-category-tag d-none d-sm-inline-flex">
                          {{ categoryLabels[item.category] || 'Other' }}
                        </span>
                      </label>

                      <span v-if="item.reason" class="gear-item-reason d-block pb-0 pb-sm-2">
                        {{ item.reason }}
                      </span>
                    </div>

                    <span v-if="isSaved" class="gear-item-tools col-12 col-sm-auto ps-sm-0 ms-sm-3">
                      <button
                        type="button"
                        :disabled="deletingItemId === item.id"
                        @click="openForm(item)"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        class="is-remove"
                        :disabled="deletingItemId === item.id"
                        @click="removeItem(item)"
                      >
                        {{ deletingItemId === item.id ? 'Removing…' : 'Remove' }}
                      </button>
                    </span>

                    <AnimatePresence>
                      <motion.div
                        v-if="showForm && editingItem?.id === item.id"
                        :key="editingItem.id"
                        class="gear-item-form-wrapper col-12"
                        :initial="{ opacity: 0, height: 0, y: -6 }"
                        :animate="{ opacity: 1, height: 'auto', y: 0 }"
                        :exit="{ opacity: 0, height: 0, y: -6 }"
                        :transition="{ duration: 0.2, ease: 'easeOut' }"
                      >
                        <ChecklistForm
                          class="gear-item-form"
                          :item="editingItem"
                          :checklist-id="checklistStore.checklistId"
                          @done="closeForm"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </motion.li>
                </AnimatePresence>
              </ul>
            </ChecklistCategory>

            <div v-if="checklistStore.checklist && isSaved" class="gear-form-area">
              <AnimatePresence mode="wait">
                <motion.div
                  v-if="showForm && !editingItem"
                  key="new"
                  class="gear-add-form-wrapper"
                  :initial="{ opacity: 0, height: 0, y: -6 }"
                  :animate="{ opacity: 1, height: 'auto', y: 0 }"
                  :exit="{ opacity: 0, height: 0, y: -6 }"
                  :transition="{ duration: 0.2, ease: 'easeOut' }"
                >
                  <ChecklistForm :checklist-id="checklistStore.checklistId" @done="closeForm" />
                </motion.div>

                <motion.button
                  v-else
                  key="add-button"
                  type="button"
                  class="cairn-link"
                  @click="openForm()"
                >
                  + Add item
                </motion.button>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <aside class="col-12 col-lg-4 col-xl-3 gear-side">
        <div class="gear-note">
          <strong>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
            </svg>
            AI-generated
          </strong>
          Adjust the list to your own experience and the conditions on the day.
        </div>

        <button
          type="button"
          class="cairn-btn is-blaze gear-generate"
          :class="{ 'is-loading': generating }"
          :disabled="checklistStore.loading || isSaved || !weatherReady"
          :aria-busy="generating"
          @click="generateChecklist"
        >
          <!-- Progress fill that creeps across while the list is written -->
          <motion.span
            v-if="generating"
            class="gear-generate-fill"
            aria-hidden="true"
            :initial="{ width: '0%' }"
            :animate="{ width: '92%' }"
            :transition="{ duration: 18, ease: [0.1, 0.7, 0.2, 1] }"
          />

          <span class="gear-generate-label" aria-live="polite">
            <span v-if="generating" class="gear-generate-spinner" aria-hidden="true"></span>
            <AnimatePresence mode="wait" :initial="false">
              <motion.span
                :key="generateLabel"
                :initial="{ opacity: 0, y: 8 }"
                :animate="{ opacity: 1, y: 0 }"
                :exit="{ opacity: 0, y: -8 }"
                :transition="{ duration: 0.2 }"
              >
                {{ generateLabel }}
              </motion.span>
            </AnimatePresence>
          </span>
        </button>

        <button
          v-if="checklistStore.checklist"
          type="button"
          class="cairn-btn"
          :class="{ 'is-ghost': !isSaved }"
          :aria-pressed="isSaved ? 'true' : 'false'"
          @click="onToggleSaved"
        >
          {{ isSaved ? 'Saved' : 'Save checklist' }}
        </button>

        <!-- Progress and completion status -->
        <div v-if="totalCount" class="gear-progress">
          <motion.div
            v-if="isComplete"
            class="gear-complete"
            role="status"
            aria-live="polite"
            :initial="{ opacity: 0, y: 8, scale: 0.97 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ type: 'spring', stiffness: 300, damping: 22 }"
          >
            <span class="gear-complete-icon" aria-hidden="true">✓</span>
            <span><strong>Packing complete!</strong> You're ready for the trail.</span>
          </motion.div>

          <div class="gear-progress-top">
            <span>
              <strong>{{ checkedCount }}</strong> / {{ totalCount }} packed
            </span>
            <span class="gear-progress-percent">{{ progress }}%</span>
          </div>

          <div
            class="gear-progress-track"
            role="progressbar"
            :aria-valuenow="progress"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="progress + '% of gear packed'"
          >
            <motion.div
              class="gear-progress-fill"
              :initial="{ width: '0%' }"
              :animate="{ width: progress + '%' }"
              :transition="{ duration: 0.65, ease: 'easeOut' }"
            />
          </div>
        </div>

        <p v-if="checklistStore.error && !showForm" class="gear-error" role="alert">
          {{ checklistStore.error }}
        </p>
      </aside>
    </div>
    <!-- Custom confirmation dialog -->
    <ConfirmDialog
      :open="Boolean(confirmation)"
      :title="confirmation?.type === 'delete' ? 'Remove this item?' : 'Regenerate checklist?'"
      :confirm-label="confirmation?.type === 'delete' ? 'Remove item' : 'Regenerate'"
      :disabled="checklistStore.loading || deletingItemId !== null"
      @confirm="confirmAction"
      @cancel="cancelConfirmation"
    >
      <template v-if="confirmation?.type === 'delete'">
        Are you sure you want to remove
        <strong>{{ confirmation.item.label }}</strong>
        from your checklist?
      </template>

      <template v-else>
        Your current checklist will be replaced with a newly generated one. This action cannot be
        undone.
      </template>
    </ConfirmDialog>
  </article>
</template>

<style scoped src="./GearChecklist.css"></style>

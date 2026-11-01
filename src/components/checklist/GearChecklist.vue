<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { AnimatePresence, motion } from 'motion-v'
import { useChecklistStore } from '@/controller/checklistStore'
import ChecklistForm from './ChecklistForm.vue'
import ChecklistCategory from './ChecklistCategory.vue'

const props = defineProps({
  route: { type: Object, required: true },
  isLoggedIn: { type: Boolean, required: true },
  signInTo: { type: Object, required: true },
})

const checklistStore = useChecklistStore()

const categoryComponent = ref(null)
async function generateChecklist() {
  if (
    checklistStore.items.length &&
    !window.confirm(
      'Generating a new checklist will delete the current one and replace it. Continue?',
    )
  ) {
    return
  }
  await checklistStore.generate(props.route)
  categoryComponent.value?.resetCategory()
}

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

async function removeItem(item) {
  if (deletingItemId.value !== null) return
  if (!window.confirm('Are you sure you want to remove "' + item.label + '" from this checklist?'))
    return

  deletingItemId.value = item.id
  try {
    await checklistStore.deleteItem(item.id)
  } finally {
    deletingItemId.value = null
  }
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

    <div v-else class="gear-grid">
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
                <motion.li
                  v-for="(item, index) in items"
                  :key="item.id"
                  class="gear-item"
                  :initial="{ opacity: 0, y: 8 }"
                  :animate="{ opacity: 1, y: 0 }"
                  :exit="{ opacity: 0 }"
                  :transition="{
                    duration: 0.2,
                    delay: Math.min(index, 5) * 0.03,
                  }"
                >
                  <label class="gear-item-label">
                    <input
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

                    <span class="gear-category-tag">
                      {{ categoryLabels[item.category] || 'Other' }}
                    </span>
                  </label>

                  <span v-if="item.reason" class="gear-item-reason">
                    {{ item.reason }}
                  </span>

                  <span v-if="isSaved" class="gear-item-tools">
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
                      class="gear-item-form-wrapper"
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

      <aside class="gear-side">
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
          class="cairn-btn is-blaze"
          :disabled="checklistStore.loading || isSaved"
          @click="generateChecklist"
        >
          {{
            checklistStore.loading
              ? 'Generating...'
              : checklistStore.items.length
                ? 'Regenerate'
                : 'Generate checklist'
          }}
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
  </article>
</template>

<style scoped>
.gear {
  position: relative; /* anchors the confetti overlay */
  display: grid;
  gap: 24px;
}

.gear-message {
  font-size: 17px;
}

.gear-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  align-items: start;
  gap: 32px;
}

/* A ring-bound sheet with a red margin and blue ruling, tilted slightly */
.gear-pad {
  position: relative;
  min-width: 0;
  filter: drop-shadow(0 16px 24px rgb(23 32 28 / 0.18));
  transform: rotate(-0.6deg);
}

.gear-binding {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 34px;
  padding: 0 24px;
  background: #2b3832;
}

.gear-binding i {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ground, #f4f1e9);
  box-shadow: inset 0 2px 3px rgb(0 0 0 / 0.45);
}

.gear-sheet {
  position: relative;
  min-height: 320px;
  padding: 18px 28px 26px 92px;
  background-color: var(--notepad, #fbf8ee);
}

/* Keep the notebook ruling separate from animated content */
.gear-sheet::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, transparent 70px, #e5a3a3 70px 72px, transparent 72px),
    repeating-linear-gradient(to bottom, transparent 0 47px, #b8d2e6 47px 48px);
  background-position:
    0 0,
    0 52px;
}

/* Keep the actual checklist content above the paper decoration */
.gear-sheet > * {
  position: relative;
  z-index: 1;
}

.gear-sheet-head {
  display: flex;
  align-items: baseline;
  height: 34px;
  margin-bottom: 18px;
}

.gear-sheet-head strong {
  font-size: 20px;
  font-weight: 900;
}

.gear-empty {
  color: var(--granite-700, #3a4540);
  line-height: 48px;
}

.gear-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.gear-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
  min-height: 48px;
}

.gear-item-form {
  margin: 4px 0 12px;
}

.gear-item-form-wrapper {
  grid-column: 1 / -1;
  min-height: 0;
  overflow: hidden;
}

.gear-item-label {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  row-gap: 6px;
  cursor: pointer;
}

.gear-item-label input {
  position: relative;
  flex: none;
  width: 20px;
  height: 20px;
  margin: 0;
  border: 2px solid var(--granite-700, #3a4540);
  background: transparent;
  appearance: none;
  cursor: pointer;
}

/* A hand-drawn tick */
.gear-item-label input:checked::after {
  content: '';
  position: absolute;
  left: -2px;
  top: -8px;
  width: 24px;
  height: 24px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c2481a' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 13l5 5L21 4'/%3E%3C/svg%3E")
    no-repeat center / contain;
}

.gear-item-label input:focus-visible {
  outline: 3px solid var(--lake, #1e5f8c);
  outline-offset: 2px;
}

.gear-item-text {
  position: relative;
  font-size: 17px;
}

/* A strike that draws across once the item is ticked */
.gear-item-text::after {
  content: '';
  position: absolute;
  left: -4px;
  right: -4px;
  top: 55%;
  height: 2px;
  background: var(--granite-700, #3a4540);
  transform: scaleX(0);
  transform-origin: 0 50%;
  transition: transform 0.35s var(--ease, ease);
}

.gear-item-text.is-checked {
  color: var(--granite-500, #7a867d);
}

.gear-item-text.is-checked::after {
  transform: scaleX(1);
}

.gear-item-quantity {
  color: var(--granite-700, #3a4540);
}

.gear-item-reason {
  grid-column: 1;
  padding: 0 0 10px 32px;
  color: var(--granite-700, #3a4540);
  font-size: 14px;
  line-height: 20px;
}

.gear-item-tools {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  gap: 4px;
}

.gear-item-tools button {
  min-height: 32px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--ink, #17201c);
  font: 700 13px var(--font, 'Lato', system-ui, sans-serif);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.gear-item-tools button.is-remove {
  color: #b42318;
}

.gear-item-tools button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gear-form-area {
  margin-top: 12px;
}

.gear-side {
  display: grid;
  gap: 16px;
}

.gear-side .cairn-btn {
  width: 100%;
}

/* Yellow sticky note */
.gear-note {
  display: grid;
  gap: 10px;
  padding: 18px;
  background: #ffe68a;
  box-shadow: 0 10px 18px rgb(23 32 28 / 0.15);
  font-size: 15px;
  line-height: 22px;
  transform: rotate(1.5deg);
}

.gear-note strong {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.gear-note svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
}

.gear-error {
  padding: 10px 12px;
  background: #fdecea;
  color: #b42318;
  font-size: 14px;
}

.gear-category-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 22px;
  padding: 3px 8px;
  border: 1px solid #d5ddd2;
  border-radius: 20px;
  background: rgb(232 238 230 / 55%);
  color: #657667;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.035em;
  white-space: nowrap;
}

/* Yellow star confetti */
.gear-confetti {
  position: absolute;
  inset: 0;
  z-index: 20;
  overflow: hidden;
  pointer-events: none;
}

.gear-confetti-star {
  position: absolute;
  left: var(--star-x);
  top: -8%;
  color: #f5c518;
  font-size: var(--star-size);
  opacity: 0;
  text-shadow: 0 2px 5px rgb(180 130 0 / 0.3);
  animation: gear-star-fall 3s ease-in var(--star-delay) both;
}

@keyframes gear-star-fall {
  0% {
    top: -8%;
    transform: translateX(0) rotate(0deg) scale(0.5);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  100% {
    top: 108%;
    transform: translateX(var(--star-drift)) rotate(var(--star-rotation)) scale(1.2);
    opacity: 0;
  }
}

/* Progress card */
.gear-progress {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 2px solid var(--ink, #17201c);
  background: #fff;
  font-size: 14px;
}

.gear-progress-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.gear-progress-top strong {
  font-size: 24px;
  font-weight: 900;
}

.gear-progress-percent {
  color: #1f5b43;
  font-size: 20px;
  font-weight: 900;
}

.gear-progress-track {
  height: 8px;
  overflow: hidden;
  background: #cbd8ce;
}

.gear-progress-fill {
  height: 100%;
  background: #1f5b43;
}

.gear-complete {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #b8d0bd;
  background: #e3eee5;
  color: #244a35;
  font-size: 13px;
  line-height: 18px;
}

.gear-complete-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #1f5b43;
  color: #fff;
  font-weight: 900;
}

@media (max-width: 900px) {
  .gear-grid {
    grid-template-columns: 1fr;
  }

  .gear-sheet {
    padding-left: 62px;
  }

  .gear-sheet::before {
    background-image:
      linear-gradient(to right, transparent 44px, #e5a3a3 44px 46px, transparent 46px),
      repeating-linear-gradient(to bottom, transparent 0 47px, #b8d2e6 47px 48px);
  }
}
</style>

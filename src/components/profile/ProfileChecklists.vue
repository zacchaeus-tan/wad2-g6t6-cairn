<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { AnimatePresence, motion } from 'motion-v'
import { useChecklistStore } from '@/controller/checklistStore'
import { checklistToText, groupChecklistItems } from '@/lib/profileTools'
import { useRowArrivals } from '@/lib/useRowArrivals'
import { EASE_OUT, fadeMotion, rowMotion } from '@/lib/motion'
import ChecklistForm from '@/components/checklist/ChecklistForm.vue'
import NoticeBox from '@/components/common/NoticeBox.vue'
import TickIcon from '@/components/common/TickIcon.vue'
import ProfileLoadError from './ProfileLoadError.vue'
import ProfileSkeleton from './ProfileSkeleton.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

// Uses the store directly: ChecklistForm writes through it and shows its errors.
const checklistStore = useChecklistStore()

onMounted(async () => {
  await checklistStore.loadSaved()
})

const arrivalMotion = useRowArrivals()
const confirmation = ref(null)
// Tracks which item is currently being removed
const deletingItemId = ref(null)

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

function requestRemove(item) {
  // Prevent another deletion while one is in progress
  if (deletingItemId.value !== null) return

  confirmation.value = {
    type: 'delete',
    item,
  }
}

function cancelConfirmation() {
  confirmation.value = null
}

async function confirmRemove() {
  const action = confirmation.value

  if (!action || action.type !== 'delete') return

  confirmation.value = null
  deletingItemId.value = action.item.id

  try {
    if (await checklistStore.deleteItem(action.item.id)) {
      if (formState.value?.item?.id === action.item.id) {
        closeForm()
      }

      await checklistStore.loadSaved()
    }
  } finally {
    deletingItemId.value = null
  }
}

async function onToggle(item) {
  const checked = !item.is_checked
  if (await checklistStore.toggleChecked(item.id, checked)) {
    item.is_checked = checked // update locally, no reload needed
  }
}

// The result of the last copy, shown in the notepad it came from: { checklistId, ok }
const copyResult = ref(null)

async function writeToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // blocked by the browser: try the older way below
    }
  }
  const box = document.createElement('textarea')
  box.value = text
  box.style.position = 'fixed'
  box.style.opacity = '0'
  document.body.append(box)
  box.select()
  const copied = document.execCommand('copy')
  box.remove()
  return copied
}

async function copyChecklist(checklist) {
  const ok = await writeToClipboard(checklistToText(checklist.route_name, checklist.items))
  copyResult.value = { checklistId: checklist.id, ok }
}

// The checklist being printed. It's drawn as its own plain sheet, and print styles hide the page.
const printing = ref(null)

async function printChecklist(checklist) {
  printing.value = checklist
  await nextTick()
  window.addEventListener('afterprint', () => (printing.value = null), { once: true })
  window.print()
}

function checkedCount(items = []) {
  return items.filter((item) => item.is_checked).length
}

function packingProgress(items = []) {
  if (!items.length) return 0

  return Math.round((checkedCount(items) / items.length) * 100)
}

function isPackingComplete(items = []) {
  return items.length > 0 && packingProgress(items) === 100
}

const confettiPieces = Array.from({ length: 35 }, (_, i) => ({
  id: i,
  x: `${(i * 37) % 100}%`,
  delay: (i % 10) * 0.08,
  rotation: (i * 47) % 360,
  size: 12 + (i % 3) * 4,
}))
</script>

<template>
  <section class="checklists" aria-labelledby="saved-checklists-title">
    <h2 id="saved-checklists-title" class="cairn-headline">My saved gear checklists</h2>

    <ProfileSkeleton v-if="checklistStore.savedLoading && !checklistStore.savedChecklists.length">
      Loading your checklists...
    </ProfileSkeleton>

    <ProfileLoadError v-if="checklistStore.error && !formState" @retry="checklistStore.loadSaved()">
      {{ checklistStore.error }}
    </ProfileLoadError>

    <NoticeBox
      v-if="
        !checklistStore.savedLoading &&
        !checklistStore.error &&
        !checklistStore.savedChecklists.length
      "
      type="empty"
    >
      You have no saved checklists yet. Open a route, generate a gear checklist and click "Save
      checklist" to see it here.
    </NoticeBox>
    <AnimatePresence v-if="checklistStore.savedChecklists.length" as="ul" class="checklists-list">
      <motion.li
        v-for="(c, index) in checklistStore.savedChecklists"
        :key="c.id"
        v-bind="arrivalMotion('checklist-' + c.id, index)"
        class="checklist"
      >
        <div class="checklist-header">
          <button
            type="button"
            class="checklist-toggle"
            :aria-expanded="isOpen(c.id)"
            :aria-controls="'checklist-' + c.id"
            @click="toggleOpen(c.id)"
          >
            <motion.svg
              class="checklist-chevron"
              viewBox="0 0 24 24"
              aria-hidden="true"
              :initial="false"
              :animate="{ rotate: isOpen(c.id) ? 180 : 0 }"
              :transition="{ duration: 0.3, ease: EASE_OUT }"
            >
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" />
            </motion.svg>
            <span class="checklist-heading">
              <span class="checklist-title">{{ c.route_name }}</span>
              <span class="checklist-meta">
                <span v-if="c.country" class="cairn-label">{{ c.country }}</span>
                <span class="cairn-data">
                  {{ checkedCount(c.items) }} / {{ c.items.length }} packed
                </span>
              </span>
            </span>
          </button>
          <RouterLink class="cairn-btn is-ghost is-small" :to="'/routes/' + c.route_id">
            View route
          </RouterLink>
        </div>

        <!-- body: only when expanded -->

        <AnimatePresence>
          <motion.div
            v-if="isOpen(c.id)"
            :id="'checklist-' + c.id"
            v-bind="fadeMotion"
            class="checklist-pad"
          >
            <div class="checklist-sheet">
              <!-- Confetti across the entire checklist -->
              <div v-if="isPackingComplete(c.items)" class="gear-confetti" aria-hidden="true">
                <motion.span
                  v-for="piece in confettiPieces"
                  :key="piece.id"
                  class="gear-confetti-piece"
                  :style="{
                    left: piece.x,
                    width: `${piece.size}px`,
                    height: `${piece.size}px`,
                  }"
                  :initial="{ opacity: 0, y: -20, rotate: 0 }"
                  :animate="{
                    opacity: [0, 1, 1, 0],
                    y: [0, 100, 200, 300],
                    rotate: piece.rotation,
                  }"
                  :transition="{
                    delay: piece.delay * 0.3,
                    duration: 1.8,
                    ease: 'easeOut',
                  }"
                >
                  ★
                </motion.span>
              </div>
              <div class="checklist-sheet-head">
                <h3 class="checklist-sheet-title">{{ c.route_name }} · packing list</h3>
                <div class="checklist-sheet-tools">
                  <button
                    type="button"
                    class="cairn-btn is-ghost is-small"
                    @click="printChecklist(c)"
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    class="cairn-btn is-ghost is-small"
                    @click="copyChecklist(c)"
                  >
                    Copy as text
                  </button>
                </div>
              </div>

              <NoticeBox
                v-if="copyResult?.checklistId === c.id"
                :type="copyResult.ok ? 'success' : 'error'"
              >
                {{ copyResult.ok ? 'Checklist copied.' : 'Could not copy the checklist.' }}
              </NoticeBox>

              <p v-if="!c.items.length" class="checklist-empty">
                This checklist is empty. Add an item below.
              </p>

              <!-- Progress and completion status -->
              <div v-if="c.items.length" class="gear-progress">
                <motion.div
                  v-if="isPackingComplete(c.items)"
                  class="gear-complete"
                  role="status"
                  aria-live="polite"
                  :initial="{ opacity: 0, y: 8, scale: 0.97 }"
                  :animate="{ opacity: 1, y: 0, scale: 1 }"
                  :transition="{ type: 'spring', stiffness: 300, damping: 22 }"
                >
                  <!-- Completion message -->
                  <span class="gear-complete-icon" aria-hidden="true">✓</span>
                  <span>
                    <strong>Packing complete!</strong>
                    You're ready for the trail.
                  </span>
                </motion.div>

                <div class="gear-progress-top">
                  <span>
                    <strong>{{ checkedCount(c.items) }}</strong> / {{ c.items.length }} packed
                  </span>
                  <span class="gear-progress-percent">{{ packingProgress(c.items) }}%</span>
                </div>

                <div
                  class="gear-progress-track"
                  role="progressbar"
                  :aria-valuenow="packingProgress(c.items)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="packingProgress(c.items) + '% of gear packed'"
                >
                  <motion.div
                    class="gear-progress-fill"
                    :initial="false"
                    :animate="{ width: packingProgress(c.items) + '%' }"
                    :transition="{ duration: 0.4, ease: 'easeOut' }"
                  />
                </div>
              </div>

              <div v-for="group in groupChecklistItems(c.items)" :key="group.key">
                <h4 class="checklist-group-title">{{ group.label }}</h4>
                <AnimatePresence as="ul" class="checklist-items">
                  <motion.li
                    v-for="item in group.items"
                    :key="item.id"
                    v-bind="rowMotion"
                    class="checklist-item"
                  >
                    <input
                      class="checklist-check"
                      type="checkbox"
                      :checked="item.is_checked"
                      :aria-label="'Mark ' + item.label + ' as packed'"
                      @change="onToggle(item)"
                    />
                    <div class="checklist-item-text">
                      <span class="checklist-item-name" :class="{ 'is-done': item.is_checked }">
                        {{ item.label
                        }}<template v-if="item.quantity"> — {{ item.quantity }}</template>
                      </span>
                      <p v-if="item.reason" class="checklist-item-reason">{{ item.reason }}</p>
                    </div>
                    <div class="checklist-item-actions">
                      <button type="button" class="cairn-link" @click="openForm(c.id, item)">
                        Edit
                      </button>

                      <button
                        type="button"
                        class="is-remove"
                        :disabled="deletingItemId === item.id"
                        @click="requestRemove(item)"
                      >
                        {{ deletingItemId === item.id ? 'Removing…' : 'Remove' }}
                      </button>
                    </div>
                    <AnimatePresence>
                      <motion.div
                        v-if="formState?.checklistId === c.id && formState.item?.id === item.id"
                        :key="'edit-' + item.id"
                        class="checklist-item-form-wrapper"
                        :initial="{ opacity: 0, height: 0, y: -8 }"
                        :animate="{ opacity: 1, height: 'auto', y: 0 }"
                        :exit="{ opacity: 0, height: 0, y: -8 }"
                        :transition="{ duration: 0.3, ease: EASE_OUT }"
                      >
                        <ChecklistForm
                          :item="formState.item"
                          :checklist-id="c.id"
                          @done="onFormDone"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </motion.li>
                </AnimatePresence>
              </div>

              <div class="checklist-add">
                <AnimatePresence mode="wait">
                  <motion.div
                    v-if="formState?.checklistId === c.id && !formState.item"
                    :key="'add-form-' + c.id"
                    class="checklist-form-wrapper"
                    :initial="{ opacity: 0, height: 0, y: -8 }"
                    :animate="{ opacity: 1, height: 'auto', y: 0 }"
                    :exit="{ opacity: 0, height: 0, y: -8 }"
                    :transition="{ duration: 0.3, ease: EASE_OUT }"
                  >
                    <ChecklistForm :checklist-id="c.id" @done="onFormDone" />
                  </motion.div>

                  <motion.button
                    v-else
                    :key="'add-button-' + c.id"
                    type="button"
                    class="cairn-btn is-ghost is-small checklist-add-button"
                    @click="openForm(c.id)"
                    :initial="{ opacity: 0 }"
                    :animate="{ opacity: 1 }"
                    :exit="{ opacity: 0 }"
                    :transition="{ duration: 0.2, ease: EASE_OUT }"
                  >
                    + Add item
                  </motion.button>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.li>
    </AnimatePresence>

    <!-- Only appears on paper: see the print styles -->
    <Teleport to="body">
      <div v-if="printing" class="checklist-print">
        <h1>{{ printing.route_name }} · packing list</h1>
        <p v-if="!printing.items.length">This checklist is empty.</p>
        <section v-for="group in groupChecklistItems(printing.items)" :key="group.key">
          <h2>{{ group.label }}</h2>
          <ul>
            <li v-for="item in group.items" :key="item.id">
              <span class="checklist-print-box"><TickIcon v-if="item.is_checked" /></span>
              <span>
                {{ item.label }}<template v-if="item.quantity"> — {{ item.quantity }}</template>
                <small v-if="item.reason">{{ item.reason }}</small>
              </span>
            </li>
          </ul>
        </section>
      </div>
    </Teleport>
    <ConfirmDialog
      :open="Boolean(confirmation)"
      title="Remove this item?"
      confirm-label="Remove item"
      :disabled="deletingItemId !== null"
      @confirm="confirmRemove"
      @cancel="cancelConfirmation"
    >
      Are you sure you want to remove
      <strong>{{ confirmation?.item?.label || '' }}</strong>
      from this checklist?
    </ConfirmDialog>
  </section>
</template>

<style scoped>
.checklists {
  display: grid;
  gap: 24px;
}

.checklists-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 2px solid var(--ink);
  border-bottom: 2px solid var(--ink);
}

.checklist + .checklist {
  border-top: 1px solid var(--granite-200);
}

.checklist-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px 24px;
  padding: 20px 0;
}

.checklist-toggle {
  display: flex;
  flex: 1 1 18rem;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
}

.checklist-chevron {
  flex: none;
  width: 22px;
  height: 22px;
}

.checklist-heading {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.checklist-title {
  font-size: 16px;
  font-weight: 900;
  line-height: 22px;
}

.checklist-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
}

.checklist-meta .cairn-data {
  color: var(--granite-700);
  font-size: 13px;
  font-weight: 500;
}

/* A sheet with a red margin and blue ruling, tilted slightly on wide screens */
.checklist-pad {
  margin: 4px 0 32px;
  filter: drop-shadow(0 16px 24px rgb(23 32 28 / 0.18));
}

.checklist-sheet {
  --margin: 40px;
  padding: 16px 16px 24px calc(var(--margin) + 16px);
  background-color: var(--notepad);
  background-image:
    linear-gradient(
      to right,
      transparent var(--margin),
      #e5a3a3 var(--margin) calc(var(--margin) + 2px),
      transparent calc(var(--margin) + 2px)
    ),
    repeating-linear-gradient(to bottom, transparent 0 47px, #b8d2e6 47px 48px);
}

.checklist-sheet-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px 16px;
  margin-bottom: 8px;
}

.checklist-sheet-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.checklist-sheet-title {
  min-height: 32px;
  font-size: 20px;
  font-weight: 900;
  line-height: 28px;
}

.checklist-empty {
  line-height: 48px;
}

.checklist-group-title {
  display: flex;
  align-items: flex-end;
  min-height: 48px;
  margin: 0;
  padding-bottom: 8px;
  font-size: 16px;
  font-weight: 900;
  line-height: 22px;
}

.checklist-items {
  margin: 0;
  padding: 0;
  list-style: none;
}

.checklist-item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: start;
  gap: 0 12px;
  min-height: 48px;
  padding-top: 16px;
}

.checklist-check {
  position: relative;
  width: 20px;
  height: 20px;
  margin: 2px 0 0;
  border: 2px solid var(--granite-700);
  background: transparent;
  appearance: none;
  cursor: pointer;
}

/* A hand-drawn tick */
.checklist-check:checked::after {
  content: '';
  position: absolute;
  left: -2px;
  top: -8px;
  width: 24px;
  height: 24px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c2481a' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 13l5 5L21 4'/%3E%3C/svg%3E")
    no-repeat center / contain;
}

.checklist-item-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* A strike that draws across, on every line of a long item */
.checklist-item-name {
  background: linear-gradient(var(--granite-700), var(--granite-700)) no-repeat 0 55% / 0 2px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  transition: background-size 0.35s var(--ease);
}

.checklist-item-name.is-done {
  background-size: 100% 2px;
  color: var(--granite-700);
}

.checklist-item-reason {
  color: var(--granite-700);
  font-size: 14px;
  line-height: 20px;
}

.checklist-add {
  margin-top: 24px;
}

@media (min-width: 900px) {
  /* On the sheet, because Motion owns the transform on the pad */
  .checklist-sheet {
    transform: rotate(-0.6deg);
  }
}

@media (max-width: 639px) {
  .checklist-item {
    row-gap: 0;
    padding-bottom: 16px;
  }

  .checklist-item-actions {
    grid-column: 2 / -1;
    padding-top: 0;
    margin-bottom: 0;
  }
}

/*item action */
.checklist-item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.checklist-item-actions button {
  min-height: 32px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: 700 13px var(--font);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
}

.checklist-item-actions button:hover {
  color: var(--pine);
}

.checklist-item-actions button.is-remove {
  color: #b42318;
}

.checklist-item-actions button.is-remove:hover {
  color: #842d27;
  background: #fdecea;
}

.checklist-item-actions button:focus-visible {
  outline: 2px solid var(--lake);
  outline-offset: 2px;
}

.checklist-item-form-wrapper,
.checklist-form-wrapper {
  min-width: 0;
  overflow: hidden;
}

.checklist-item-form-wrapper {
  grid-column: 1 / -1;
  margin: 4px 0 12px;
}

.checklist-form-wrapper {
  width: 100%;
}

/* add button */
.checklist-add-button {
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.checklist-print {
  display: none;
}

@media print {
  /* Only while the sheet exists: these styles stay loaded after leaving this page */
  :global(body:has(> .checklist-print) > *:not(.checklist-print)) {
    display: none !important;
  }

  .checklist-print {
    display: block;
    color: #000;
    background: #fff;
    font: 400 12pt/1.4 var(--font);
  }

  .checklist-print h1 {
    margin: 0 0 12pt;
    font-size: 18pt;
    font-weight: 900;
  }

  .checklist-print h2 {
    margin: 12pt 0 4pt;
    font-size: 13pt;
    font-weight: 900;
  }

  .checklist-print ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .checklist-print li {
    display: flex;
    gap: 8pt;
    padding: 3pt 0;
    break-inside: avoid;
  }

  .checklist-print-box {
    flex: none;
    width: 11pt;
    height: 11pt;
    margin-top: 2pt;
    border: 1pt solid #000;
  }

  .checklist-print-box svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .checklist-print small {
    display: block;
    font-size: 10pt;
  }
}

.checklist-item-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* progress card */
.gear-progress {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 2px solid #000;
  background: #fff;
  color: var(--gear-pine);
  font-size: 14px;
}

.gear-progress-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  color: var(--gear-pine);
}

.gear-progress-top strong {
  font-size: 24px;
  font-weight: 900;
}

.gear-progress-percent {
  color: #1f4935;
  font-size: 20px;
  font-weight: 900;
}

.gear-progress-track {
  height: 10px;
  overflow: hidden;
  background: #dce8df;
  border: 1px solid #1f4935;
}

.gear-progress-fill {
  width: 0%;
  height: 100%;
  background-color: #1f4935;
  transition: width 0.4s ease;
}

.gear-complete {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #b8d0bd;
  background: #e3eee5;
  color: var(--gear-pine);
  font-size: 13px;
  line-height: 18px;
}

.gear-complete strong {
  color: var(--gear-pine);
}

.gear-complete-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #1f4935;
  color: #fff;
  font-size: 16px;
  font-weight: 900;
}

/* Confetti across the entire checklist */
.checklist-sheet {
  position: relative;
}

.gear-confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 5;
}

.gear-confetti-piece {
  position: absolute;
  top: 0;
  display: block;
  color: #f5c542;
  font-size: 16px;
  line-height: 1;
  text-shadow: 0 1px 2px rgb(0 0 0 / 15%);
}
</style>

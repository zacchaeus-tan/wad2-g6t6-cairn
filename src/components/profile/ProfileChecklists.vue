<script setup>
import { nextTick, ref } from 'vue'
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

// Uses the store directly: ChecklistForm writes through it and shows its errors.
const checklistStore = useChecklistStore()

const arrivalMotion = useRowArrivals()

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

function packedCount(items) {
  return items.filter((i) => i.is_checked).length
}
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
                  {{ packedCount(c.items) }} / {{ c.items.length }} packed
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
              <div class="checklist-sheet-head">
                <h3 class="checklist-sheet-title">{{ c.route_name }} · pack list</h3>
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
                      <button type="button" class="cairn-link" @click="onRemove(item)">
                        Remove
                      </button>
                    </div>
                    <ChecklistForm
                      v-if="formState?.checklistId === c.id && formState.item?.id === item.id"
                      :key="item.id"
                      class="checklist-item-form"
                      :item="formState.item"
                      :checklist-id="c.id"
                      @done="onFormDone"
                    />
                  </motion.li>
                </AnimatePresence>
              </div>

              <div class="checklist-add">
                <ChecklistForm
                  v-if="formState?.checklistId === c.id && !formState.item"
                  key="new"
                  :checklist-id="c.id"
                  @done="onFormDone"
                />
                <button
                  v-else
                  type="button"
                  class="cairn-btn is-ghost is-small"
                  @click="openForm(c.id)"
                >
                  + Add item
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.li>
    </AnimatePresence>

    <!-- Only appears on paper: see the print styles -->
    <Teleport to="body">
      <div v-if="printing" class="checklist-print">
        <h1>{{ printing.route_name }} · pack list</h1>
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

.checklist-item-actions {
  display: flex;
  gap: 12px;
  font-size: 14px;
}

.checklist-item-form {
  grid-column: 1 / -1;
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

@media (max-width: 639.98px) {
  .checklist-item-actions {
    grid-column: 2 / -1;
    padding-top: 4px;
  }
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
</style>

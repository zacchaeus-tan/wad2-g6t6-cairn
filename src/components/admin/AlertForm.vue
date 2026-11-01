<script setup>
import { computed, ref } from 'vue'
import { useAdminStore } from '@/controller/adminStore'
import { defaultAlertEnd } from '@/lib/alertDrafts'
import AdminNote from '@/components/admin/AdminNote.vue'

const props = defineProps({
  userId: { type: String, required: true },
})

const adminStore = useAdminStore()
const saving = ref(false)
const saved = ref('') // message after a save
const drafted = ref(false) // filled in from a hiker report, so worth a check
const editingId = ref(null) // set while editing a published alert
const routeSearch = ref('')

const editing = computed(() => editingId.value !== null)

const routeMatches = computed(() => {
  const term = routeSearch.value.trim().toLowerCase()
  if (!term) return []
  return adminStore.routes
    .filter((r) => r.name?.toLowerCase().includes(term) || r.country?.toLowerCase().includes(term))
    .slice(0, 8)
})

function emptyForm() {
  return {
    routeId: '',
    severity: 'warning',
    title: '',
    message: '',
    startsAt: '',
    endsAt: defaultAlertEnd(),
  }
}

const form = ref(emptyForm())

const selectedRoute = computed(
  () => adminStore.routes.find((r) => r.id === form.value.routeId) || null,
)

function chooseRoute(route) {
  form.value.routeId = route.id
  routeSearch.value = ''
}

function reset() {
  form.value = emptyForm()
  routeSearch.value = ''
  drafted.value = false
  editingId.value = null
  adminStore.error = null
}

// datetime-local works in local time without a zone.
function toIso(value) {
  return value ? new Date(value).toISOString() : null
}

function toLocalInput(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

// Called by the admin page when an admin clicks "Raise alert" on a reported
// hazard. A method rather than a prop, so clicking the same report again
// still resets the form after the admin has edited it.
function fillDraft(draft) {
  reset()
  form.value = { ...form.value, ...draft }
  drafted.value = true
  saved.value = ''
}

// Called when an admin clicks "Edit" on a published alert.
function editAlert(alert) {
  reset()
  editingId.value = alert.id
  form.value = {
    routeId: alert.route_id,
    severity: alert.severity,
    title: alert.title,
    message: alert.message || '',
    startsAt: toLocalInput(alert.starts_at),
    endsAt: toLocalInput(alert.ends_at),
  }
  saved.value = ''
}

defineExpose({ fillDraft, editAlert })

async function submit() {
  saving.value = true
  saved.value = ''
  const fields = {
    ...form.value,
    startsAt: toIso(form.value.startsAt),
    endsAt: toIso(form.value.endsAt),
  }
  const ok = await adminStore.saveAlert({ ...fields, createdBy: props.userId }, editingId.value)
  saving.value = false
  if (ok) {
    saved.value = editing.value ? 'Alert updated.' : 'Alert published.'
    reset()
  }
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <AdminNote v-if="editing" type="info" class="mt-0 mb-3">
      Editing a published alert. Changes show on the route page as soon as you save.
    </AdminNote>
    <AdminNote v-else-if="drafted" type="info" class="mt-0 mb-3">
      Filled in from hiker reports. Check the wording and dates, then publish.
    </AdminNote>

    <div class="row g-3">
      <div class="col-12 col-md-8 admin-field">
        <label for="alert-route" class="cairn-label">Route</label>
        <!-- Enter would otherwise submit the whole form while searching -->
        <input
          id="alert-route"
          v-model="routeSearch"
          type="search"
          class="cairn-input"
          placeholder="Route name or country"
          autocomplete="off"
          @keydown.enter.prevent
        />
        <ul v-if="routeMatches.length" class="admin-results">
          <li v-for="route in routeMatches" :key="route.id">
            <button type="button" @click="chooseRoute(route)">
              <span
                >{{ route.name }} <span class="admin-hint">{{ route.country }}</span></span
              >
            </button>
          </li>
        </ul>
        <p v-if="selectedRoute" class="mt-2 mb-0">
          Selected: <strong>{{ selectedRoute.name }}</strong>
          <span class="admin-hint"> {{ selectedRoute.country }}</span>
        </p>
      </div>

      <div class="col-12 col-md-4 admin-field">
        <label for="alert-severity" class="cairn-label">Severity</label>
        <select id="alert-severity" v-model="form.severity" class="cairn-input">
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="danger">Danger</option>
        </select>
      </div>

      <div class="col-12 admin-field">
        <label for="alert-title" class="cairn-label">Title</label>
        <input
          id="alert-title"
          v-model="form.title"
          type="text"
          class="cairn-input"
          maxlength="120"
          placeholder="e.g. River crossing at Camp 2 impassable after heavy rain"
        />
      </div>

      <div class="col-12 admin-field">
        <label for="alert-message" class="cairn-label">Details for hikers (optional)</label>
        <textarea id="alert-message" v-model="form.message" class="cairn-input" rows="3"></textarea>
      </div>

      <div class="col-12 col-md-6 admin-field">
        <label for="alert-starts" class="cairn-label">Starts</label>
        <input
          id="alert-starts"
          v-model="form.startsAt"
          type="datetime-local"
          class="cairn-input"
        />
        <span class="admin-hint">Leave blank to start now.</span>
      </div>

      <div class="col-12 col-md-6 admin-field">
        <label for="alert-ends" class="cairn-label">Ends</label>
        <input id="alert-ends" v-model="form.endsAt" type="datetime-local" class="cairn-input" />
        <span class="admin-hint">Required. For a long closure, set the route status instead.</span>
      </div>
    </div>

    <AdminNote v-if="adminStore.error" type="error">
      {{ adminStore.error }}
    </AdminNote>
    <AdminNote v-else-if="saved">{{ saved }}</AdminNote>

    <div class="admin-actions mt-3">
      <button type="submit" class="cairn-btn is-small" :disabled="saving">
        <template v-if="saving">Saving…</template>
        <template v-else>{{ editing ? 'Save changes' : 'Publish alert' }}</template>
      </button>
      <button v-if="editing || drafted" type="button" class="cairn-link" @click="reset">
        Cancel
      </button>
    </div>
  </form>
</template>

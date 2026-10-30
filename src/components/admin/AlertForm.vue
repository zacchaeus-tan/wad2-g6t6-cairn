<script setup>
import { computed, ref } from 'vue'
import { useAdminStore } from '@/controller/adminStore'
import { defaultAlertEnd } from '@/lib/alertDrafts'

const props = defineProps({
  userId: { type: String, required: true },
})

const adminStore = useAdminStore()
const saving = ref(false)
const saved = ref('') // message after a save
const drafted = ref(false) // filled in from a hiker report, so worth a check
const editingId = ref(null) // set while editing a published alert

const editing = computed(() => editingId.value !== null)

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

function reset() {
  form.value = emptyForm()
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
  const ok = editing.value
    ? await adminStore.updateAlert(editingId.value, fields)
    : await adminStore.createAlert({ ...fields, createdBy: props.userId })
  saving.value = false
  if (ok) {
    saved.value = editing.value ? 'Alert updated.' : 'Alert published.'
    reset()
  }
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <p v-if="editing" class="admin-note is-info mt-0 mb-3" role="status">
      Editing a published alert. Changes show on the route page as soon as you save.
    </p>
    <p v-else-if="drafted" class="admin-note is-info mt-0 mb-3" role="status">
      Filled in from hiker reports. Check the wording and dates, then publish.
    </p>

    <div class="row g-3">
      <div class="col-12 col-md-8 admin-field">
        <label for="alert-route" class="cairn-label">Route</label>
        <select id="alert-route" v-model="form.routeId" class="cairn-input">
          <option value="" disabled>Choose a route</option>
          <option v-for="route in adminStore.routes" :key="route.id" :value="route.id">
            {{ route.name }}<template v-if="route.country"> ({{ route.country }})</template>
          </option>
        </select>
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

    <p v-if="adminStore.error" class="admin-note is-error" role="alert">
      {{ adminStore.error }}
    </p>
    <p v-else-if="saved" class="admin-note" role="status">{{ saved }}</p>

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

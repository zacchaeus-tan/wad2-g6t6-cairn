<script setup>
import { ref } from 'vue'
import { useAdminStore } from '@/controller/adminStore'

const props = defineProps({
  userId: { type: String, required: true },
})

const adminStore = useAdminStore()
const saving = ref(false)
const saved = ref(false)
const drafted = ref(false) // filled in from a hiker report, so worth a check

function emptyForm() {
  return { routeId: '', severity: 'warning', title: '', message: '', startsAt: '', endsAt: '' }
}

const form = ref(emptyForm())

// Called by the admin page when an admin clicks "Raise alert" on a reported
// hazard. A method rather than a prop, so clicking the same report again
// still resets the form after the admin has edited it.
function fillDraft(draft) {
  form.value = { ...emptyForm(), ...draft }
  drafted.value = true
  saved.value = false
  adminStore.error = null
}

defineExpose({ fillDraft })

// datetime-local gives local time without a zone; convert it before saving.
function toIso(value) {
  return value ? new Date(value).toISOString() : null
}

async function submit() {
  saving.value = true
  saved.value = false
  const ok = await adminStore.createAlert({
    ...form.value,
    startsAt: toIso(form.value.startsAt),
    endsAt: toIso(form.value.endsAt),
    createdBy: props.userId,
  })
  saving.value = false
  if (ok) {
    form.value = emptyForm()
    drafted.value = false
    saved.value = true
  }
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <p v-if="drafted" class="alert alert-info small" role="status">
      Filled in from hiker reports. Check the wording and dates, then publish.
    </p>
    <div class="row g-3">
      <div class="col-12 col-md-8">
        <label for="alert-route" class="form-label">Route</label>
        <select id="alert-route" v-model="form.routeId" class="form-select">
          <option value="" disabled>Choose a route</option>
          <option v-for="route in adminStore.routes" :key="route.id" :value="route.id">
            {{ route.name }}<template v-if="route.country"> ({{ route.country }})</template>
          </option>
        </select>
      </div>

      <div class="col-12 col-md-4">
        <label for="alert-severity" class="form-label">Severity</label>
        <select id="alert-severity" v-model="form.severity" class="form-select">
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="danger">Danger</option>
        </select>
      </div>

      <div class="col-12">
        <label for="alert-title" class="form-label">Title</label>
        <input
          id="alert-title"
          v-model="form.title"
          type="text"
          class="form-control"
          maxlength="120"
          placeholder="e.g. River crossing at Camp 2 impassable after heavy rain"
        />
      </div>

      <div class="col-12">
        <label for="alert-message" class="form-label"
          >Details for hikers <span class="text-body-secondary">(optional)</span></label
        >
        <textarea
          id="alert-message"
          v-model="form.message"
          class="form-control"
          rows="3"
        ></textarea>
      </div>

      <div class="col-12 col-md-6">
        <label for="alert-starts" class="form-label"
          >Starts <span class="text-body-secondary">(blank = now)</span></label
        >
        <input
          id="alert-starts"
          v-model="form.startsAt"
          type="datetime-local"
          class="form-control"
        />
      </div>

      <div class="col-12 col-md-6">
        <label for="alert-ends" class="form-label"
          >Ends <span class="text-body-secondary">(blank = until removed)</span></label
        >
        <input id="alert-ends" v-model="form.endsAt" type="datetime-local" class="form-control" />
      </div>
    </div>

    <p v-if="adminStore.error" class="alert alert-danger mt-3 mb-0" role="alert">
      {{ adminStore.error }}
    </p>
    <p v-else-if="saved" class="alert alert-success mt-3 mb-0" role="status">Alert published.</p>

    <button type="submit" class="btn btn-success mt-3" :disabled="saving">
      {{ saving ? 'Publishing…' : 'Publish alert' }}
    </button>
  </form>
</template>

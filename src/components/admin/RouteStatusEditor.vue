<script setup>
import { computed, ref, watch } from 'vue'
import { useAdminStore } from '@/controller/adminStore'
import { safetyStatusClass } from '@/lib/format'

const adminStore = useAdminStore()
const search = ref('')
const selectedId = ref('')
const form = ref({ safetyStatus: 'open', safetyStatusNote: '' })
const saving = ref(false)
const saved = ref(false)

const matches = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return []
  return adminStore.routes
    .filter((r) => r.name?.toLowerCase().includes(term) || r.country?.toLowerCase().includes(term))
    .slice(0, 8)
})

const selected = computed(() => adminStore.routes.find((r) => r.id === selectedId.value) || null)

// Routes an admin has already marked as caution or closed.
const flaggedRoutes = computed(() =>
  adminStore.routes.filter((r) => r.safety_status && r.safety_status !== 'open'),
)

watch(selected, (route) => {
  saved.value = false
  adminStore.statusError = null
  form.value = {
    safetyStatus: route?.safety_status || 'open',
    safetyStatusNote: route?.safety_status_note || '',
  }
})

function choose(route) {
  selectedId.value = route.id
  search.value = ''
}

async function save() {
  saving.value = true
  saved.value = await adminStore.saveRouteSafety(selectedId.value, form.value)
  saving.value = false
}
</script>

<template>
  <div>
    <label for="status-search" class="form-label">Find a route</label>
    <input
      id="status-search"
      v-model="search"
      type="search"
      class="form-control"
      placeholder="Route name or country"
      autocomplete="off"
    />
    <div v-if="matches.length" class="list-group mt-1">
      <button
        v-for="route in matches"
        :key="route.id"
        type="button"
        class="list-group-item list-group-item-action d-flex justify-content-between"
        @click="choose(route)"
      >
        <span
          >{{ route.name }} <span class="text-body-secondary small">{{ route.country }}</span></span
        >
        <span class="badge" :class="safetyStatusClass(route.safety_status)">{{
          route.safety_status || 'not set'
        }}</span>
      </button>
    </div>

    <form v-if="selected" class="mt-4" novalidate @submit.prevent="save">
      <h3 class="h6">{{ selected.name }}</h3>
      <div class="btn-group mb-3" role="group" aria-label="Safety status">
        <template v-for="status in ['open', 'caution', 'closed']" :key="status">
          <input
            :id="`status-${status}`"
            v-model="form.safetyStatus"
            type="radio"
            class="btn-check"
            name="safety-status"
            :value="status"
          />
          <label class="btn btn-outline-secondary text-capitalize" :for="`status-${status}`">{{
            status
          }}</label>
        </template>
      </div>

      <label for="status-note" class="form-label d-block">
        Note for hikers
        <span v-if="form.safetyStatus === 'open'" class="text-body-secondary">(optional)</span>
      </label>
      <textarea
        id="status-note"
        v-model="form.safetyStatusNote"
        class="form-control"
        rows="2"
        placeholder="e.g. Closed by the park authority until the bridge is repaired"
      ></textarea>

      <p v-if="adminStore.statusError" class="alert alert-danger mt-3 mb-0" role="alert">
        {{ adminStore.statusError }}
      </p>
      <p v-else-if="saved" class="alert alert-success mt-3 mb-0" role="status">Status saved.</p>

      <button type="submit" class="btn btn-success mt-3" :disabled="saving">
        {{ saving ? 'Saving…' : 'Save status' }}
      </button>
    </form>

    <template v-if="flaggedRoutes.length">
      <h3 class="h6 text-uppercase text-body-secondary mt-4">Not open</h3>
      <ul class="list-group">
        <li v-for="route in flaggedRoutes" :key="route.id" class="list-group-item">
          <button type="button" class="btn btn-link p-0 text-start" @click="choose(route)">
            {{ route.name }}
          </button>
          <span class="badge ms-2" :class="safetyStatusClass(route.safety_status)">{{
            route.safety_status
          }}</span>
          <span v-if="route.safety_status_note" class="small text-body-secondary">
            — {{ route.safety_status_note }}</span
          >
        </li>
      </ul>
    </template>
  </div>
</template>

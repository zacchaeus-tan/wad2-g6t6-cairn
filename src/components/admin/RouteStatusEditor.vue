<script setup>
import { computed, ref, watch } from 'vue'
import { motion } from 'motion-v'
import { useAdminStore } from '@/controller/adminStore'
import { modifierClass } from '@/lib/format'
import { fadeMotion } from '@/lib/motion'
import AdminNote from '@/components/admin/AdminNote.vue'

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
    <div class="admin-field">
      <label for="status-search" class="cairn-label">Find a route</label>
      <input
        id="status-search"
        v-model="search"
        type="search"
        class="cairn-input"
        placeholder="Route name or country"
        autocomplete="off"
      />
    </div>
    <ul v-if="matches.length" class="admin-results">
      <li v-for="route in matches" :key="route.id">
        <button type="button" @click="choose(route)">
          <span
            >{{ route.name }} <span class="admin-hint">{{ route.country }}</span></span
          >
          <span class="admin-tag" :class="modifierClass(route.safety_status)">{{
            route.safety_status || 'not set'
          }}</span>
        </button>
      </li>
    </ul>

    <motion.form
      v-if="selected"
      :key="selected.id"
      v-bind="fadeMotion"
      class="mt-4"
      novalidate
      @submit.prevent="save"
    >
      <h3 class="h5 fw-bold mb-3">{{ selected.name }}</h3>
      <div class="admin-choice mb-3" role="radiogroup" aria-label="Safety status">
        <template v-for="status in ['open', 'caution', 'closed']" :key="status">
          <input
            :id="`status-${status}`"
            v-model="form.safetyStatus"
            type="radio"
            name="safety-status"
            :value="status"
          />
          <label :for="`status-${status}`" :class="{ 'is-active': form.safetyStatus === status }">{{
            status
          }}</label>
        </template>
      </div>

      <div class="admin-field">
        <label for="status-note" class="cairn-label">
          Note for hikers<template v-if="form.safetyStatus === 'open'"> (optional)</template>
        </label>
        <textarea
          id="status-note"
          v-model="form.safetyStatusNote"
          class="cairn-input"
          rows="2"
          placeholder="e.g. Closed by the park authority until the bridge is repaired"
        ></textarea>
      </div>

      <AdminNote v-if="adminStore.statusError" type="error">
        {{ adminStore.statusError }}
      </AdminNote>
      <AdminNote v-else-if="saved">Status saved.</AdminNote>

      <button type="submit" class="cairn-btn is-small mt-3" :disabled="saving">
        {{ saving ? 'Saving…' : 'Save status' }}
      </button>
    </motion.form>

    <div v-if="flaggedRoutes.length" class="admin-group mt-4">
      <h3 class="cairn-label">Not open</h3>
      <ul class="admin-list">
        <li v-for="route in flaggedRoutes" :key="route.id" class="admin-item">
          <div class="admin-item-body">
            <p>
              <span class="admin-tag" :class="modifierClass(route.safety_status)">{{
                route.safety_status
              }}</span>
              <button type="button" class="cairn-link" @click="choose(route)">
                {{ route.name }}
              </button>
            </p>
            <p v-if="route.safety_status_note" class="cairn-fine">
              {{ route.safety_status_note }}
            </p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { useAdminStore } from '@/controller/adminStore'
import { modifierClass } from '@/lib/format'
import { fadeMotion, rowMotion } from '@/lib/motion'
import AdminNote from '@/components/admin/AdminNote.vue'

const emit = defineEmits(['choose-from-list'])

const adminStore = useAdminStore()
const search = ref('')
const selectedId = ref('')
const form = ref({ safetyStatus: 'open', safetyStatusNote: '' })
const saving = ref(false)
const saved = ref(false)

const selected = computed(() => adminStore.routes.find((r) => r.id === selectedId.value))

// The box holds the chosen route's name until it's saved, so don't list it as a search.
const matches = computed(() =>
  search.value === selected.value?.name ? [] : adminStore.searchRoutes(search.value),
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
  search.value = route.name
}

// The "Not open" list can be long, so the admin page jumps back up to the form.
function chooseFromList(route) {
  choose(route)
  emit('choose-from-list')
}

async function save() {
  saving.value = true
  saved.value = await adminStore.saveRouteSafety(selectedId.value, form.value)
  saving.value = false
  if (saved.value) search.value = ''
}
</script>

<template>
  <div class="row g-5">
    <div class="col-12 col-lg-7">
      <h3 class="admin-subhead">Set a status</h3>
      <div class="admin-form">
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
        <motion.ul v-if="matches.length" v-bind="fadeMotion" class="admin-results">
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
        </motion.ul>

        <motion.form
          v-if="selected"
          :key="selected.id"
          v-bind="fadeMotion"
          class="mt-4"
          novalidate
          @submit.prevent="save"
        >
          <p class="admin-chosen">{{ selected.name }}</p>
          <div class="admin-choice mb-3" role="radiogroup" aria-label="Safety status">
            <template v-for="status in ['open', 'caution', 'closed']" :key="status">
              <input
                :id="`status-${status}`"
                v-model="form.safetyStatus"
                type="radio"
                name="safety-status"
                :value="status"
              />
              <label
                :for="`status-${status}`"
                :class="{ 'is-active': form.safetyStatus === status }"
                >{{ status }}</label
              >
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

          <button type="submit" class="cairn-btn mt-4" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save status' }}
          </button>
        </motion.form>
      </div>
    </div>

    <div class="col-12 col-lg-5">
      <h3 class="admin-subhead">Not open</h3>
      <p v-if="!adminStore.notOpenRoutes.length" class="admin-empty">Every route is open.</p>
      <!-- Starts shown, as the tab may be hidden on load (see AttentionGroup) -->
      <AnimatePresence v-else :initial="false" as="ul" class="admin-list">
        <motion.li
          v-for="route in adminStore.notOpenRoutes"
          :key="route.id"
          v-bind="rowMotion"
          layout="position"
          class="admin-item"
        >
          <div class="admin-item-body">
            <p>
              <span class="admin-tag" :class="modifierClass(route.safety_status)">{{
                route.safety_status
              }}</span>
              <button type="button" class="cairn-link" @click="chooseFromList(route)">
                {{ route.name }}
              </button>
            </p>
            <p v-if="route.safety_status_note" class="cairn-fine">
              {{ route.safety_status_note }}
            </p>
          </div>
        </motion.li>
      </AnimatePresence>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAdminStore } from '@/controller/adminStore'
import AdminNote from '@/components/admin/AdminNote.vue'

const props = defineProps({
  route: { type: Object, required: true },
  saving: { type: Boolean, default: false },
})

// The list does the saving: a fully fixed route leaves the list, which removes
// this form, so it could not report the result itself.
const emit = defineEmits(['save', 'cancel'])

const adminStore = useAdminStore()

// Starts with what the route already has; a field left blank is not changed.
const form = ref({
  country: props.route.country ?? '',
  distance_km: props.route.distance_km ?? '',
  elevation_gain_m: props.route.elevation_gain_m ?? '',
  altitude_m: props.route.altitude_m ?? '',
  latitude: props.route.latitude ?? '',
  longitude: props.route.longitude ?? '',
})

const NUMBER_FIELDS = [
  { key: 'distance_km', label: 'Distance (km)' },
  { key: 'elevation_gain_m', label: 'Elevation gain (m)' },
  { key: 'altitude_m', label: 'Maximum altitude (m)' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
]
</script>

<template>
  <form novalidate @submit.prevent="emit('save', form)">
    <p class="admin-hint mb-2">
      Use official sources. Leave a field blank if you can't confirm it.
    </p>
    <div class="row g-2">
      <div class="col-12 col-sm-6 admin-field">
        <label :for="`info-country-${route.id}`" class="cairn-label">Country</label>
        <input :id="`info-country-${route.id}`" v-model="form.country" class="cairn-input" />
      </div>
      <div v-for="field in NUMBER_FIELDS" :key="field.key" class="col-12 col-sm-6 admin-field">
        <label :for="`info-${field.key}-${route.id}`" class="cairn-label">{{ field.label }}</label>
        <input
          :id="`info-${field.key}-${route.id}`"
          v-model="form[field.key]"
          type="number"
          step="any"
          class="cairn-input"
        />
      </div>
    </div>

    <AdminNote v-if="adminStore.infoError" type="error">
      {{ adminStore.infoError }}
    </AdminNote>

    <div class="admin-actions mt-3">
      <button type="submit" class="cairn-btn is-small" :disabled="saving">
        {{ saving ? 'Saving…' : 'Save route info' }}
      </button>
      <button type="button" class="cairn-link" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>

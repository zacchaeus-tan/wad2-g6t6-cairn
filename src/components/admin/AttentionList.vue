<script setup>
import { RouterLink } from 'vue-router'
import { useAdminStore } from '@/controller/adminStore'
import { alertClass, difficultyLabel, formatDate, hazardClass } from '@/lib/format'
import { draftFromHazardRoute, draftFromPointWarning } from '@/lib/alertDrafts'

const emit = defineEmits(['raise-alert'])

const adminStore = useAdminStore()
</script>

<template>
  <div>
    <p v-if="!adminStore.attentionCount" class="alert alert-success mb-0">
      Nothing needs attention right now.
    </p>

    <template v-if="adminStore.pendingAlerts.length">
      <h3 class="h6 text-uppercase text-body-secondary mt-2">Alerts waiting for approval</h3>
      <ul class="list-unstyled mb-4">
        <li
          v-for="alert in adminStore.pendingAlerts"
          :key="alert.id"
          class="alert d-flex flex-wrap gap-2 justify-content-between align-items-start"
          :class="alertClass(alert.severity)"
        >
          <div>
            <strong>{{ alert.title }}</strong>
            <span class="small"> · {{ alert.routes?.name }} · from {{ alert.source }}</span>
            <span v-if="alert.ends_at" class="small"> · {{ formatDate(alert.starts_at) }}</span>
            <p v-if="alert.message" class="mb-0 small">{{ alert.message }}</p>
          </div>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-success" @click="adminStore.setAlertStatus(alert.id, 'active')">
              Publish
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="adminStore.setAlertStatus(alert.id, 'dismissed')">
              Dismiss
            </button>
          </div>
        </li>
      </ul>
    </template>

    <template v-if="adminStore.openHazardRoutes.length">
      <h3 class="h6 text-uppercase text-body-secondary mt-2">Community hazard reports</h3>
      <ul class="list-group mb-4">
        <li
          v-for="route in adminStore.openHazardRoutes"
          :key="route.id"
          class="list-group-item d-flex flex-wrap gap-2 justify-content-between align-items-center"
        >
          <div>
            <span class="badge me-2" :class="hazardClass(route.community_hazard_level)">
              {{ route.community_hazard_level }}
            </span>
            <RouterLink :to="{ name: 'route-detail', params: { id: route.id } }">{{ route.name }}</RouterLink>
            <span v-if="route.community_hazard_note" class="small text-body-secondary">
              — {{ route.community_hazard_note }}
            </span>
          </div>
          <button type="button" class="btn btn-sm btn-outline-primary" @click="emit('raise-alert', draftFromHazardRoute(route))">
            Raise alert
          </button>
        </li>
      </ul>
    </template>

    <template v-if="adminStore.openPointWarnings.length">
      <h3 class="h6 text-uppercase text-body-secondary mt-2">Hazards confirmed at checkpoints</h3>
      <ul class="list-group mb-4">
        <li
          v-for="warning in adminStore.openPointWarnings"
          :key="`${warning.point_id}-${warning.category}`"
          class="list-group-item d-flex flex-wrap gap-2 justify-content-between align-items-center"
        >
          <div>
            <strong>{{ warning.label }}</strong>
            at {{ warning.point_name }}<span v-if="warning.day_number"> (day {{ warning.day_number }})</span>
            on
            <RouterLink :to="{ name: 'route-detail', params: { id: warning.route_id } }">
              {{ adminStore.routeNames.get(warning.route_id) || 'a route' }}
            </RouterLink>
            <p class="mb-0 small text-body-secondary">
              {{ warning.reporter_count }} hikers, last on {{ formatDate(warning.last_reported_at) }}
              <template v-if="warning.latest_note">: “{{ warning.latest_note }}”</template>
            </p>
          </div>
          <button type="button" class="btn btn-sm btn-outline-primary" @click="emit('raise-alert', draftFromPointWarning(warning))">
            Raise alert
          </button>
        </li>
      </ul>
    </template>

    <template v-if="adminStore.difficultyMismatches.length">
      <h3 class="h6 text-uppercase text-body-secondary mt-2">Difficulty may need regrading</h3>
      <ul class="list-group mb-0">
        <li v-for="route in adminStore.difficultyMismatches" :key="route.id" class="list-group-item">
          <RouterLink :to="{ name: 'route-detail', params: { id: route.id } }">{{ route.name }}</RouterLink>
          is graded {{ difficultyLabel(route.official_difficulty) }}, but
          {{ route.review_count }} {{ route.review_count === 1 ? 'hiker rates' : 'hikers rate' }} it closer to
          {{ difficultyLabel(route.effective_difficulty) }}
          ({{ route.gap > 0 ? 'harder' : 'easier' }}).
        </li>
      </ul>
    </template>
  </div>
</template>

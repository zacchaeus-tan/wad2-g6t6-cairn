<script setup>
import { RouterLink } from 'vue-router'
import { useAdminStore } from '@/controller/adminStore'
import { alertClass, formatDate } from '@/lib/format'

const adminStore = useAdminStore()

function isScheduled(alert) {
  return new Date(alert.starts_at).getTime() > Date.now()
}
</script>

<template>
  <p v-if="!adminStore.liveAlerts.length" class="text-body-secondary mb-0">
    No alerts are published.
  </p>

  <ul v-else class="list-unstyled mb-0">
    <li
      v-for="alert in adminStore.liveAlerts"
      :key="alert.id"
      class="alert d-flex flex-wrap gap-2 justify-content-between align-items-start"
      :class="alertClass(alert.severity)"
    >
      <div>
        <strong>{{ alert.title }}</strong>
        <span class="small">
          ·
          <RouterLink :to="{ name: 'route-detail', params: { id: alert.route_id } }">{{
            alert.routes?.name
          }}</RouterLink>
        </span>
        <p v-if="alert.message" class="mb-1 small">{{ alert.message }}</p>
        <p class="mb-0 small">
          <template v-if="isScheduled(alert)">Starts {{ formatDate(alert.starts_at) }}</template>
          <template v-else>Since {{ formatDate(alert.starts_at) }}</template>
          <template v-if="alert.ends_at"> · until {{ formatDate(alert.ends_at) }}</template>
        </p>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-outline-dark"
        @click="adminStore.setAlertStatus(alert.id, 'dismissed')"
      >
        Take down
      </button>
    </li>
  </ul>
</template>

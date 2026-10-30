<script setup>
import { RouterLink } from 'vue-router'
import { useAdminStore } from '@/controller/adminStore'
import { formatDate } from '@/lib/format'

const emit = defineEmits(['edit-alert'])

const adminStore = useAdminStore()

function isScheduled(alert) {
  return new Date(alert.starts_at).getTime() > Date.now()
}

// "Published by Mei", or "Published by Mei · changed by Ravi" after an edit.
function byline(alert) {
  const parts = []
  if (alert.creator?.display_name) parts.push(`Published by ${alert.creator.display_name}`)
  if (alert.editor?.display_name && alert.updated_by !== alert.created_by) {
    parts.push(`changed by ${alert.editor.display_name}`)
  }
  return parts.join(' · ')
}
</script>

<template>
  <div>
    <p v-if="adminStore.lastTakenDown" class="admin-note mt-0 mb-3" role="status">
      Taken down: {{ adminStore.lastTakenDown.title }}.
      <button type="button" class="cairn-link ms-1" @click="adminStore.undoTakeDown()">Undo</button>
    </p>

    <p v-if="!adminStore.liveAlerts.length" class="admin-empty">No alerts are published.</p>

    <ul v-else class="admin-list">
      <li v-for="alert in adminStore.liveAlerts" :key="alert.id" class="admin-item">
        <div class="admin-item-body admin-alert" :class="`is-${alert.severity}`">
          <p>
            <strong>{{ alert.title }}</strong>
          </p>
          <p class="cairn-fine">
            <RouterLink :to="{ name: 'route-detail', params: { id: alert.route_id } }">{{
              alert.routes?.name
            }}</RouterLink>
            ·
            <template v-if="isScheduled(alert)">starts {{ formatDate(alert.starts_at) }}</template>
            <template v-else>since {{ formatDate(alert.starts_at) }}</template>
            <template v-if="alert.ends_at"> · until {{ formatDate(alert.ends_at) }}</template>
          </p>
          <p v-if="alert.message" class="cairn-fine">{{ alert.message }}</p>
          <p v-if="byline(alert)" class="admin-hint">{{ byline(alert) }}</p>
        </div>
        <div class="admin-actions">
          <button
            type="button"
            class="cairn-btn is-ghost is-small"
            @click="emit('edit-alert', alert)"
          >
            Edit
          </button>
          <button type="button" class="cairn-link" @click="adminStore.takeDownAlert(alert)">
            Take down
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { AnimatePresence, motion } from 'motion-v'
import { useAdminStore } from '@/controller/adminStore'
import { formatDate, modifierClass } from '@/lib/format'
import { rowMotion } from '@/lib/motion'
import AdminNote from '@/components/admin/AdminNote.vue'

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
    <AdminNote v-if="adminStore.lastTakenDown" class="mt-0 mb-3">
      Taken down: {{ adminStore.lastTakenDown.title }}.
      <button type="button" class="cairn-link ms-1" @click="adminStore.undoTakeDown()">Undo</button>
    </AdminNote>

    <p v-if="!adminStore.liveAlerts.length" class="admin-empty">No alerts are published.</p>

    <AnimatePresence v-else as="ul" class="admin-list">
      <motion.li
        v-for="alert in adminStore.liveAlerts"
        :key="alert.id"
        v-bind="rowMotion"
        layout="position"
        class="admin-item"
      >
        <div class="admin-item-body admin-alert" :class="modifierClass(alert.severity)">
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
      </motion.li>
    </AnimatePresence>
  </div>
</template>

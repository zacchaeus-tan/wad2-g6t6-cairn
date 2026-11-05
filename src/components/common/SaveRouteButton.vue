<script setup>
import { useUserRoutesStore } from '@/controller/userRoutesStore'
import { computed, ref } from 'vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import TickIcon from '@/components/common/TickIcon.vue'
// Save and completed buttons for a route. Reads the route's status from the user routes
// store and saves through it.

const userRoutesStore = useUserRoutesStore()

const props = defineProps({
  routeId: { type: String, required: true },
  showCompleted: { type: Boolean, default: true }, // off where the row shows its own status
})

// route status
const routeStatus = computed(() => {
  if (userRoutesStore.current?.route_id === props.routeId) return userRoutesStore.current.status
  return userRoutesStore.savedRoutes.find((r) => r.route_id === props.routeId)?.status ?? null
})
const isSaved = computed(() => routeStatus.value === 'saved')
const isCompleted = computed(() => routeStatus.value === 'completed')

async function onToggleRouteSaved() {
  if (isCompleted.value) return
  if (!isSaved.value) {
    await userRoutesStore.setStatus(props.routeId, 'saved')
    return
  }
  await userRoutesStore.remove(props.routeId)
}

// marking a route done
const confirmingCompleted = ref(false)

async function routeCompleted() {
  confirmingCompleted.value = false
  if (isCompleted.value) return
  await userRoutesStore.setStatus(props.routeId, 'completed')
}
</script>

<template>
  <div v-if="!isCompleted || showCompleted" class="save-route">
    <template v-if="!isCompleted">
      <button
        type="button"
        class="cairn-btn is-small"
        :class="{ 'is-ghost': !isSaved }"
        :aria-pressed="isSaved"
        @click="onToggleRouteSaved"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 3h12v18l-6-4-6 4z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
            :fill="isSaved ? 'currentColor' : 'none'"
          />
        </svg>
        {{ isSaved ? 'Saved' : 'Save route' }}
      </button>
      <button
        v-if="isSaved"
        type="button"
        class="cairn-btn is-ghost is-small"
        @click="confirmingCompleted = true"
      >
        Mark as completed
      </button>
    </template>
    <span v-else class="save-route-completed">
      <TickIcon />
      Completed
    </span>
    <ConfirmDialog
      :open="confirmingCompleted"
      title="Have you completed this hike?"
      confirm-label="Mark as completed"
      @confirm="routeCompleted"
      @cancel="confirmingCompleted = false"
    >
      It will count towards your hike totals, and you can't undo this.
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.save-route {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

/* Outlined in the colour around it, so it works on a dark photo and on a light page */
.save-route .cairn-btn.is-ghost:not(:hover) {
  color: inherit;
  border-color: currentColor;
}

.save-route-completed {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}

.save-route-completed svg {
  width: 18px;
  height: 18px;
}
</style>

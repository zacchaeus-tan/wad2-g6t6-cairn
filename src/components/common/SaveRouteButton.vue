<script setup>
import { useUserRoutesStore } from '@/controller/userRoutesStore'
import { computed } from 'vue'
// Save and completed buttons for a route. The parent owns the route's status
// and does the saving when these emit.

const userRoutesStore = useUserRoutesStore()

const props = defineProps({
  routeId:{type:String, required:true},
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
async function routeCompleted() {
  if (isCompleted.value) return
  if (!confirm('Have you completed the hike?')) return
  await userRoutesStore.setStatus(props.routeId, 'completed')
}


</script>

<template>
  <div class="save-route">
    <span v-if="isCompleted" class="completed">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
      Completed
    </span>

    <template v-else>
      <button
        type="button"
        class="cairn-btn is-small"
        :class="isSaved ? 'is-saved' : 'is-outline'"
        :aria-pressed="isSaved"
        @click="onToggleRouteSaved"
      >
        <svg
          viewBox="0 0 24 24"
          :fill="isSaved ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M6 3h12v18l-6-4.5L6 21z" />
        </svg>
        {{ isSaved ? 'Saved' : 'Save route' }}
      </button>
      <button v-if="isSaved" type="button" class="cairn-btn is-small is-outline" @click="routeCompleted">
        Mark as completed
      </button>
    </template>
  </div>
</template>

<style scoped>
.save-route {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

/* Takes the text colour around it, so it works on the dark banner and on light pages */
.is-outline:not(:hover) {
  background: transparent;
  border-color: currentColor;
  color: inherit;
}

.is-saved:not(:hover) {
  background: var(--pine);
  border-color: var(--pine);
  color: var(--paper);
}

.completed {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}
</style>
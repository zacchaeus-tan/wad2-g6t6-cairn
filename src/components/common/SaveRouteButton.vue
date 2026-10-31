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
  <div class="d-flex flex-wrap align-items-center gap-2">
    <button
      type="button"
      class="btn btn-sm"
      :class="isSaved ? 'btn-warning' : 'btn-outline-warning'"
      :hidden="isCompleted"
      :disabled="isCompleted"
      :aria-pressed="isSaved"
      @click="onToggleRouteSaved"
    >
      {{ isSaved ? '⛊ Saved' : '⛉ Save route' }}
    </button>
    <button
      type="button"
      class="btn btn-sm btn-outline-success"
      :hidden="!isSaved || isCompleted"
      :disabled="isCompleted"
      @click="routeCompleted"
    >
      Mark as completed
    </button>
    <span class="completed" :hidden="!isCompleted">✓ Completed</span>
  </div>
</template>

<style scoped>
.completed {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}

</style>
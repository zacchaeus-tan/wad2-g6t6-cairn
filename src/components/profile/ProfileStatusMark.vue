<script setup>
import { ref, watch } from 'vue'
import TickIcon from '@/components/common/TickIcon.vue'

// A route's status as a shape, beside its word: a bookmark in an outlined box when saved,
// a tick in a pine box when completed.
const props = defineProps({
  completed: { type: Boolean, default: false },
})

// The tick only draws itself when the route becomes completed, not each time it's shown
const justCompleted = ref(false)
watch(
  () => props.completed,
  (completed) => (justCompleted.value = completed),
)
</script>

<template>
  <span
    class="status-mark"
    :class="{ 'is-completed': completed, 'is-drawing': justCompleted }"
    aria-hidden="true"
  >
    <TickIcon v-if="completed" />
    <svg v-else viewBox="0 0 24 24">
      <path d="M6 3h12v18l-6-4-6 4z" fill="none" stroke="currentColor" stroke-width="2.5" />
    </svg>
  </span>
</template>

<style scoped>
.status-mark {
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  border: 2px solid var(--ink);
  color: var(--ink);
}

.status-mark.is-completed {
  border-color: var(--pine);
  background: var(--pine);
  color: var(--paper);
}

.status-mark svg {
  width: 14px;
  height: 14px;
}

.status-mark.is-drawing :deep(path) {
  stroke-dasharray: 1;
  animation: status-mark-draw 0.5s var(--ease) both;
}

@keyframes status-mark-draw {
  from {
    stroke-dashoffset: 1;
  }

  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-mark.is-drawing :deep(path) {
    animation: none;
  }
}
</style>

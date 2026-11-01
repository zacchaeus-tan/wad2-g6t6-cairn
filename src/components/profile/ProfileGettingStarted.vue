<script>
// Which steps each user had finished when last shown. Outside the component so it outlives the
// page: a step finished on the quiz draws its tick on the way back, and a reload draws none.
const seenByUser = new Map()
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { motion } from 'motion-v'
import { newlyDoneSteps } from '@/lib/profileTools'
import { fadeMotion } from '@/lib/motion'
import TickIcon from '@/components/common/TickIcon.vue'

const props = defineProps({
  steps: { type: Array, required: true },
  ready: { type: Boolean, default: false },
  userId: { type: String, default: '' },
})

const doneCount = computed(() => props.steps.filter((step) => step.done).length)
const visible = computed(() => props.ready && doneCount.value < props.steps.length)

const drawing = ref([])

watch(
  () => (props.ready ? props.steps.filter((step) => step.done).map((step) => step.key) : null),
  (doneKeys) => {
    if (!doneKeys) return
    drawing.value = newlyDoneSteps(props.steps, seenByUser.get(props.userId) ?? null)
    seenByUser.set(props.userId, new Set(doneKeys))
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <motion.section
    v-if="visible"
    v-bind="fadeMotion"
    class="getting-started"
    aria-labelledby="getting-started-title"
  >
    <div class="getting-started-head">
      <h2 id="getting-started-title" class="cairn-headline">Getting started</h2>
      <p class="cairn-data">{{ doneCount }} of {{ steps.length }}</p>
    </div>
    <ul class="getting-started-list">
      <li v-for="step in steps" :key="step.key" class="getting-started-step">
        <span
          class="getting-started-box"
          :class="{ 'is-done': step.done, 'is-drawing': drawing.includes(step.key) }"
          aria-hidden="true"
        >
          <TickIcon v-if="step.done" />
        </span>
        <span v-if="step.done">
          {{ step.label }}<span class="cairn-visually-hidden"> (done)</span>
        </span>
        <RouterLink v-else class="cairn-link getting-started-link" :to="step.to">
          {{ step.label }}
        </RouterLink>
      </li>
    </ul>
  </motion.section>
</template>

<style scoped>
.getting-started {
  display: grid;
  gap: 16px;
}

.getting-started-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px 16px;
}

.getting-started-head .cairn-data {
  font-size: 15px;
  font-weight: 600;
}

.getting-started-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 2px solid var(--ink);
  border-bottom: 2px solid var(--ink);
}

.getting-started-step {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 4px 0;
  font-size: 16px;
  font-weight: 700;
}

.getting-started-step + .getting-started-step {
  border-top: 1px solid var(--granite-200);
}

.getting-started-box {
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  border: 2px solid var(--ink);
}

.getting-started-box.is-done {
  border-color: var(--pine);
  background: var(--pine);
  color: var(--paper);
}

.getting-started-box svg {
  width: 14px;
  height: 14px;
}

.getting-started-box.is-drawing :deep(path) {
  stroke-dasharray: 1;
  animation: getting-started-draw 0.5s var(--ease) both;
}

@keyframes getting-started-draw {
  from {
    stroke-dashoffset: 1;
  }

  to {
    stroke-dashoffset: 0;
  }
}

.getting-started-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}
</style>

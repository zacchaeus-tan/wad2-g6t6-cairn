<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
// Motion for Vue (https://motion.dev, MIT) drops the stones into place
import { AnimatePresence, motion } from 'motion-v'
import { EASE_OUT } from '@/lib/motion'

// A cairn that grows as loading progresses, with a line of text under it while there's a message.
// Without a progress it builds and clears on a loop, for pages that can't tell how far along they are.
const props = defineProps({
  // 0 to 100
  progress: { type: Number, default: null },
  message: { type: String, default: '' },
  // On the light paper pages, where the usual lichen text is too faint
  onLight: Boolean,
})

const looping = computed(() => props.progress === null)

// The cairn from its biggest stone at the bottom up to the smallest
const stones = [
  { cx: 60, cy: 84, rx: 46, ry: 11, fill: '#8d8f88' },
  { cx: 58, cy: 66, rx: 33, ry: 10, fill: '#a8a89f' },
  { cx: 62, cy: 49, rx: 24, ry: 9, fill: '#969890' },
  { cx: 59, cy: 33, rx: 16, ry: 7.5, fill: '#bcbbb1' },
  { cx: 60, cy: 20, rx: 9, ry: 5.5, fill: '#d3d1c6' },
]

// On a loop, one stone goes down each step, the full cairn holds for a step, then it clears
const loopStep = ref(0)
let loopTimer = null

onMounted(() => {
  if (looping.value) {
    loopTimer = setInterval(() => {
      loopStep.value = (loopStep.value + 1) % (stones.length + 2)
    }, 400)
  }
})

onBeforeUnmount(() => clearInterval(loopTimer))

// The first stone goes down as soon as loading makes any progress
const placedStones = computed(() => {
  if (looping.value) return loopStep.value > stones.length ? [] : stones.slice(0, loopStep.value)
  return stones.slice(0, Math.ceil((props.progress / 100) * stones.length))
})
</script>

<template>
  <div class="cairn-loader">
    <svg
      class="cairn-loader-stones"
      viewBox="0 0 120 96"
      role="progressbar"
      :aria-label="message"
      :aria-hidden="!message"
      :aria-valuenow="progress"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <!-- Each stone drops into place, and on a loop they all fade away together -->
      <AnimatePresence as="g">
        <motion.ellipse
          v-for="stone in placedStones"
          :key="stone.cy"
          v-bind="stone"
          :initial="{ opacity: 0, y: -16 }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0 }"
          :transition="{ duration: 0.45, ease: EASE_OUT }"
        />
      </AnimatePresence>
    </svg>

    <p
      v-if="message"
      class="cairn-loader-text"
      :class="{ 'is-on-light': onLight }"
      role="status"
      data-testid="cairn-loading"
    >
      <span>{{ message }}</span>
      <!-- The progress bar already gives the number, so screen readers don't hear every change -->
      <span v-if="!looping" class="cairn-data" aria-hidden="true">{{ progress }}%</span>
    </p>
  </div>
</template>

<style scoped>
.cairn-loader {
  display: grid;
  justify-items: center;
  gap: 8px;
}

.cairn-loader-stones {
  width: 110px;
  height: 88px;
  overflow: visible;
}

.cairn-loader-text {
  display: flex;
  gap: 10px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--lichen);
}

.cairn-loader-text.is-on-light {
  color: var(--granite-500);
}

.cairn-loader-text .cairn-data {
  font-weight: 600;
  letter-spacing: 0;
}
</style>

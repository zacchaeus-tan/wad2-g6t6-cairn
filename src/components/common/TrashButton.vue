<script setup>
import { motion } from 'motion-v'
import { EASE_OUT } from '@/lib/motion'

// A red bin button for deleting something. Its lid lifts open on hover or keyboard focus.
defineProps({
  label: { type: String, required: true }, // what it deletes, shown as a tooltip
})

// The lid tips up from its left end
const LID = {
  closed: { rotate: 0, y: 0 },
  open: { rotate: -24, y: -1.5 },
}
</script>

<template>
  <motion.button
    type="button"
    class="trash-button d-inline-flex align-items-center justify-content-center"
    :aria-label="label"
    :title="label"
    initial="closed"
    while-hover="open"
    while-focus="open"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <motion.g
        :variants="LID"
        :transition="{ duration: 0.25, ease: EASE_OUT }"
        :style="{ originX: 0, originY: 1 }"
      >
        <path d="M4 7h16" />
        <path d="M9 7V4.5h6V7" />
      </motion.g>
      <path d="M6 7l1 13h10l1-13" />
      <path d="M10 11v5.5M14 11v5.5" />
    </svg>
  </motion.button>
</template>

<style scoped>
/* 44px, the height of a small Cairn button, so it lines up beside one */
.trash-button {
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #b42318;
  cursor: pointer;
}

.trash-button:hover {
  background: #fdecea;
}

.trash-button:focus-visible {
  outline: 3px solid var(--lake);
  outline-offset: 2px;
}

.trash-button svg {
  width: 26px;
  height: 26px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  overflow: visible;
}
</style>

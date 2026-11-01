<script setup>
import { computed } from 'vue'
import { motion, useReducedMotion } from 'motion-v'

// A pine marker with rough, hand-drawn edges behind its content, after Magic UI's
// Highlighter. It sweeps along the text from the left when active changes.
const props = defineProps({
  active: { type: Boolean, default: true },
  faded: { type: Boolean, default: false }, // a lighter marker, for previewing a choice
})

const reduceMotion = useReducedMotion()

const shown = computed(() => ({ scaleX: props.active ? 1 : 0, opacity: props.faded ? 0.4 : 1 }))
const transition = computed(() =>
  reduceMotion.value ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 26 },
)
</script>

<template>
  <span class="text-highlighter">
    <motion.span
      class="text-highlighter-marker"
      aria-hidden="true"
      :initial="false"
      :animate="shown"
      :transition="transition"
      :style="{ transformOrigin: 'left' }"
    />
    <span class="text-highlighter-content"><slot /></span>
  </span>
</template>

<style scoped>
.text-highlighter {
  position: relative;
  display: inline-block;
}

.text-highlighter-marker {
  position: absolute;
  inset: -3%;
  background: var(--pine);
  clip-path: polygon(
    1% 2%,
    12% 0,
    24% 2.5%,
    37% 0.5%,
    51% 3%,
    64% 0,
    78% 2%,
    90% 0.5%,
    99% 2.5%,
    100% 14%,
    98% 27%,
    100% 41%,
    98.5% 55%,
    100% 69%,
    98% 83%,
    99.5% 98%,
    87% 100%,
    74% 97.5%,
    61% 99.5%,
    47% 97%,
    33% 100%,
    20% 98%,
    8% 99.5%,
    0.5% 97%,
    2% 84%,
    0 70%,
    2.5% 56%,
    0.5% 42%,
    2% 28%,
    0 14%
  );
}

.text-highlighter-content {
  position: relative;
}
</style>

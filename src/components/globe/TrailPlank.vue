<script setup>
// Motion for Vue (https://motion.dev, MIT) blends the plank's colour on hover and keyboard focus
import { motion } from 'motion-v'

// A wooden plank button with a point on its right end. Listeners and attributes set on
// <TrailPlank> go straight to the button; the parent sets its size.
defineProps({
  big: { type: Boolean, default: false },
  // Stays pine, as a fingerpost does for the country the globe last flew to
  selected: { type: Boolean, default: false },
  hoverColour: { type: String, default: 'var(--pine)' },
})
</script>

<template>
  <motion.button
    type="button"
    class="trail-plank"
    :class="{ 'is-big': big }"
    :initial="false"
    :animate="{ backgroundColor: selected ? 'var(--pine)' : 'var(--trail)' }"
    :while-hover="{ backgroundColor: hoverColour }"
    :while-focus="{ backgroundColor: 'var(--pine)' }"
    :transition="{ duration: 0.15 }"
  >
    <slot />
  </motion.button>
</template>

<style scoped>
/* clip-path cuts the point, and would cut off an outline too, so keyboard focus turns the
   plank pine and underlines its text instead */
.trail-plank {
  display: inline-flex;
  align-items: center;
  border: 0;
  background-image: var(--wood-grain);
  color: var(--paper);
  font: 700 12px var(--font);
  white-space: nowrap;
  text-shadow: 0 1px 0 rgb(0 0 0 / 0.35);
  cursor: pointer;
  clip-path: polygon(0 0, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, 0 100%);
}

.trail-plank:focus-visible {
  outline: 0;
  text-decoration: underline;
}

.trail-plank.is-big {
  height: 52px;
  padding: 0 34px 0 22px;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%);
}
</style>

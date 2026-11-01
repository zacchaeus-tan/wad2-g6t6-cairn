<script setup>
import { computed, ref } from 'vue'
// Motion for Vue (https://motion.dev, MIT) fades the pill and blends its colours
import { motion } from 'motion-v'
import DifficultyMark from '@/components/common/DifficultyMark.vue'
import { GRADES } from '@/lib/difficultyStyle'
import { difficultyColour } from '@/lib/globe/globeRoutes'

// A square label on the globe: a route's name with its grade shape in the grade's colour,
// or the number of routes in a group of nearby routes.
// Listeners set on <RoutePill> (like @click and @mouseenter) go straight to this button,
// because Vue passes attributes and listeners a component doesn't declare to its root element.
const props = defineProps({
  label: { type: String, required: true },
  // 1-4, or null when the route is not rated; not used for a group
  grade: { type: Number, default: null },
  isGroup: { type: Boolean, default: false },
  // Its route's card is showing
  isActive: { type: Boolean, default: false },
  // Hidden until the user starts exploring, and during the dive onto a route
  isVisible: { type: Boolean, default: true },
})

const isHovered = ref(false)

// The pill turns light when hovered or active, and its shape changes to the darker grade colour
const isLight = computed(() => isHovered.value || props.isActive)
const shapeColour = computed(() =>
  isLight.value
    ? (GRADES[props.grade]?.ink ?? 'var(--granite-500)')
    : difficultyColour(props.grade),
)
const pillColours = computed(() => {
  if (isLight.value) {
    return { backgroundColor: 'var(--ground)', color: 'var(--ink)' }
  }
  return {
    backgroundColor: props.isGroup ? 'rgba(16, 24, 20, 0.82)' : 'var(--ink)',
    color: 'var(--ground)',
  }
})
// A bigger square for a big group
const isBigGroup = computed(() => props.isGroup && Number(props.label) >= 20)
</script>

<template>
  <!-- Only the colours and opacity animate: the map moves each marker with an inline transform,
       and animating that would make the pills trail behind the globe -->
  <motion.button
    type="button"
    class="map-pill"
    :class="{ 'is-group': isGroup, 'is-big': isBigGroup }"
    :style="{ pointerEvents: isVisible ? 'auto' : 'none' }"
    :initial="false"
    :animate="{ opacity: isVisible ? 1 : 0, ...pillColours }"
    :transition="{
      duration: 0.15,
      opacity: { duration: isVisible ? 1.2 : 0.3 },
    }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <DifficultyMark v-if="!isGroup" :grade="grade" :color="shapeColour" :show-label="false" />
    <span class="map-pill-label">{{ label }}</span>
  </motion.button>
</template>

<style scoped>
/* 28px tall so a stack of pills (32px apart, see assignMarkerStacks) keeps a small gap */
.map-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 10px 0 8px;
  border: 0;
  border-radius: 0;
  font: 700 12px var(--font);
  white-space: nowrap;
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.35);
  cursor: pointer;
}

.map-pill:focus-visible {
  outline: 3px solid var(--glacier);
  outline-offset: 2px;
}

.map-pill-label {
  max-width: 25ch;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* A group of routes: a bigger outlined square with the count */
.map-pill.is-group {
  justify-content: center;
  min-width: 44px;
  height: 44px;
  padding: 0 10px;
  border: 2px solid var(--ground);
  font: 600 15px var(--font-data);
  font-variant-numeric: tabular-nums;
}

.map-pill.is-group.is-big {
  min-width: 56px;
  height: 56px;
  font-size: 18px;
}

.map-pill.is-group .map-pill-label {
  max-width: none;
}
</style>

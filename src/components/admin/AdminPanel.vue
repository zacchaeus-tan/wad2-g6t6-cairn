<script setup>
import { ref, useId } from 'vue'
import { animate, motion } from 'motion-v'
import { EASE_OUT, fadeMotion, rowMotion } from '@/lib/motion'

defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: 0 }, // shown beside the title when above 0
})

const titleId = useId()
const panel = ref(null)

// Called by the admin page to bring this panel's top edge to the top of the screen.
function scrollToTop() {
  const top = panel.value.getBoundingClientRect().top + window.scrollY
  animate(window.scrollY, top, {
    duration: 0.6,
    ease: EASE_OUT,
    onUpdate: (y) => window.scrollTo(0, y),
  })
}

defineExpose({ scrollToTop })
</script>

<template>
  <motion.section v-bind="rowMotion" :aria-labelledby="titleId">
    <div ref="panel" class="admin-panel">
      <h2 :id="titleId" class="admin-panel-title">
        {{ title }}
        <!-- The key replays the fade each time the count changes -->
        <motion.span v-if="count" :key="count" v-bind="fadeMotion" class="admin-count">
          {{ count }}
        </motion.span>
      </h2>
      <slot />
    </div>
  </motion.section>
</template>

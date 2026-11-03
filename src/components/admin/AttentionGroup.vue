<script setup>
import { AnimatePresence, motion } from 'motion-v'
import { expandMotion } from '@/lib/motion'

// One titled list in Needs attention. It closes up when its last row is dealt with.
defineProps({
  title: { type: String, required: true },
  hint: { type: String, default: '' },
  show: { type: Boolean, required: true },
})
</script>

<template>
  <!-- :initial="false": the tab may be hidden when the page loads, and an entry animation
       doesn't play there. The whole tab rises in instead; later changes still animate. -->
  <AnimatePresence :initial="false">
    <motion.div v-if="show" v-bind="expandMotion" class="admin-group">
      <h3 class="cairn-label">{{ title }}</h3>
      <p v-if="hint" class="admin-hint mb-2">{{ hint }}</p>
      <AnimatePresence :initial="false" as="ul" class="admin-list">
        <slot />
      </AnimatePresence>
    </motion.div>
  </AnimatePresence>
</template>

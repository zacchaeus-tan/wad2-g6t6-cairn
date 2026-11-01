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
  <AnimatePresence>
    <motion.div v-if="show" v-bind="expandMotion" class="admin-group">
      <h3 class="cairn-label">{{ title }}</h3>
      <p v-if="hint" class="admin-hint mb-2">{{ hint }}</p>
      <AnimatePresence as="ul" class="admin-list">
        <slot />
      </AnimatePresence>
    </motion.div>
  </AnimatePresence>
</template>

<script setup>
import { motion } from 'motion-v'
import { EASE_OUT } from '@/lib/motion'

// One tab's content. Hidden tabs stay mounted (v-show), so a half-filled form
// survives a switch to another tab; showing one makes it rise in.
defineProps({
  tab: { type: String, required: true }, // key shared with its tab button
  title: { type: String, required: true },
  lede: { type: String, default: '' },
  active: { type: Boolean, required: true },
})
</script>

<template>
  <motion.section
    v-show="active"
    :id="`admin-panel-${tab}`"
    class="admin-panel"
    role="tabpanel"
    :aria-labelledby="`admin-tab-${tab}`"
    :initial="{ opacity: 0, y: 12 }"
    :animate="active ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }"
    :transition="{ duration: 0.45, ease: EASE_OUT }"
  >
    <h2 class="cairn-headline">{{ title }}</h2>
    <p v-if="lede" class="admin-panel-lede">{{ lede }}</p>
    <slot />
  </motion.section>
</template>

<script setup>
import { motion } from 'motion-v'
import { EASE_OUT } from '@/lib/motion'
</script>

<template>
  <!-- Fades its content up the first time it scrolls into view -->
  <motion.div
    :initial="{ opacity: 0, y: 28 }"
    :while-in-view="{ opacity: 1, y: 0 }"
    :in-view-options="{ once: true, margin: '0px 0px -10% 0px' }"
    :transition="{ duration: 0.8, ease: EASE_OUT }"
  >
    <slot />
  </motion.div>
</template>

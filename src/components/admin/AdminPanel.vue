<script setup>
import { useId } from 'vue'
import { motion } from 'motion-v'
import { fadeMotion, rowMotion } from '@/lib/motion'

defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: 0 }, // shown beside the title when above 0
})

const titleId = useId()
</script>

<template>
  <motion.section v-bind="rowMotion" :aria-labelledby="titleId">
    <div class="admin-panel">
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

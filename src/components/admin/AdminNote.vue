<script setup>
import { computed } from 'vue'
import { motion } from 'motion-v'
import { fadeMotion } from '@/lib/motion'

const props = defineProps({
  type: { type: String, default: 'success' }, // success, info or error
})

const isError = computed(() => props.type === 'error')
</script>

<template>
  <motion.p
    v-bind="fadeMotion"
    class="admin-note"
    :class="{ 'is-error': isError, 'is-info': type === 'info' }"
    :role="isError ? 'alert' : 'status'"
  >
    <slot />
  </motion.p>
</template>

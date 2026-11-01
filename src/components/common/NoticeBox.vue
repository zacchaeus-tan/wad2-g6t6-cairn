<script setup>
import { motion } from 'motion-v'
import { modifierClass } from '@/lib/format'
import { fadeMotion } from '@/lib/motion'

// A square tinted message box.
defineProps({
  type: { type: String, required: true }, // error, success or empty
})

const ROLES = { error: 'alert', success: 'status' }
</script>

<template>
  <motion.p v-bind="fadeMotion" class="notice-box" :class="modifierClass(type)" :role="ROLES[type]">
    <slot />
  </motion.p>
</template>

<style scoped>
.notice-box {
  margin: 0;
  padding: 12px 16px;
  font-size: 15px;
  line-height: 22px;
}

.notice-box.is-error {
  background: color-mix(in srgb, var(--blaze) 12%, var(--white));
  color: var(--blaze-deep);
}

.notice-box.is-success {
  background: var(--pine-mist);
  color: var(--pine);
}

.notice-box.is-empty {
  background: var(--paper);
  color: var(--granite-700);
}
</style>

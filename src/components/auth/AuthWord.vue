<script setup>
import { computed, ref } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import TextHighlighter from '@/components/common/TextHighlighter.vue'

// One of the giant words that switch between signing in and registering.
const props = defineProps({
  text: { type: String, required: true },
  label: { type: String, required: true }, // the accessible name
  active: { type: Boolean, default: false },
  nudge: { type: Boolean, default: false }, // bobs now and then, to show it can be clicked
})

const emit = defineEmits(['select'])

const reduceMotion = useReducedMotion()
const hovering = ref(false)

const hover = computed(() => (reduceMotion.value ? undefined : { y: -6 }))
const press = computed(() => (reduceMotion.value ? undefined : { scale: 0.94 }))

// On its own element inside the button, so it can't fight the button's hover and press
const nudging = computed(() => props.nudge && !hovering.value && !reduceMotion.value)
const idle = computed(() => (nudging.value ? { y: [0, -7, 0] } : { y: 0 }))
const idleTransition = computed(() =>
  nudging.value
    ? { duration: 0.7, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2.5, delay: 1.5 }
    : { type: 'spring', stiffness: 420, damping: 20 },
)
</script>

<template>
  <motion.button
    type="button"
    class="auth-word"
    :class="{ 'is-active': active }"
    :aria-pressed="active ? 'true' : 'false'"
    :aria-label="label"
    :transition="{ type: 'spring', stiffness: 420, damping: 20 }"
    :while-hover="hover"
    :while-press="press"
    @hover-start="hovering = true"
    @hover-end="hovering = false"
    @click="emit('select')"
  >
    <motion.span class="auth-word-nudge" :animate="idle" :transition="idleTransition">
      <TextHighlighter :active="active || hovering" :faded="!active">
        <span class="auth-word-text">{{ text }}</span>
      </TextHighlighter>
    </motion.span>
  </motion.button>
</template>

<style scoped>
.auth-word {
  display: block;
  padding: 0;
  border: 0;
  background: none;
  color: var(--paper);
  cursor: pointer;
}

.auth-word-nudge {
  display: block;
}

.auth-word:focus-visible {
  outline: 3px solid var(--glacier);
  outline-offset: 4px;
}

.auth-word-text {
  display: block;
  padding: 0 0.1em;
  font: 900 clamp(38px, 11vw, 88px) / 1.25 var(--font); /* room for the g's tail */
  letter-spacing: -0.02em;
  white-space: nowrap;
  color: transparent;
  -webkit-text-stroke: 2px rgb(242 239 234 / 0.7);
  paint-order: stroke fill;
  transition:
    color 0.3s var(--ease),
    -webkit-text-stroke-color 0.3s var(--ease);
}

.auth-word:hover .auth-word-text,
.auth-word:focus-visible .auth-word-text {
  color: var(--paper);
  -webkit-text-stroke-color: var(--paper);
}

.auth-word.is-active .auth-word-text {
  color: var(--paper);
  -webkit-text-stroke-width: 0;
}

@media (prefers-reduced-motion: reduce) {
  .auth-word-text {
    transition: none;
  }
}
</style>

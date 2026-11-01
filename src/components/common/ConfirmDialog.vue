<script setup>
import { ref, watch } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import { EASE_OUT } from '@/lib/motion'

// Asks the user to confirm something, in place of the browser's confirm() popup. The native
// <dialog> keeps focus inside, closes on Escape and hands focus back afterwards. It sits on the body
// so that the styles of wherever it was opened from, like a dark banner, don't reach it.
const props = defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, required: true },
  confirmLabel: { type: String, required: true },
  cancelLabel: { type: String, default: 'Cancel' },
})
const emit = defineEmits(['confirm', 'cancel'])

const dialog = ref(null)
const reduceMotion = useReducedMotion()

watch(dialog, (element) => element?.showModal())
watch(
  () => props.open,
  (open) => {
    if (!open) dialog.value?.close()
  },
)

// A click on the backdrop counts as a click on the dialog itself; its contents cover the rest
function onClick(event) {
  if (event.target === dialog.value) emit('cancel')
}
</script>

<template>
  <Teleport v-if="open" to="body">
    <dialog
      ref="dialog"
      class="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-text"
      @cancel.prevent="emit('cancel')"
      @click="onClick"
    >
      <motion.div
        class="confirm-dialog-sheet"
        :initial="reduceMotion ? false : { opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.25, ease: EASE_OUT }"
      >
        <p class="confirm-dialog-eyebrow">Confirm action</p>
        <h2 id="confirm-dialog-title" class="confirm-dialog-title">{{ title }}</h2>
        <p id="confirm-dialog-text" class="confirm-dialog-text"><slot /></p>
        <div class="confirm-dialog-actions">
          <button type="button" class="cairn-btn is-ghost" @click="emit('cancel')">
            {{ cancelLabel }}
          </button>
          <button type="button" class="cairn-btn" @click="emit('confirm')">
            {{ confirmLabel }}
          </button>
        </div>
      </motion.div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.confirm-dialog {
  width: min(100% - 32px, 560px);
  max-width: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-family: var(--font);
}

.confirm-dialog::backdrop {
  background: rgb(23 32 28 / 0.55);
  backdrop-filter: blur(3px);
}

.confirm-dialog-sheet {
  padding: clamp(24px, 6vw, 40px);
  border: 2px solid var(--ink);
  background: var(--ground);
  box-shadow: var(--shadow-panel);
}

.confirm-dialog-eyebrow {
  margin: 0 0 16px;
  color: var(--pine);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.confirm-dialog-title {
  margin: 0 0 16px;
  font-size: clamp(24px, 6vw, 30px);
  font-weight: 900;
  line-height: 1.25;
}

.confirm-dialog-text {
  margin: 0;
  color: var(--granite-700);
  font-size: 17px;
  line-height: 26px;
}

.confirm-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
}

/* The page behind doesn't scroll while this is open */
:global(html:has(.confirm-dialog[open])) {
  overflow: hidden;
}
</style>

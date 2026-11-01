<script setup>
import { useId } from 'vue'

const titleId = useId()

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    required: true,
  },
  messageBefore: {
    type: String,
    default: '',
  },
  highlight: {
    type: String,
    default: '',
  },
  messageAfter: {
    type: String,
    default: '',
  },
  confirmText: {
    type: String,
    default: 'Confirm',
  },
  danger: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div v-if="modelValue" class="confirm-backdrop" @click.self="$emit('cancel')">
    <section class="confirm-dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <span class="confirm-eyebrow">CONFIRM ACTION</span>

      <h3 :id="titleId">
        {{ title }}
      </h3>

      <p>
        {{ messageBefore }}
        <strong v-if="highlight">{{ highlight }}</strong>
        {{ messageAfter }}
      </p>

      <div class="confirm-actions">
        <button type="button" class="confirm-cancel" :disabled="disabled" @click="$emit('cancel')">
          Cancel
        </button>

        <button
          type="button"
          class="confirm-accept"
          :class="{ 'is-danger': danger }"
          :disabled="disabled"
          @click="$emit('confirm')"
        >
          {{ confirmText }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(23 32 28 / 0.55);
  backdrop-filter: blur(3px);
}

.confirm-dialog {
  width: min(100%, 560px);
  padding: 40px;
  border: 2px solid #17201c;
  background: #fbf8ee;
  color: #17201c;
  box-shadow: 0 18px 45px rgb(0 0 0 / 0.2);
}

.confirm-eyebrow {
  display: block;
  margin-bottom: 16px;
  color: #1f5b43;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.confirm-dialog h3 {
  margin: 0 0 18px;
  font-size: 30px;
  line-height: 1.25;
  font-weight: 900;
}

.confirm-dialog p {
  margin: 0;
  color: #65736a;
  font-size: 18px;
  line-height: 1.7;
}

.confirm-dialog p strong {
  color: #17201c;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
}

.confirm-actions button {
  min-height: 48px;
  padding: 0 20px;
  border: 2px solid #17201c;
  border-radius: 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
}

.confirm-cancel {
  background: transparent;
  color: #17201c;
}

.confirm-cancel:hover:not(:disabled) {
  background: #e8e9df;
}

.confirm-accept {
  background: #1f5b43;
  border-color: #1f5b43 !important;
  color: #ffffff;
}

.confirm-accept:hover:not(:disabled) {
  background: #174832;
}

.confirm-accept.is-danger {
  background: #a33b32;
  border-color: #a33b32 !important;
}

.confirm-accept.is-danger:hover:not(:disabled) {
  background: #842e27;
}

.confirm-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .confirm-dialog {
    padding: 26px;
  }

  .confirm-dialog h3 {
    font-size: 25px;
  }

  .confirm-dialog p {
    font-size: 16px;
  }

  .confirm-actions {
    flex-direction: column-reverse;
  }

  .confirm-actions button {
    width: 100%;
  }
}
</style>

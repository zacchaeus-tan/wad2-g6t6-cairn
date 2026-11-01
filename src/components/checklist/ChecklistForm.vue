<script setup>
import { ref } from 'vue'
import { motion } from 'motion-v'
import { useChecklistStore } from '@/controller/checklistStore'
import { maxNameLength, maxReasonLength } from '@/lib/checklistRules'
import TickIcon from '@/components/common/TickIcon.vue'

const props = defineProps({
  item: { type: Object, default: null }, // null = add mode
  checklistId: { type: [String, Number], default: null },
})
const emit = defineEmits(['done'])

const SAVED_DELAY_MS = 1500 // how long the green "Saved" state shows before the form closes

const checklistStore = useChecklistStore()

const blank = () => ({ label: '', category: 'other', quantity: '', reason: '' })

const form = ref(
  props.item
    ? {
        label: props.item.label,
        category: props.item.category || 'other',
        quantity: props.item.quantity || '',
        reason: props.item.reason || '',
      }
    : blank(),
)

const saving = ref(false)
const saved = ref(false)
const labelError = ref('')
const quantityError = ref('')
checklistStore.clearError()

function validateLabel() {
  if (!String(form.value.label ?? '').trim()) {
    labelError.value = 'Item name is required.'
  } else {
    labelError.value = ''
  }
}

function validateQuantity() {
  const quantity = String(form.value.quantity ?? '').trim()

  if (!quantity) {
    quantityError.value = 'Quantity is required.'
  } else if (!/\d/.test(quantity)) {
    quantityError.value = 'Please include at least one number.'
  } else {
    quantityError.value = ''
  }
}

async function submit() {
  if (saving.value || saved.value) return
  validateLabel()
  validateQuantity()
  if (labelError.value || quantityError.value) return

  saving.value = true
  checklistStore.clearError()

  try {
    const ok = props.item
      ? await checklistStore.updateItem(props.item.id, form.value)
      : await checklistStore.addCustom(form.value, props.checklistId)

    if (!ok || checklistStore.error) return

    saving.value = false
    saved.value = true
    await new Promise((resolve) => setTimeout(resolve, SAVED_DELAY_MS))
    emit('done', { saved: true, action: props.item ? 'updated' : 'added' })
  } catch (error) {
    console.error('Could not save checklist item:', error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="checklist-form" data-testid="item-form" novalidate @submit.prevent="submit">
    <h3 class="checklist-form-title">{{ item ? 'Edit item' : 'Add an item' }}</h3>

    <div class="checklist-form-fields">
      <label class="checklist-form-field" for="cl-label">
        <span class="cairn-label">Item name</span>
        <input
          id="cl-label"
          v-model="form.label"
          :maxlength="maxNameLength"
          :disabled="saving || saved"
          class="cairn-input checklist-form-input"
          data-testid="item-label-input"
          :aria-invalid="Boolean(labelError)"
          @input="validateLabel"
        />

        <p class="checklist-form-field-error" role="alert">
          {{ labelError }}
        </p>
      </label>
      <label class="checklist-form-field" for="cl-category">
        <span class="cairn-label">Category</span>
        <select
          id="cl-category"
          v-model="form.category"
          :disabled="saving || saved"
          class="cairn-input checklist-form-input"
          data-testid="item-category-select"
        >
          <option value="clothing">Clothing</option>
          <option value="safety">Safety</option>
          <option value="navigation">Navigation</option>
          <option value="water_food">Water &amp; Food</option>
          <option value="shelter">Shelter</option>
          <option value="documents">Documents</option>
          <option value="other">Other</option>
        </select>
        <p class="checklist-form-field-error"></p>
      </label>
      <label class="checklist-form-field" for="cl-qty">
        <span class="cairn-label">Quantity</span>
        <input
          id="cl-qty"
          v-model="form.quantity"
          :disabled="saving || saved"
          class="cairn-input checklist-form-input"
          placeholder="e.g. 2, 3L, 1 pair"
          data-testid="item-quantity-input"
          @input="validateQuantity"
        />
        <p class="checklist-form-field-error" role="alert">
          {{ quantityError }}
        </p>
      </label>
      <label class="checklist-form-field" for="cl-reason">
        <span class="cairn-label">Reason (optional)</span>
        <input
          id="cl-reason"
          v-model="form.reason"
          :maxlength="maxReasonLength"
          :disabled="saving || saved"
          class="cairn-input checklist-form-input"
          data-testid="item-reason-input"
        />
        <p class="checklist-form-field-error"></p>
      </label>
    </div>

    <div
      v-if="checklistStore.error"
      class="checklist-form-error"
      role="alert"
      data-testid="item-form-error"
    >
      {{ checklistStore.error }}
    </div>

    <div class="checklist-form-actions">
      <motion.button
        type="submit"
        class="cairn-btn is-small checklist-form-primary"
        :disabled="saving || saved"
        :animate="{
          scale: saved ? 1.03 : 1,
          backgroundColor: saved ? '#1f5b43' : '#17201c',
          borderColor: saved ? '#1f5b43' : '#17201c',
        }"
        :transition="{ type: 'spring', stiffness: 350, damping: 22 }"
        data-testid="item-submit-btn"
      >
        <template v-if="saved">
          <TickIcon />
          {{ item ? 'Saved' : 'Added' }}
        </template>
        <span v-else-if="saving">Saving...</span>
        <span v-else>{{ item ? 'Save changes' : 'Add item' }}</span>
      </motion.button>

      <button
        class="cairn-btn is-ghost is-small"
        type="button"
        :disabled="saving || saved"
        data-testid="item-cancel-btn"
        @click="emit('done', { saved: false })"
      >
        Cancel
      </button>
    </div>
  </form>
</template>

<style scoped>
.checklist-form {
  display: grid;
  gap: 14px;
  margin-top: 16px;
  padding: 18px;
  border: 2px solid var(--ink);
  background: var(--white);
  color: var(--ink);
  font-family: var(--font);
}

.checklist-form-title {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
}

.checklist-form-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.checklist-form-field {
  display: grid;
  gap: 6px;
}

.checklist-form-input:focus-visible {
  outline: 3px solid var(--lake);
  outline-offset: 2px;
  box-shadow: none;
}

.checklist-form-input:disabled {
  opacity: 0.6;
}

.checklist-form-error {
  padding: 8px 10px;
  background: color-mix(in srgb, var(--blaze) 12%, var(--white));
  color: var(--blaze-deep);
  font-size: 14px;
}

.checklist-form-actions {
  display: flex;
  gap: 8px;
}

/* Keep the green "Saved" button fully visible even though it is disabled */
.checklist-form-primary:disabled {
  opacity: 1;
}

@media (max-width: 560px) {
  .checklist-form-fields {
    grid-template-columns: 1fr;
  }
}

.checklist-form-field-error {
  color: #b42318;
  font-size: 12px;
  line-height: 1.4;
}

.checklist-form-input[aria-invalid='true'] {
  border-color: #b42318;
}

.checklist-form-field-error {
  min-height: 17px;
  margin: 0;
  color: #b42318;
  font-size: 12px;
  line-height: 17px;
}
</style>

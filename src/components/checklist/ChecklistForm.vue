<script setup>
import { ref } from 'vue'
import { motion } from 'motion-v'
import { useChecklistStore } from '@/controller/checklistStore'
import { maxNameLength, maxReasonLength } from '@/lib/checklistRules'

const props = defineProps({
  item: { type: Object, default: null }, // null = add mode
  checklistId: { type: [String, Number], default: null },
})
const emit = defineEmits(['done'])

const checklistStore = useChecklistStore()

const categories = [
  { key: 'clothing', label: 'Clothing' },
  { key: 'safety', label: 'Safety' },
  { key: 'navigation', label: 'Navigation' },
  { key: 'water_food', label: 'Water & food' },
  { key: 'shelter', label: 'Shelter' },
  { key: 'documents', label: 'Documents' },
  { key: 'other', label: 'Other' },
]

const blank = () => ({
  label: '',
  category: 'other',
  quantity: '',
  reason: '',
})

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

async function submit() {
  if (saving.value || saved.value) {
    return
  }
  saving.value = true
  checklistStore.clearError()

  let ok = false
  try {
    if (props.item) {
      ok = await checklistStore.updateItem(props.item.id, form.value)
    } else {
      ok = await checklistStore.addCustom(form.value, props.checklistId)
    }
    if (!ok || checklistStore.error) {
      return
    }

    saved.value = true

    await new Promise((resolve) => setTimeout(resolve, 3000))

    emit('done', {
      saved: true,
      action: props.item ? 'updated' : 'added',
    })
  } catch (error) {
    console.error('Could not save checklist item:', error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="border rounded p-3 mt-3" data-testid="item-form" @submit.prevent="submit">
    <h3 class="h3">{{ item ? 'Edit item' : 'Add a custom item' }}</h3>

    <div class="row g-3">
      <div class="col-12">
        <label for="checklist-item-name">Item name</label>
        <input
          id="checklist-item-name"
          v-model="form.label"
          type="text"
          :maxlength="maxNameLength"
          class="form-control"
          required
        />
      </div>

      <div class="col-md-6">
        <label for="checklist-item-category">Category</label>
        <select
          id="checklist-item-category"
          v-model="form.category"
          class="form-select"
          :disabled="saving || saved"
        >
          <option v-for="category in categories" :key="category.key" :value="category.key">
            {{ category.label }}
          </option>
        </select>
      </div>

      <div class="col-md-6">
        <label for="checklist-item-quantity">Quantity</label>
        <input
          id="checklist-item-quantity"
          v-model="form.quantity"
          class="form-control"
          type="text"
          placeholder="e.g. 2, 3L, 1 pair"
          required
          :disabled="saving || saved"
        />
      </div>

      <div class="col-12">
        <label for="checklist-item-reason">Reason (optional)</label>
        <input
          id="checklist-item-reason"
          v-model="form.reason"
          type="text"
          :maxlength="maxReasonLength"
          class="form-control"
          placeholder="Why do you need this item?"
          :disabled="saving || saved"
        />
      </div>
    </div>

    <p v-if="checklistStore.error" class="gear-error" role="alert">
      {{ checklistStore.error }}
    </p>
    <br />

    <div class="checklist-form-actions">
      <motion.button
        type="submit"
        class="gear-button checklist-save-button"
        :class="{
          'is-saving': saving,
          'is-saved': saved,
          'is-disabled': saving || saved,
        }"
        :disabled="saving || saved"
        :animate="{
          scale: saved ? 1.02 : 1,
          backgroundColor: saved ? '#e3eee6' : '#17201c',
          color: saved ? '#1f5b43' : '#ffffff',
        }"
        :transition="{
          type: 'spring',
          stiffness: 350,
          damping: 22,
        }"
      >
        <span v-if="saved">✓ Saved</span>
        <span v-else-if="saving">Saving...</span>
        <span v-else>{{ item ? 'Save changes' : 'Add item' }}</span>
      </motion.button>

      <button
        type="button"
        class="gear-button"
        :disabled="saving || saved"
        @click="emit('done', { saved: false })"
      >
        Cancel
      </button>
    </div>
  </form>
</template>

<style scoped>
.gear-inline-form {
  display: block;
  flex: 0 0 100%;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin: 8px 0 4px;
  padding: 20px !important;
  border: 1px solid #b9cdbd !important;
  border-left: 4px solid var(--gear-pine, #1f5b43) !important;
  border-radius: 0 !important;
  background: #f8faf6 !important;
  box-shadow: 0 8px 22px rgb(23 32 28 / 0.07);
}

.gear-inline-form h3 {
  margin: 0 0 15px !important;
  color: var(--gear-ink, #17201c);
  font-size: 17px;
  font-weight: 800;
}

.gear-inline-form label {
  display: block;
  margin-bottom: 6px;
  color: #48564d;
  font-size: 13px;
  font-weight: 700;
}

.gear-inline-form input,
.gear-inline-form select {
  min-height: 42px;
  border: 1px solid #c8d2c9;
  border-radius: 0;
  background: #fff;
  color: var(--gear-ink, #17201c);
  font: 400 14px/1.4 var(--font, 'Lato', system-ui, sans-serif);
  box-shadow: none;
}

.gear-inline-form input:focus,
.gear-inline-form select:focus {
  border-color: var(--gear-pine, #1f5b43);
  box-shadow: 0 0 0 3px #1f5b431c;
}

.gear-inline-form button {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 0;
  font: 700 13px/1 var(--font, 'Lato', system-ui, sans-serif);
}

@media (max-width: 650px) {
  .gear-inline-form {
    flex-basis: 100%;
    width: 100%;
  }
}
</style>

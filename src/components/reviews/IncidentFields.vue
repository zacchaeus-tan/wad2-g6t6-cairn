<script setup>
const props = defineProps({
  modelValue: { type: Object, required: true },
  categories: { type: Array, required: true },
})

const emit = defineEmits(['update:modelValue', 'remove'])

// Props are read-only, so send the parent a changed copy instead of editing it.
function update(field, value) {
  // '...' grabs every property of the modelValue object. [field]: value sets the property named by the field variable to the new value.
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}
</script>

<template>
  <div class="incident-fields">
    <!-- Bootstrap grid: category, note and remove on one line from md (768px) up, stacked on phones -->
    <div class="row g-3 align-items-end">
      <label class="incident-fields-field col-12 col-md-4 d-grid gap-2">
        <span class="cairn-label">Incident</span>
        <select
          :value="modelValue.category"
          class="cairn-input"
          @change="update('category', $event.target.value)"
        >
          <option value="" disabled>Select category</option>
          <option v-for="c in categories" :key="c.category" :value="c.category">
            {{ c.label }}
          </option>
        </select>
      </label>

      <label class="incident-fields-field col-12 col-md d-grid gap-2">
        <span class="cairn-label">What happened?</span>
        <input
          :value="modelValue.note"
          class="cairn-input"
          @input="update('note', $event.target.value)"
        />
      </label>

      <div class="col-12 col-md-auto">
        <button type="button" class="incident-fields-remove" @click="emit('remove')">Remove</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.incident-fields {
  padding: 12px;
  background: var(--warning-mist);
}

.incident-fields-field .cairn-label {
  color: #5c3d00;
}

.incident-fields-remove {
  min-height: 44px;
  padding: 0 8px;
  border: 0;
  background: none;
  color: #b42318;
  font: 700 13px var(--font);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
</style>

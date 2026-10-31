<script setup>
import ChecklistForm from './ChecklistForm.vue'

defineProps({
  item: {
    type: Object,
    required: true,
  },
  isSaved: {
    type: Boolean,
    default: false,
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
  isDeleting: {
    type: Boolean,
    default: false,
  },
  checklistId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['toggle-item', 'edit-item', 'remove-item', 'form-done'])
</script>

<template>
  <div
    class="gear-item"
    :class="{
      'is-checked': item.is_checked,
      'is-deleting': isDeleting,
    }"
    :aria-busy="isDeleting"
  >
    <label class="gear-check-wrap">
      <input
        type="checkbox"
        :checked="item.is_checked"
        :disabled="isDeleting"
        @change="emit('toggle-item', item)"
      />

      <span class="gear-custom-check">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m3 8 3.1 3.1L13 4.5" />
        </svg>
      </span>
    </label>

    <div class="gear-item-copy">
      <div class="gear-item-name">
        {{ item.label }}

        <span v-if="item.quantity" class="gear-quantity"> × {{ item.quantity }} </span>
      </div>

      <p v-if="item.reason">
        {{ item.reason }}
      </p>
    </div>

    <span v-if="item.is_custom" class="gear-custom-tag"> ADDED </span>

    <div v-if="isDeleting" class="gear-removing-status" role="status">
      <span class="gear-removing-spinner" aria-hidden="true"></span>
      Removing…
    </div>

    <div v-else-if="isSaved" class="gear-item-actions">
      <button
        type="button"
        aria-label="Edit item"
        title="Edit item"
        :disabled="isDeleting"
        @click="emit('edit-item', item)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m14 5 5 5M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
        </svg>
      </button>

      <button
        type="button"
        aria-label="Remove item"
        title="Remove item"
        :disabled="isDeleting"
        @click="emit('remove-item', item)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M9 7V4h6v3m3 0-.8 13H6.8L6 7m4 4v5m4-5v5" />
        </svg>
      </button>
    </div>

    <ChecklistForm
      v-if="isEditing && !isDeleting"
      class="gear-inline-form"
      :item="item"
      :checklist-id="checklistId"
      @done="emit('form-done', $event)"
    />
  </div>
</template>

<style scoped>
.gear-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 13px;
  min-height: 66px;
  padding: 12px 8px;
  border-bottom: 1px solid #e1e5df;
  transition:
    background 0.2s,
    opacity 0.2s;
}

.gear-item:last-child {
  border-bottom: 0;
}

.gear-item:hover {
  background: #eeeee6;
}

.gear-item.is-checked .gear-item-name {
  color: #87938a;
  text-decoration: line-through;
}

.gear-item.is-checked .gear-item-copy p {
  opacity: 0.65;
}

.gear-item.is-deleting {
  opacity: 0.6;
  background: #f0f1eb;
  pointer-events: none;
}

/* Checkbox */
.gear-check-wrap {
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 23px;
  height: 23px;
  cursor: pointer;
}

.gear-check-wrap input {
  position: absolute;
  width: 23px;
  height: 23px;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.gear-custom-check {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1px solid #aab7ac;
  background: #fff;
  transition:
    background 0.2s,
    border-color 0.2s,
    transform 0.2s;
}

.gear-custom-check svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: #fff;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
  transform: scale(0.7);
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.gear-check-wrap input:checked + .gear-custom-check {
  border-color: var(--gear-pine, #1f5b43);
  background: var(--gear-pine, #1f5b43);
}

.gear-check-wrap input:checked + .gear-custom-check svg {
  opacity: 1;
  transform: scale(1);
}

.gear-check-wrap input:focus-visible + .gear-custom-check {
  outline: 3px solid #1e5f8c;
  outline-offset: 3px;
}

/* Item text */
.gear-item-copy {
  flex: 1;
  min-width: 0;
}

.gear-item-name {
  font-size: 15px;
  line-height: 1.4;
  font-weight: 700;
  transition: color 0.2s;
}

.gear-item-copy p {
  margin-top: 3px !important;
  color: #738077;
  font-size: 13px;
  line-height: 1.55;
}

.gear-quantity {
  margin-left: 5px;
  color: #78847b;
  font-size: 13px;
  font-weight: 600;
}

.gear-custom-tag {
  padding: 3px 5px;
  background: #e3ece4;
  color: var(--gear-pine, #1f5b43);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
}

/* Edit and delete actions */
.gear-item-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.gear-item-actions button {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 5px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s;
}

.gear-item-actions button svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.gear-item-actions button:first-child {
  color: #64766a;
}

.gear-item-actions button:first-child:hover {
  color: var(--gear-pine, #1f5b43);
  background: #e8f0e9;
}

.gear-item-actions button:last-child {
  color: #8a7772;
}

.gear-item-actions button:last-child:hover {
  color: #a33e2b;
  background: #f8eae7;
}

.gear-item-actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.gear-item-actions button:focus-visible {
  outline: 2px solid var(--gear-pine, #1f5b43);
  outline-offset: 2px;
}

/* Removing status */
.gear-removing-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #8a5b35;
  font-size: 12px;
  font-weight: 700;
}

.gear-removing-spinner {
  display: inline-block;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border: 2px solid #d9c9b8;
  border-top-color: #8a5b35;
  border-radius: 50%;
  animation: gear-spin 0.7s linear infinite;
}

@media (max-width: 650px) {
  .gear-item {
    gap: 9px;
    padding: 11px 3px;
  }

  .gear-item-actions button {
    width: 25px;
  }

  .gear-custom-tag {
    display: none;
  }
}
</style>

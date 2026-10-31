<script setup>
import ChecklistItem from './ChecklistItem.vue'

defineProps({
  group: {
    type: Object,
    required: true,
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
  isSaved: {
    type: Boolean,
    default: false,
  },
  editingItem: {
    type: Object,
    default: null,
  },
  showForm: {
    type: Boolean,
    default: false,
  },
  checklistId: {
    type: [String, Number],
    default: null,
  },
  deletingItemId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits([
  'toggle-category',
  'toggle-item',
  'edit-item',
  'remove-item',
  'form-done',
])
</script>

<template>
  <div class="gear-category-group">
    <button
      type="button"
      class="gear-category-heading"
      :aria-expanded="!collapsed"
      @click="emit('toggle-category', group.key)"
    >
      <span class="gear-category-icon">
        <img
          v-if="typeof group.icon === 'string' && group.icon.includes('/')"
          :src="group.icon"
          :alt="group.label"
          class="gear-category-icon"
        />

        <span v-else>{{ group.icon }}</span>
      </span>

      <span class="gear-category-title">
        {{ group.label }}
      </span>

      <span class="gear-category-rule"></span>

      <small>
        {{ group.items.filter((item) => item.is_checked).length }}
        / {{ group.items.length }}
      </small>

      <span class="gear-category-chevron" :class="{ 'is-collapsed': collapsed }" aria-hidden="true">
        ⌄
      </span>
    </button>

    <div v-if="!collapsed" class="gear-item-list">
      <ChecklistItem
        v-for="item in group.items"
        :key="item.id"
        :item="item"
        :is-saved="isSaved"
        :checklist-id="checklistId"
        :is-deleting="deletingItemId === item.id"
        :is-editing="showForm && editingItem?.id === item.id"
        @toggle-item="emit('toggle-item', $event)"
        @edit-item="emit('edit-item', $event)"
        @remove-item="emit('remove-item', $event)"
        @form-done="emit('form-done', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.gear-category-group {
  margin-top: 14px;
}

.gear-category-heading {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  width: 100%;
  padding: 9px 0 10px;
  border: 0;
  border-bottom: 1px solid #cfd7cf;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.gear-category-heading:focus-visible {
  outline: 2px solid var(--gear-pine, #1f5b43);
  outline-offset: 4px;
}

.gear-category-icon {
  display: grid;
  place-items: center;
  flex: 0 0 25px;
  width: 25px;
  height: 25px;
  background: #e2eae2;
  color: var(--gear-pine, #1f5b43);
  font-size: 15px;
}

.gear-category-title {
  color: var(--gear-ink, #17201c);
  font-size: 14px;
  font-weight: 800;
}

.gear-category-rule {
  flex: 1;
  height: 1px;
  background: #d7ddd6;
}

.gear-category-heading small {
  color: #7a867d;
  font-size: 11px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.gear-category-chevron {
  color: #68776d;
  font-size: 19px;
  line-height: 1;
  transition: transform 0.2s;
}

.gear-category-chevron.is-collapsed {
  transform: rotate(-90deg);
}

.gear-item-list {
  border-bottom: 1px solid #dce1da;
}
</style>

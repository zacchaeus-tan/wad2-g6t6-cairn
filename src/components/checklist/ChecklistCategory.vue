<script setup>
import { computed, ref, watch } from 'vue'
import { motion } from 'motion-v'
import { CATEGORY_LABELS as categoryLabels } from '@/lib/profileTools'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})

const selectedCategory = ref('all')

const categoryFilters = computed(() => [
  {
    value: 'all',
    label: 'All',
    count: props.items.length,
  },
  ...Object.entries(categoryLabels)
    .map(([value, label]) => ({
      value,
      label,
      count: props.items.filter((item) => (item.category || 'other') === value).length,
    }))
    .filter((category) => category.count > 0),
])

const filteredItems = computed(() => {
  if (selectedCategory.value === 'all') {
    return props.items
  }

  return props.items.filter((item) => (item.category || 'other') === selectedCategory.value)
})

function resetCategory() {
  selectedCategory.value = 'all'
}

watch(categoryFilters, (filters) => {
  if (
    selectedCategory.value !== 'all' &&
    !filters.some((category) => category.value === selectedCategory.value)
  ) {
    selectedCategory.value = 'all'
  }
})

defineExpose({
  resetCategory,
})
</script>

<template>
  <div>
    <nav v-if="items.length" class="gear-category-tabs" aria-label="Filter checklist by category">
      <motion.button
        v-for="category in categoryFilters"
        :key="category.value"
        type="button"
        class="gear-category-tab"
        :class="{ 'is-active': selectedCategory === category.value }"
        :aria-pressed="selectedCategory === category.value"
        @click="selectedCategory = category.value"
        :whileHover="{ y: -1 }"
        :whilePress="{ scale: 0.97 }"
      >
        <span class="gear-category-tab-label">
          {{ category.label }}
        </span>

        <span class="gear-category-tab-count">
          {{ category.count }}
        </span>
      </motion.button>
    </nav>

    <motion.div
      :key="selectedCategory"
      :initial="{ opacity: 0, y: 5 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.2, ease: 'easeOut' }"
    >
      <slot :items="filteredItems" :category-labels="categoryLabels" />
    </motion.div>
  </div>
</template>

<style scoped>
.gear-category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.gear-category-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border: 1px solid #aeb9ae;
  background: transparent;
  color: var(--ink, #17201c);
  font: inherit;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.gear-category-tab.is-active {
  border-color: #2b3832;
  background: #2b3832;
  color: #fff;
}

.gear-category-tab-label,
.gear-category-tab-count {
  position: relative;
}

.gear-category-tab-count {
  font-size: 11px;
  opacity: 0.75;
}
</style>

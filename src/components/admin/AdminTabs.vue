<script setup>
import { ref } from 'vue'
import { motion } from 'motion-v'
import { EASE_OUT } from '@/lib/motion'

// The pine bar of tabs under the numbers. The sand underline slides between tabs
// with a Motion for Vue (motion-v) layout animation.
const props = defineProps({
  tabs: { type: Array, required: true }, // { key, label, count }
  active: { type: String, required: true },
})

const emit = defineEmits(['select'])

const buttons = ref([])

// Left and right arrows move along the tabs, as screen reader users expect.
function move(step) {
  const index = props.tabs.findIndex((tab) => tab.key === props.active)
  const next = (index + step + props.tabs.length) % props.tabs.length
  const key = props.tabs[next].key
  emit('select', key)
  // Refs in a v-for aren't kept in list order, so find the button by its id
  const button = buttons.value.find((b) => b.id === `admin-tab-${key}`)
  button.focus()
  button.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
</script>

<template>
  <nav class="admin-tabs sticky-top" aria-label="Admin sections">
    <div class="cairn-wrap">
      <div class="admin-tablist" role="tablist">
        <button
          v-for="tab in tabs"
          :id="`admin-tab-${tab.key}`"
          :key="tab.key"
          ref="buttons"
          type="button"
          role="tab"
          class="admin-tab"
          :class="{ 'is-active': tab.key === active }"
          :aria-selected="tab.key === active ? 'true' : 'false'"
          :aria-controls="`admin-panel-${tab.key}`"
          :tabindex="tab.key === active ? 0 : -1"
          :data-testid="`admin-tab-${tab.key}`"
          @click="emit('select', tab.key)"
          @keydown.right.prevent="move(1)"
          @keydown.left.prevent="move(-1)"
        >
          {{ tab.label }}
          <span v-if="tab.count" class="admin-tab-count">{{ tab.count }}</span>
          <motion.span
            v-if="tab.key === active"
            layout-id="admin-tab-marker"
            class="admin-tab-marker"
            :transition="{ duration: 0.45, ease: EASE_OUT }"
          />
        </button>
      </div>
    </div>
  </nav>
</template>

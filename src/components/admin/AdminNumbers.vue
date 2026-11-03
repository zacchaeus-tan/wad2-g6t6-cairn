<script setup>
import { computed } from 'vue'
import { useAdminStore } from '@/controller/adminStore'
import NumberTicker from '@/components/common/NumberTicker.vue'

// Four big figures under the banner, as on a route page. Each one opens its tab.
const emit = defineEmits(['select'])

const adminStore = useAdminStore()

const numbers = computed(() => [
  { tab: 'attention', label: 'Needs attention', value: adminStore.attentionCount, urgent: true },
  { tab: 'alerts', label: 'Live alerts', value: adminStore.liveAlerts.length },
  { tab: 'status', label: 'Routes not open', value: adminStore.notOpenRoutes.length },
  { tab: 'info', label: 'Missing info', value: adminStore.incompleteRoutes.length },
])
</script>

<template>
  <section class="admin-numbers" aria-label="At a glance">
    <div class="cairn-wrap admin-numbers-list">
      <button
        v-for="number in numbers"
        :key="number.tab"
        type="button"
        class="admin-number"
        :class="{ 'is-urgent': number.urgent && number.value > 0 }"
        :data-testid="`admin-number-${number.tab}`"
        @click="emit('select', number.tab)"
      >
        <span class="admin-number-label">{{ number.label }}</span>
        <NumberTicker class="admin-number-figure cairn-data" :value="number.value" />
      </button>
    </div>
  </section>
</template>

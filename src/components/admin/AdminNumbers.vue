<script setup>
import { computed } from 'vue'
import { useAdminStore } from '@/controller/adminStore'
import NumberTicker from '@/components/common/NumberTicker.vue'

// Four big figures under the banner, as on a route page. Each one opens its tab.
const emit = defineEmits(['select'])

const adminStore = useAdminStore()

// Bootstrap padding and dividers for each place in the grid. The first figure in each
// row lines up with the page edge. admin-number-top and admin-number-mid change
// at lg, which Bootstrap's border classes can't do.
const PLACES = [
  'ps-0 pe-3 border-end admin-number-top',
  'px-3 admin-number-top admin-number-mid',
  'ps-0 ps-lg-3 pe-3 border-end',
  'px-3',
]

const numbers = computed(() => [
  { tab: 'attention', label: 'Needs attention', value: adminStore.attentionCount, urgent: true },
  { tab: 'alerts', label: 'Live alerts', value: adminStore.liveAlerts.length },
  { tab: 'status', label: 'Routes not open', value: adminStore.notOpenRoutes.length },
  { tab: 'info', label: 'Missing info', value: adminStore.incompleteRoutes.length },
])
</script>

<template>
  <section class="admin-numbers" aria-label="At a glance">
    <!-- Two by two on phones, one row of four from lg -->
    <div class="cairn-wrap">
      <div class="row g-0 row-cols-2 row-cols-lg-4">
        <button
          v-for="(number, index) in numbers"
          :key="number.tab"
          type="button"
          class="col admin-number py-4 py-lg-5"
          :class="[PLACES[index], { 'is-urgent': number.urgent && number.value > 0 }]"
          :data-testid="`admin-number-${number.tab}`"
          @click="emit('select', number.tab)"
        >
          <span class="admin-number-label">{{ number.label }}</span>
          <NumberTicker class="admin-number-figure cairn-data" :value="number.value" />
        </button>
      </div>
    </div>
  </section>
</template>

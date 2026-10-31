<script setup>
import { computed } from 'vue'

const props = defineProps({
  routes: { type: Array, required: true },
})

const completedRoutes = computed(() => props.routes.filter((r) => r.status === 'completed'))

// totals from the routes marked as completed; routes without a distance count as 0 km
const hikeStats = computed(() => {
  const totalKm = completedRoutes.value.reduce((sum, r) => sum + (Number(r.distance_km) || 0), 0)
  return [
    { label: 'Hikes completed', value: completedRoutes.value.length, unit: '' },
    { label: 'Total distance', value: Math.round(totalKm * 10) / 10, unit: 'km' },
  ]
})
</script>

<template>
  <section aria-labelledby="hike-totals-title">
    <h2 id="hike-totals-title" class="h6 text-muted text-uppercase mb-2">Your hikes</h2>
    <div class="row g-3 mb-2">
      <div v-for="stat in hikeStats" :key="stat.label" class="col-6">
        <div class="card h-100 text-center">
          <div class="card-body">
            <div class="small text-muted">{{ stat.label }}</div>
            <div class="h4 mb-0">
              {{ stat.value }} <span class="fs-6">{{ stat.unit }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p class="small text-muted mb-4">Mark a route as completed on its page to count it here.</p>
  </section>
</template>

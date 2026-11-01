<script setup>
import { computed } from 'vue'
import NumberTicker from '@/components/common/NumberTicker.vue'

const props = defineProps({
  routes: { type: Array, required: true },
})

const completedRoutes = computed(() => props.routes.filter((r) => r.status === 'completed'))

// totals from the routes marked as completed; routes without a distance count as 0 km
const totalKm = computed(
  () =>
    Math.round(
      completedRoutes.value.reduce((sum, r) => sum + (Number(r.distance_km) || 0), 0) * 10,
    ) / 10,
)
</script>

<template>
  <section class="profile-totals" aria-labelledby="hike-totals-title">
    <h2 id="hike-totals-title" class="cairn-headline">Your hikes</h2>
    <dl class="profile-totals-list">
      <div>
        <dt class="cairn-label">Hikes completed</dt>
        <dd class="cairn-data"><NumberTicker :value="completedRoutes.length" /></dd>
      </div>
      <div>
        <dt class="cairn-label">Total distance</dt>
        <dd class="cairn-data"><NumberTicker :value="totalKm" :decimals="1" suffix=" km" /></dd>
      </div>
    </dl>
    <p class="cairn-fine">Mark a route as completed on its page to count it here.</p>
  </section>
</template>

<style scoped>
.profile-totals {
  display: grid;
  gap: 16px;
}

.profile-totals-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
}

.profile-totals-list > div {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 16px 20px;
  border-left: 1px solid var(--granite-200);
}

.profile-totals-list > div:first-child {
  padding-left: 0;
  border-left: 0;
}

/* Sized by the card, so a long distance still fits its column */
.profile-totals-list dd {
  margin: 0;
  font-size: clamp(28px, 7.5cqi, 68px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
</style>

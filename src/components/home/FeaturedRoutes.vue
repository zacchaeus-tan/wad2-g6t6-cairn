<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchFeaturedRoutes } from '@/controller/routesController'
import { GRADES } from '@/lib/difficultyStyle'
import RouteTile from '@/components/routes/RouteTile.vue'

// One route per grade (Easy, Moderate, Hard, Strenuous), each with complete
// distance/climb/duration and a single, unbroken trail line
const NAMES = [
  'Ao Ech (Frog Lake) Trail',
  'Bukit Kutu (via Old Colonial Route)',
  'Mount Pulag Lusod Trail',
  'Mount Rinjani via Senaru',
]

const routes = ref([])
const total = ref(null)

const tiles = computed(() =>
  // Sorted because the database doesn't return them in the order asked for
  [...routes.value].sort((a, b) => NAMES.indexOf(a.name) - NAMES.indexOf(b.name)),
)

onMounted(async () => {
  try {
    const featured = await fetchFeaturedRoutes(NAMES)
    routes.value = featured.routes
    total.value = featured.total
  } catch (err) {
    console.error('Could not load the featured routes:', err)
  }
})
</script>

<template>
  <section class="featured">
    <div class="cairn-wrap">
      <div
        class="d-flex flex-wrap justify-content-between align-items-end row-gap-3 column-gap-4 mb-4"
      >
        <h2 class="cairn-headline">Routes to explore</h2>
        <div class="featured-key d-flex flex-wrap row-gap-2 column-gap-3">
          <span
            v-for="grade in GRADES"
            :key="grade.key"
            class="d-inline-flex align-items-center gap-2"
          >
            <i :style="{ background: grade.line }"></i>{{ grade.label }}
          </span>
        </div>
      </div>

      <!-- Bootstrap grid: 2 per row on phones, 4 per row from md (768px) up -->
      <div class="row row-cols-2 row-cols-md-4 gx-3 gx-lg-4 gy-4">
        <RouteTile v-for="route in tiles" :key="route.id" :route="route" />
      </div>

      <div class="featured-more">
        <RouterLink class="cairn-btn is-ghost" to="/routes">
          Browse all {{ total }} routes
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.featured {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: center;
  min-height: 100svh;
  padding-block: clamp(40px, 7vh, 80px);
}

.featured-key {
  color: var(--granite-700);
  font-size: 13px;
}

.featured-key i {
  display: inline-block;
  width: 22px;
  height: 3px;
}

.featured-more {
  display: flex;
  justify-content: center;
  margin-top: clamp(20px, 4vh, 48px);
}
</style>

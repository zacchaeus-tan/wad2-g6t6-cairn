<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchFeaturedRoutes } from '@/controller/routesController'
import { GRADES } from '@/lib/difficultyStyle'
import RouteTile from '@/components/routes/RouteTile.vue'
import photoLakePeaks from '@/assets/img/card-lake-peaks.jpg'
import photoAlpinePath from '@/assets/img/card-alpine-path.jpg'
import photoRidgeHikers from '@/assets/img/card-ridge-hikers.jpg'
import photoMistyLake from '@/assets/img/card-misty-lake.jpg'

const PHOTOS = {
  'Mount Pulag Lusod Trail': photoLakePeaks,
  'Mount Rinjani via Senaru': photoAlpinePath,
  'Mount Kinabalu Trail': photoRidgeHikers,
  'Trans-Tahan': photoMistyLake,
}

const NAMES = Object.keys(PHOTOS)

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
      <div class="featured-top">
        <h2 class="cairn-headline">Routes to explore</h2>
        <div class="featured-key">
          <span v-for="grade in GRADES" :key="grade.key">
            <i :style="{ background: grade.line }"></i>{{ grade.label }}
          </span>
        </div>
      </div>

      <div class="featured-tiles">
        <RouteTile
          v-for="route in tiles"
          :key="route.id"
          :route="route"
          :photo="PHOTOS[route.name]"
        />
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

.featured-top {
  display: flex;
  justify-content: space-between;
  align-items: end;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-bottom: clamp(20px, 4vh, 40px);
}

.featured-key {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  color: var(--granite-700);
  font-size: 13px;
}

.featured-key span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.featured-key i {
  display: inline-block;
  width: 22px;
  height: 3px;
}

.featured-tiles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 40px 24px;
}

.featured-more {
  display: flex;
  justify-content: center;
  margin-top: clamp(20px, 4vh, 48px);
}

@media (max-width: 1000px) {
  .featured-tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 12px;
  }

  .featured-tiles :deep(.route-tile-field) {
    aspect-ratio: 16 / 10;
  }
}
</style>

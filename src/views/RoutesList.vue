<script setup>
import { computed, onMounted, ref } from 'vue'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion-v'
import { fetchRoutes } from '../controller/routesController'
import DifficultyMark from '@/components/common/DifficultyMark.vue'
import RouteTile from '@/components/routes/RouteTile.vue'
import photoAlpinePath from '@/assets/img/card-alpine-path.jpg'
import photoLakePeaks from '@/assets/img/card-lake-peaks.jpg'
import photoMistyLake from '@/assets/img/card-misty-lake.jpg'
import photoRidgeHikers from '@/assets/img/card-ridge-hikers.jpg'
import cairnPhoto from '@/assets/img/cairn1.jpg'
import cairnMask from '@/assets/img/cairn1-mask.png'

// Stock photos behind the route lines until each route has its own photo.
const TILE_PHOTOS = [photoLakePeaks, photoAlpinePath, photoRidgeHikers, photoMistyLake]

const routes = ref([])
const loading = ref(true)
const error = ref('')
const searchTerm = ref('')
const distanceSort = ref('')
const selectedCountry = ref('')

const countries = computed(() => {
  const uniqueCountries = []

  for (const route of routes.value) {
    const country = route.country?.trim()
    if (!country) {
      continue
    }

    let isDuplicate = false
    for (const existingCountry of uniqueCountries) {
      if (existingCountry.toLocaleLowerCase() === country.toLocaleLowerCase()) {
        isDuplicate = true
        break
      }
    }

    if (!isDuplicate) {
      uniqueCountries.push(country)
    }
  }

  return uniqueCountries.sort((a, b) => a.localeCompare(b))
})

const filteredRoutes = computed(() => {
  const query = searchTerm.value.trim().toLocaleLowerCase()

  return routes.value.filter((route) => {
    // route names may be missing, so ?. avoids calling toLocaleLowerCase on undefined.
    const matchesName = !query || route.name?.toLocaleLowerCase().includes(query)
    const matchesCountry =
      !selectedCountry.value ||
      route.country?.trim().toLocaleLowerCase() === selectedCountry.value.toLocaleLowerCase()

    return matchesName && matchesCountry
  })
})

const displayedRoutes = computed(() => {
  if (!distanceSort.value) {
    return filteredRoutes.value
  }

  const direction = distanceSort.value === 'ascending' ? 1 : -1
  const sortedRoutes = filteredRoutes.value.slice()

  sortedRoutes.sort((routeA, routeB) => {
    const distanceA = Number(routeA.distance_km)
    const distanceB = Number(routeB.distance_km)
    const hasDistanceA =
      routeA.distance_km != null &&
      routeA.distance_km !== '' &&
      Number.isFinite(distanceA)
    const hasDistanceB =
      routeB.distance_km != null &&
      routeB.distance_km !== '' &&
      Number.isFinite(distanceB)

    if (hasDistanceA !== hasDistanceB) {
      return hasDistanceA ? -1 : 1
    }

    if (!hasDistanceA) {
      return 0
    }

    return (distanceA - distanceB) * direction
  })

  return sortedRoutes
})

function photoFor(route, index) {
  return TILE_PHOTOS[((route.name?.length ?? 0) + index) % TILE_PHOTOS.length]
}

// Banner parallax: the sky, the title and the mountain move at different speeds
const reduceMotion = useReducedMotion()
const { scrollY } = useScroll()
const skyY = useTransform(scrollY, (y) => (reduceMotion.value ? 0 : y * 0.6))
const titleY = useTransform(scrollY, (y) => (reduceMotion.value ? 0 : y * 0.45))
const frontY = useTransform(scrollY, (y) => (reduceMotion.value ? 0 : y * 0.05))
const introOpacity = useTransform(scrollY, (y) => (reduceMotion.value ? 1 : Math.max(0, 1 - y / 360)))

const bannerPhoto = `url(${cairnPhoto})`
const bannerMask = `url(${cairnMask})`

onMounted(async () => {
  try {
    routes.value = await fetchRoutes()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error.value = `Unable to load routes: ${message}`
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="cairn routes-page">
    <section class="routes-banner" aria-labelledby="routes-title">
      <motion.div
        class="routes-banner-layer routes-banner-sky"
        :style="{ y: skyY, backgroundImage: bannerPhoto }"
        role="img"
        aria-label="A cairn of flat stones on a grassy ridge below a snow-covered peak"
      />
      <motion.div class="routes-banner-layer routes-banner-title" :style="{ y: titleY }">
        <h1 id="routes-title">Find the line you'll walk.</h1>
      </motion.div>
      <motion.div
        class="routes-banner-layer routes-banner-front"
        :style="{ y: frontY, backgroundImage: bannerPhoto, maskImage: bannerMask, webkitMaskImage: bannerMask }"
        aria-hidden="true"
      />
      <div class="routes-banner-shade" aria-hidden="true"></div>
      <motion.div class="routes-banner-intro cairn-wrap" :style="{ opacity: introOpacity }">
        <p>Every route here is drawn from the path people actually walked, mapped in OpenStreetMap.</p>
        <label class="routes-banner-search">
          <span class="cairn-visually-hidden">Search routes by name</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4" /></svg>
          <input v-model="searchTerm" type="search" placeholder="Search a route, like Kinabalu" />
        </label>
      </motion.div>
    </section>

    <p v-if="loading" class="cairn-wrap routes-message" role="status">Loading routes...</p>
    <p v-else-if="error" class="cairn-wrap routes-message" role="alert">{{ error }}</p>
    <p v-else-if="routes.length === 0" class="cairn-wrap routes-message">No routes are available right now.</p>

    <section v-else class="cairn-wrap routes-results" aria-label="Route search results">
      <div class="row g-3 pt-5">
        <div class="col-md-6">
          <label class="form-label" for="distance-sort">Sort by distance</label>
          <select id="distance-sort" v-model="distanceSort" class="form-select">
            <option value="">Default order</option>
            <option value="ascending">Shortest first</option>
            <option value="descending">Longest first</option>
          </select>
        </div>

        <div class="col-md-6">
          <label class="form-label" for="country-filter">Filter by country</label>
          <select id="country-filter" v-model="selectedCountry" class="form-select">
            <option value="">All countries</option>
            <option v-for="country in countries" :key="country" :value="country">
              {{ country }}
            </option>
          </select>
        </div>
      </div>

      <div class="routes-results-top">
        <ul class="routes-key" aria-label="Difficulty key: line colour and label shape">
          <li v-for="grade in [1, 2, 3, 4]" :key="grade"><DifficultyMark :grade="grade" /></li>
        </ul>
      </div>

      <p v-if="displayedRoutes.length === 0" class="routes-no-match mb-0">
        No routes match the selected search and country filters.
      </p>

      <div v-else class="routes-tiles">
        <RouteTile
          v-for="(route, index) in displayedRoutes"
          :key="route.id"
          :route="route"
          :photo="photoFor(route, index)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Parallax banner: sky, title, then the mountain in front */
/* Fills the whole screen on arrival; the navbar sits on top of it */
.routes-banner {
  position: relative;
  height: 100vh;
  height: 100svh;
  min-height: 480px;
  overflow: hidden;
  background: linear-gradient(#2a5bbd, #3a72d4 60%);
  color: var(--white);
  isolation: isolate;
}

.routes-banner-layer {
  position: absolute;
  inset: 0 0 auto;
  height: 100%;
  pointer-events: none;
  will-change: transform;
}

.routes-banner-sky,
.routes-banner-front {
  background-position: 50% 8%;
  background-repeat: no-repeat;
  background-size: cover;
}

.routes-banner-front {
  z-index: 3;
  mask-position: 50% 8%;
  mask-repeat: no-repeat;
  mask-size: cover;
  -webkit-mask-position: 50% 8%;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: cover;
}

.routes-banner-title {
  z-index: 2;
  display: flex;
  justify-content: center;
  padding-top: clamp(140px, 20vh, 210px);
}

.routes-banner-title h1 {
  max-width: 12ch;
  font-size: clamp(48px, 8vw, 124px);
  line-height: 0.95;
  font-weight: 900;
  letter-spacing: -0.04em;
  text-align: center;
  text-shadow: 0 4px 24px rgb(0 0 0 / 0.22);
  text-wrap: balance;
}

.routes-banner-shade {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent 45%, rgb(14 28 22 / 0.55) 82%, var(--pine) 100%);
}

.routes-banner-intro {
  position: absolute;
  left: 0;
  right: 0;
  bottom: clamp(56px, 9vh, 96px);
  z-index: 5;
  text-align: center;
}

.routes-banner-intro p {
  max-width: 46ch;
  margin: 0 auto;
  color: rgb(255 255 255 / 0.95);
  font-size: 17px;
  line-height: 26px;
  font-weight: 700;
  text-shadow: 0 1px 12px rgb(0 0 0 / 0.4);
  text-wrap: pretty;
}

.routes-banner-search {
  position: relative;
  display: block;
  width: min(560px, 100%);
  margin: 28px auto 0;
}

.routes-banner-search svg {
  position: absolute;
  top: 50%;
  left: 4px;
  width: 22px;
  height: 22px;
  translate: 0 -50%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  pointer-events: none;
}

.routes-banner-search input {
  width: 100%;
  min-height: 56px;
  padding-left: 40px;
  border: 0;
  border-bottom: 2px solid var(--white);
  border-radius: 0;
  background: transparent;
  color: var(--white);
  caret-color: var(--white);
  font: 400 18px var(--font);
}

.routes-banner-search input::placeholder {
  color: var(--white);
  opacity: 1;
  text-shadow: 0 1px 8px rgb(0 0 0 / 0.45);
}

.routes-banner-search input:focus {
  outline: none;
  border-bottom-color: var(--glacier);
}

.routes-results {
  padding-bottom: 120px;
}

.routes-results-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding: 28px 0;
}

.routes-key {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin: 0 0 0 auto;
  padding: 0;
  list-style: none;
  font-size: 13px;
}

.routes-tiles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 56px 28px;
}

@media (max-width: 1100px) {
  .routes-tiles {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .routes-tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 40px 16px;
  }
}

@media (max-width: 700px) {
  .routes-key {
    width: 100%;
    margin-left: 0;
  }
}

.routes-no-match {
  border: 1px solid currentColor;
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
}

.routes-message {
  padding-top: 48px;
  padding-bottom: 96px;
}

@media (max-width: 640px) {
  .routes-banner-sky,
  .routes-banner-front {
    background-position: 50% 4%;
    mask-position: 50% 4%;
    -webkit-mask-position: 50% 4%;
  }

  .routes-banner-title {
    padding-top: calc(var(--nav-height) + 32px);
  }
}
</style>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchRoutes } from '../controller/routesController'
import DifficultyMark from '@/components/common/DifficultyMark.vue'
import RouteTile from '@/components/routes/RouteTile.vue'
import photoAlpinePath from '@/assets/img/card-alpine-path.jpg'
import photoLakePeaks from '@/assets/img/card-lake-peaks.jpg'
import photoMistyLake from '@/assets/img/card-misty-lake.jpg'
import photoRidgeHikers from '@/assets/img/card-ridge-hikers.jpg'

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
  <div class="cairn-wrap py-5">
    <header class="routes-heading mb-5">
      <p class="routes-eyebrow mb-2">Explore</p>
      <h1 class="display-5 fw-semibold mb-3">All routes</h1>
      <p class="lead mb-0">Find a route that fits your plans and experience.</p>
    </header>

    <p v-if="loading" class="mb-0" role="status">Loading routes...</p>
    <p v-else-if="error" class="routes-message mb-0" role="alert">{{ error }}</p>
    <p v-else-if="routes.length === 0" class="routes-message mb-0">
      No routes are available right now.
    </p>

    <section v-else class="routes-results" aria-label="Route search results">
      <div class="mb-4">
        <label class="form-label" for="route-search">Search routes by name</label>
        <input
          id="route-search"
          v-model="searchTerm"
          class="form-control"
          type="search"
          placeholder="e.g. Mount Example"
        />
      </div>

      <div class="row g-3 mb-4">
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

      <p v-if="displayedRoutes.length === 0" class="routes-message mb-0">
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
  </div>
</template>

<style scoped>
.routes-heading {
  max-width: 760px;
}

.routes-eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
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

.routes-message {
  border: 1px solid currentColor;
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
}
</style>

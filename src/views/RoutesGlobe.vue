<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Map as MapLibreMap, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useRouter } from 'vue-router'
import { fetchRoutes } from '../controller/routesController'

const maptilerKey = import.meta.env.VITE_MAPTILER_KEY
// MapTiler Outdoor shows peaks, contours, huts and trails; fall back to Carto if no key is set
const mapStyle = maptilerKey
  ? `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${maptilerKey}`
  : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

const router = useRouter()
const globeHost = ref(null)
const routes = ref([])
const loading = ref(true)
const error = ref('')
const mapError = ref('')
let globeView
let activePopup
let routeFetchReady = false
let routeOverlayReady = false
let routeInteractionReady = false

function isPosition(position) {
  return (
    Array.isArray(position) &&
    position.length >= 2 &&
    Number.isFinite(position[0]) &&
    Number.isFinite(position[1])
  )
}

function isLineString(coordinates) {
  return Array.isArray(coordinates) && coordinates.length >= 2 && coordinates.every(isPosition)
}

function hasRenderableGeometry(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) {
    return false
  }

  if (geometry.type === 'LineString') {
    return isLineString(geometry.coordinates)
  }

  return (
    geometry.type === 'MultiLineString' &&
    geometry.coordinates.length > 0 &&
    geometry.coordinates.every(isLineString)
  )
}

const routesWithGeometry = computed(() =>
  routes.value.filter((route) => hasRenderableGeometry(route.geometry)),
)
const routesWithoutGeometry = computed(() =>
  routes.value.filter((route) => !hasRenderableGeometry(route.geometry)),
)

function difficultyLevel(route) {
  const value =
    route.effective_difficulty ?? route.official_difficulty ?? route.technical_rating
  const labels = {
    easy: 1,
    moderate: 2,
    hard: 3,
    strenuous: 4,
  }
  const numericValue =
    typeof value === 'string' && Object.hasOwn(labels, value.toLocaleLowerCase())
      ? labels[value.toLocaleLowerCase()]
      : Number(value)

  return Number.isFinite(numericValue) ? Math.min(4, Math.max(1, Math.round(numericValue))) : null
}

function routeMarkerPosition(geometry) {
  const lines = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates
  for (const line of lines) {
    if (line.length > 0) {
      return line[0]
    }
  }

  return null
}

function formatRouteDistance(distance) {
  if (distance == null || distance === '' || !Number.isFinite(Number(distance))) {
    return 'Route'
  }

  return `${Number(distance).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`
}

function updateRouteLayer() {
  if (!globeView || !routeFetchReady) {
    return
  }

  const features = []
  for (const route of routesWithGeometry.value) {
    const difficulty = difficultyLevel(route)
    const name = route.name || 'Unnamed route'
    const distanceLabel = formatRouteDistance(route.distance_km)
    features.push({
      type: 'Feature',
      properties: {
        routeId: route.id,
        featureType: 'route',
        name,
        country: route.country || '',
        difficulty,
        distanceLabel,
      },
      geometry: route.geometry,
    })

    const position = routeMarkerPosition(route.geometry)
    if (position) {
      features.push({
        type: 'Feature',
        properties: {
          routeId: route.id,
          featureType: 'marker',
          name,
          country: route.country || '',
          distanceLabel,
          difficulty,
        },
        geometry: {
          type: 'Point',
          coordinates: position,
        },
      })
    }
  }

  const data = {
    type: 'FeatureCollection',
    features,
  }

  if (!routeOverlayReady) {
    return
  }

  let routeSource = globeView.getSource('route-geometries')
  if (!routeSource) {
    globeView.addSource('route-geometries', {
      type: 'geojson',
      data,
    })
    for (const layer of addRouteLayersToStyle()) {
      globeView.addLayer(layer)
    }
  } else {
    routeSource.setData(data)
  }

  if (!routeInteractionReady && globeView.getLayer('route-marker-dots')) {
    setupRouteInteraction()
    routeInteractionReady = true
  }
}

function showRoutePopup(event) {
  const feature = event.features?.[0]
  if (!feature) {
    return
  }

  const details = [
    feature.properties?.name || 'Unnamed route',
    feature.properties?.country,
    feature.properties?.distanceLabel,
  ].filter(Boolean)

  const content = document.createElement('div')
  const text = document.createElement('p')
  text.className = 'mb-2'
  text.textContent = details.join(' — ')
  content.appendChild(text)

  const viewMoreButton = document.createElement('button')
  viewMoreButton.type = 'button'
  viewMoreButton.className = 'btn btn-sm btn-primary'
  viewMoreButton.textContent = 'View more'
  viewMoreButton.addEventListener('click', () => {
    router.push({ name: 'route-detail', params: { id: feature.properties.routeId } })
  })
  content.appendChild(viewMoreButton)

  // Clicking where a marker and line overlap fires both handlers, so keep only one popup open
  activePopup?.remove()
  activePopup = new Popup().setLngLat(event.lngLat).setDOMContent(content).addTo(globeView)
}

function addRouteLayersToStyle() {
  return [
    {
      id: 'route-casing',
      type: 'line',
      source: 'route-geometries',
      filter: ['==', ['get', 'featureType'], 'route'],
      paint: {
        'line-color': '#fff7e9',
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, 2, 8, 6],
      },
    },
    {
      id: 'route-lines',
      type: 'line',
      source: 'route-geometries',
      filter: ['==', ['get', 'featureType'], 'route'],
      paint: {
        'line-color': [
          'match',
          ['get', 'difficulty'],
          1,
          '#24883b',
          2,
          '#e6b700',
          3,
          '#ec741c',
          4,
          '#cb3030',
          '#64748b',
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, 1, 8, 3],
      },
    },
    {
      id: 'route-marker-dots',
      type: 'circle',
      source: 'route-geometries',
      filter: ['==', ['get', 'featureType'], 'marker'],
      paint: {
        'circle-color': [
          'match',
          ['get', 'difficulty'],
          1,
          '#24883b',
          2,
          '#e6b700',
          3,
          '#ec741c',
          4,
          '#cb3030',
          '#64748b',
        ],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 5, 7, 10, 10],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    },
  ]
}

function setupRouteInteraction() {
  globeView.on('click', 'route-marker-dots', (event) => {
    showRoutePopup(event)
  })
  globeView.on('mouseenter', 'route-marker-dots', () => {
    globeView.getCanvas().style.cursor = 'pointer'
  })
  globeView.on('mouseleave', 'route-marker-dots', () => {
    globeView.getCanvas().style.cursor = ''
  })
  globeView.on('click', 'route-lines', showRoutePopup)
  globeView.on('mouseenter', 'route-lines', () => {
    globeView.getCanvas().style.cursor = 'pointer'
  })
  globeView.on('mouseleave', 'route-lines', () => {
    globeView.getCanvas().style.cursor = ''
  })
}

onMounted(async () => {
  try {
    globeView = new MapLibreMap({
      container: globeHost.value,
      style: mapStyle,
      center: [119, 9],
      zoom: 2.5,
      pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
    })
    globeView.on('error', (event) => {
      if (event.error) {
        mapError.value = `Globe rendering error: ${event.error.message}`
      }
    })
    globeView.once('style.load', () => {
      globeView.setProjection({ type: 'globe' })
      // Force English labels on the Carto fallback only, so MapTiler keeps its peak heights in labels
      for (const layer of maptilerKey ? [] : globeView.getStyle().layers) {
        const textField = layer.layout?.['text-field']
        if (layer.type === 'symbol' && JSON.stringify(textField ?? '').includes('name')) {
          globeView.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name_en'],
            ['get', 'name:en'],
            ['get', 'name:latin'],
          ])
        }
      }
      routeOverlayReady = true
      updateRouteLayer()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    mapError.value = `Unable to initialize the globe: ${message}`
  }

  try {
    routes.value = await fetchRoutes()
    routeFetchReady = true
    updateRouteLayer()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error.value = `Unable to load routes: ${message}`
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  globeView?.remove()
})
</script>

<template>
  <main class="globe-page">
    <header class="globe-heading">
      <p class="globe-eyebrow">Explore</p>
      <h1>Routes around the globe</h1>
      <p>Browse the route geometry stored with each route in Supabase.</p>
    </header>

    <p v-if="loading" class="globe-status" role="status">Loading routes...</p>
    <p v-if="error" class="globe-status globe-error" role="alert">{{ error }}</p>
    <p v-if="mapError" class="globe-status globe-error" role="alert">{{ mapError }}</p>

    <section class="globe-summary" aria-live="polite">
      <p v-if="loading" class="mb-0">Preparing route data...</p>
      <template v-else>
        <p class="mb-0">
          Showing <strong>{{ routesWithGeometry.length }}</strong> of
          <strong>{{ routes.length }}</strong> routes with saved geometry.
          Click a route to see its name and view more details.
        </p>
        <details v-if="routesWithoutGeometry.length" class="missing-routes">
          <summary>
            {{ routesWithoutGeometry.length }} route{{
              routesWithoutGeometry.length === 1 ? '' : 's'
            }}
            missing usable geometry
          </summary>
          <ul class="mb-0">
            <li v-for="route in routesWithoutGeometry" :key="route.id">
              {{ route.name || route.id }}
            </li>
          </ul>
        </details>
        <p v-else-if="routes.length" class="geometry-complete mb-0">
          Every route has usable geometry.
        </p>
        <p v-else class="mb-0">No routes are available right now.</p>
      </template>
    </section>

    <ul class="difficulty-legend" aria-label="Route difficulty colors">
      <li><span class="legend-swatch difficulty-easy"></span>Easy</li>
      <li><span class="legend-swatch difficulty-moderate"></span>Moderate</li>
      <li><span class="legend-swatch difficulty-hard"></span>Hard</li>
      <li><span class="legend-swatch difficulty-strenuous"></span>Strenuous</li>
    </ul>

    <div
      ref="globeHost"
      class="globe-surface"
      role="region"
      aria-label="Interactive globe"
      aria-roledescription="3D globe"
    ></div>
  </main>
</template>

<style scoped>
.globe-page {
  width: min(100% - 2rem, 1440px);
  margin: 0 auto;
  padding: 3rem 0;
}

.globe-heading {
  margin-bottom: 1.5rem;
}

.globe-heading h1 {
  margin-bottom: 0.75rem;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 650;
}

.globe-heading > p:last-child {
  margin-bottom: 0;
}

.globe-eyebrow {
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.globe-summary,
.globe-status {
  margin-bottom: 1rem;
}

.missing-routes {
  margin-top: 0.5rem;
}

.missing-routes ul {
  margin-top: 0.5rem;
}

.geometry-complete {
  margin-top: 0.5rem;
}

.globe-error {
  color: #a52a2a;
}

.difficulty-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
}

.difficulty-legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.legend-swatch {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
}

.difficulty-easy {
  background: #24883b;
}

.difficulty-moderate {
  background: #e6b700;
}

.difficulty-hard {
  background: #ec741c;
}

.difficulty-strenuous {
  background: #cb3030;
}

.globe-surface {
  width: 100%;
  height: min(78vh, 900px);
  min-height: 480px;
  overflow: hidden;
  border-radius: 1rem;
  background: #111827;
}

@media (max-width: 575px) {
  .globe-page {
    width: min(100% - 1.25rem, 1440px);
    padding: 2rem 0;
  }

  .globe-surface {
    height: 68vh;
    min-height: 400px;
  }
}
</style>

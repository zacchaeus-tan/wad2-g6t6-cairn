<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'
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
let hoverPopup
// Pill labels currently on the map, keyed by cluster or route id
let markerLabels = new Map()
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

function formatRouteDuration(days) {
  if (days == null || days === '') {
    return 'Not listed'
  }

  return `${days} ${Number(days) === 1 ? 'day' : 'days'}`
}

const difficultyNames = { 1: 'Easy', 2: 'Moderate', 3: 'Hard', 4: 'Strenuous' }

function updateRouteLayer() {
  if (!globeView || !routeFetchReady) {
    return
  }

  const lineFeatures = []
  const markerFeatures = []
  for (const route of routesWithGeometry.value) {
    const difficulty = difficultyLevel(route)
    const properties = {
      routeId: route.id,
      name: route.name || 'Unnamed route',
      country: route.country || 'Not listed',
      difficulty,
      difficultyLabel: difficultyNames[difficulty] ?? 'Not rated',
      durationLabel: formatRouteDuration(route.duration_days),
      distanceLabel: formatRouteDistance(route.distance_km),
      ratingLabel: route.avg_rating == null ? '' : Number(route.avg_rating).toFixed(1),
    }
    lineFeatures.push({
      type: 'Feature',
      properties: { ...properties, featureType: 'route' },
      geometry: route.geometry,
    })

    const position = routeMarkerPosition(route.geometry)
    if (position) {
      markerFeatures.push({
        type: 'Feature',
        properties: { ...properties, featureType: 'marker' },
        geometry: {
          type: 'Point',
          coordinates: position,
        },
      })
    }
  }

  const lineData = {
    type: 'FeatureCollection',
    features: lineFeatures,
  }
  const markerData = {
    type: 'FeatureCollection',
    features: markerFeatures,
  }

  if (!routeOverlayReady) {
    return
  }

  let routeSource = globeView.getSource('route-geometries')
  if (!routeSource) {
    globeView.addSource('route-geometries', {
      type: 'geojson',
      data: lineData,
    })
    // Markers get their own source so nearby ones can be grouped into clusters when zoomed out
    globeView.addSource('route-markers', {
      type: 'geojson',
      data: markerData,
      cluster: true,
      clusterRadius: 50,
      clusterMaxZoom: 12,
    })
    for (const layer of addRouteLayersToStyle()) {
      globeView.addLayer(layer)
    }
  } else {
    routeSource.setData(lineData)
    globeView.getSource('route-markers').setData(markerData)
  }

  if (!routeInteractionReady && globeView.getLayer('route-lines')) {
    setupRouteInteraction()
    routeInteractionReady = true
  }
}

function addTextElement(parent, tag, className, text) {
  const element = document.createElement(tag)
  element.className = className
  element.textContent = text
  parent.appendChild(element)
  return element
}

// Route details card, shared by the hover and click popups
function buildRouteCard(properties) {
  const colour = difficultyColour(properties.difficulty)
  const card = document.createElement('div')
  card.className = 'route-card'

  const body = document.createElement('div')
  body.className = 'route-card-body'
  addTextElement(body, 'p', 'route-card-title', properties.name)
  addTextElement(body, 'p', 'route-card-location', properties.country)

  const difficultyRow = document.createElement('p')
  difficultyRow.className = 'route-card-meta'
  if (properties.ratingLabel) {
    difficultyRow.appendChild(document.createTextNode(`★ ${properties.ratingLabel} · `))
  }
  const square = addTextElement(difficultyRow, 'span', 'route-card-square', '')
  square.style.background = colour
  difficultyRow.appendChild(document.createTextNode(properties.difficultyLabel))
  body.appendChild(difficultyRow)

  addTextElement(
    body,
    'p',
    'route-card-meta',
    `${properties.distanceLabel} · Est. ${properties.durationLabel}`,
  )
  card.appendChild(body)

  return card
}

function showHoverPopup(properties, lngLat) {
  hoverPopup?.remove()
  hoverPopup = new Popup({
    className: 'route-card-popup',
    closeButton: false,
    closeOnClick: false,
    maxWidth: '380px',
    offset: 18,
  })
    .setLngLat(lngLat)
    .setDOMContent(buildRouteCard(properties))
    .addTo(globeView)
}

function hideHoverPopup() {
  hoverPopup?.remove()
  hoverPopup = null
}

function showRoutePopup(properties, lngLat) {
  const content = buildRouteCard(properties)
  const viewMoreButton = document.createElement('button')
  viewMoreButton.type = 'button'
  viewMoreButton.className = 'btn btn-sm btn-dark mt-2'
  viewMoreButton.textContent = 'View more'
  viewMoreButton.addEventListener('click', () => {
    router.push({ name: 'route-detail', params: { id: properties.routeId } })
  })
  content.querySelector('.route-card-body').appendChild(viewMoreButton)

  hideHoverPopup()
  activePopup?.remove()
  const popup = new Popup({ className: 'route-card-popup', maxWidth: '380px', offset: 18 })
    .setLngLat(lngLat)
    .setDOMContent(content)
    .addTo(globeView)
  // Close the card once the cursor moves into it and then leaves it
  popup.getElement().addEventListener('mouseleave', () => popup.remove())
  activePopup = popup
}

function difficultyColour(difficulty) {
  return { 1: '#24883b', 2: '#e6b700', 3: '#ec741c', 4: '#cb3030' }[difficulty] ?? '#64748b'
}

function createClusterLabel(feature) {
  const clusterId = feature.properties.cluster_id
  const coordinates = feature.geometry.coordinates
  const element = document.createElement('button')
  element.type = 'button'
  element.className = 'map-pill'
  element.textContent = `${feature.properties.point_count} routes`
  element.addEventListener('click', () => zoomIntoCluster(clusterId, coordinates))
  return new Marker({ element }).setLngLat(coordinates).addTo(globeView)
}

// A single route is shown as a pill with its distance and a dot in its difficulty colour
function createRouteLabel(feature) {
  const properties = feature.properties
  const coordinates = feature.geometry.coordinates
  const element = document.createElement('button')
  element.type = 'button'
  element.className = 'map-pill'

  const dot = document.createElement('span')
  dot.className = 'map-pill-dot'
  dot.style.background = difficultyColour(properties.difficulty)
  element.appendChild(dot)
  element.appendChild(document.createTextNode(properties.distanceLabel))

  element.addEventListener('mouseenter', () => showHoverPopup(properties, coordinates))
  element.addEventListener('mouseleave', hideHoverPopup)
  element.addEventListener('click', (event) => {
    // Stop the map's own click from closing the popup straight away
    event.stopPropagation()
    showRoutePopup(properties, coordinates)
  })
  return new Marker({ element }).setLngLat(coordinates).addTo(globeView)
}

async function zoomIntoCluster(clusterId, coordinates) {
  const zoom = await globeView.getSource('route-markers').getClusterExpansionZoom(clusterId)
  globeView.easeTo({ center: coordinates, zoom })
}

// Draw clusters as "N routes" pills and single routes as distance pills,
// adding new ones and removing ones that have merged or split up
function updateMarkerLabels() {
  if (!globeView.getSource('route-markers') || !globeView.isSourceLoaded('route-markers')) {
    return
  }

  const nextLabels = new Map()
  for (const feature of globeView.querySourceFeatures('route-markers')) {
    const isCluster = Boolean(feature.properties.cluster)
    const key = isCluster
      ? `cluster-${feature.properties.cluster_id}`
      : `route-${feature.properties.routeId}`
    if (nextLabels.has(key)) {
      continue
    }

    const label =
      markerLabels.get(key) ?? (isCluster ? createClusterLabel(feature) : createRouteLabel(feature))
    nextLabels.set(key, label)
  }

  for (const [key, label] of markerLabels) {
    if (!nextLabels.has(key)) {
      // A removed pill never fires mouseleave, so close its hover card here
      if (label.getElement().matches(':hover')) {
        hideHoverPopup()
      }
      label.remove()
    }
  }
  markerLabels = nextLabels
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
      // Invisible, but MapLibre only loads (and clusters) a source when a layer uses it.
      // The visible pills are HTML markers drawn by updateMarkerLabels().
      id: 'route-marker-anchors',
      type: 'circle',
      source: 'route-markers',
      paint: {
        'circle-radius': 0,
        'circle-opacity': 0,
      },
    },
  ]
}

function setupRouteInteraction() {
  globeView.on('render', updateMarkerLabels)
  // Zooming or panning moves the pill out from under the cursor, so close any hover card
  globeView.on('movestart', hideHoverPopup)
  // Zooming can merge the clicked pill into a cluster, leaving its card pointing at nothing
  globeView.on('zoomstart', () => activePopup?.remove())
  globeView.on('click', 'route-lines', (event) => {
    const feature = event.features?.[0]
    if (feature) {
      showRoutePopup(feature.properties, event.lngLat)
    }
  })
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
      // Hide MapTiler's own hiking and cycling trails so only our routes are drawn in colour
      for (const layer of globeView.getStyle().layers) {
        if (layer['source-layer'] === 'trail') {
          globeView.setLayoutProperty(layer.id, 'visibility', 'none')
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
          Hover over a route to see its details, or click it to view more.
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

/* Cluster labels are created by MapLibre outside the template, so they need :deep() */
.globe-surface :deep(.map-pill) {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  border: 0;
  border-radius: 999px;
  background: #ffffff;
  color: #111827;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.globe-surface :deep(.map-pill:hover) {
  background: #111827;
  color: #ffffff;
}

/* Hover/click card, styled like a trail preview card */
.globe-surface :deep(.route-card-popup .maplibregl-popup-content) {
  padding: 0;
  overflow: hidden;
  border-radius: 0.9rem;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.globe-surface :deep(.route-card-popup .maplibregl-popup-tip) {
  display: none;
}

.globe-surface :deep(.route-card-popup .maplibregl-popup-close-button) {
  top: 0.35rem;
  right: 0.5rem;
  font-size: 1.1rem;
}

.globe-surface :deep(.route-card) {
  min-width: 240px;
}

.globe-surface :deep(.route-card-body) {
  padding: 0.75rem 1.75rem 0.75rem 1rem;
}

.globe-surface :deep(.route-card-title) {
  margin-bottom: 0.15rem;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.25;
  color: #111827;
}

.globe-surface :deep(.route-card-location) {
  margin-bottom: 0.3rem;
  color: #6b7280;
}

.globe-surface :deep(.route-card-meta) {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.15rem;
  color: #374151;
}

.globe-surface :deep(.route-card-square) {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 2px;
}

.globe-surface :deep(.map-pill-dot) {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
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

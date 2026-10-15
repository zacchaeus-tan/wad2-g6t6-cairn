<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useRouter } from 'vue-router'
import { fetchRoutes } from '../controller/routesController'

const maptilerKey = import.meta.env.VITE_MAPTILER_KEY
// MapTiler Outdoor shows peaks, contours, huts and trails; fall back to Carto if no key is set
const mapStyle = maptilerKey
  ? `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${maptilerKey}`
  : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

// Plain land/ocean tiles for the flat-coloured globe look; both use the OpenMapTiles layer names
const baseTilesUrl = maptilerKey
  ? `https://api.maptiler.com/tiles/v3/tiles.json?key=${maptilerKey}`
  : 'https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json'

// The globe view used once the user starts exploring, centred on our routes in Southeast Asia
const exploreView = { center: [119, 9], zoom: 2.5 }
const introMinimumMs = 2200
const spinDegreesPerMs = 360 / 150000

const router = useRouter()
const globeHost = ref(null)
const routes = ref([])
const loading = ref(true)
const error = ref('')
const mapError = ref('')
// 'intro' while loading, 'hero' shows the dim spinning globe, 'explore' lets the user interact
const phase = ref('intro')
const mapReady = ref(false)
const introTimeDone = ref(false)
const titleLetters = 'CAIRN'.split('')
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let introTimer
let spinFrame
let lastSpinTime
let touchStartY
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
        'line-opacity': routeLineOpacity(),
        'line-opacity-transition': { duration: 1200 },
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
        'line-opacity': routeLineOpacity(),
        'line-opacity-transition': { duration: 1200 },
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

function routeLineOpacity() {
  return phase.value === 'explore' ? 1 : 0
}

// Flat green land, blue ocean and thin borders drawn over the outdoor map.
// They fade out as the user zooms in, revealing the detailed trail map underneath.
function addGlobeBaseLayers() {
  const fadeOnZoom = ['interpolate', ['linear'], ['zoom'], 3, 1, 4.5, 0]
  globeView.addSource('globe-base', { type: 'vector', url: baseTilesUrl })
  globeView.addLayer({
    id: 'globe-land',
    type: 'background',
    paint: { 'background-color': '#b5d8a0', 'background-opacity': fadeOnZoom },
  })
  globeView.addLayer({
    id: 'globe-ocean',
    type: 'fill',
    source: 'globe-base',
    'source-layer': 'water',
    paint: { 'fill-color': '#8cc4ee', 'fill-opacity': fadeOnZoom },
  })
  globeView.addLayer({
    id: 'globe-borders',
    type: 'line',
    source: 'globe-base',
    'source-layer': 'boundary',
    filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
    paint: { 'line-color': '#ffffff', 'line-width': 0.6, 'line-opacity': fadeOnZoom },
  })
}

function setMapInteraction(enabled) {
  const handlers = [
    globeView.scrollZoom,
    globeView.dragPan,
    globeView.dragRotate,
    globeView.touchZoomRotate,
    globeView.doubleClickZoom,
    globeView.keyboard,
    globeView.boxZoom,
  ]
  for (const handler of handlers) {
    if (enabled) {
      handler.enable()
    } else {
      handler.disable()
    }
  }
}

// Turn the globe a little each frame, east to west like the real Earth
function spinGlobe(time) {
  if (lastSpinTime != null) {
    const center = globeView.getCenter()
    center.lng -= (time - lastSpinTime) * spinDegreesPerMs
    globeView.jumpTo({ center: center.wrap() })
  }
  lastSpinTime = time
  spinFrame = requestAnimationFrame(spinGlobe)
}

function stopSpinning() {
  cancelAnimationFrame(spinFrame)
  spinFrame = null
  lastSpinTime = null
}

function showHero() {
  phase.value = 'hero'
  if (globeView && !prefersReducedMotion) {
    spinFrame = requestAnimationFrame(spinGlobe)
  }
}

function startExploring() {
  if (phase.value !== 'hero') {
    return
  }

  phase.value = 'explore'
  stopSpinning()
  if (!globeView) {
    return
  }

  for (const layerId of ['route-casing', 'route-lines']) {
    if (globeView.getLayer(layerId)) {
      globeView.setPaintProperty(layerId, 'line-opacity', 1)
    }
  }
  // Only hand control to the user once the globe has settled on the routes
  globeView.once('moveend', () => setMapInteraction(true))
  globeView.easeTo({ ...exploreView, duration: prefersReducedMotion ? 0 : 2000 })
}

// Any downward scroll, swipe up or "next" key on the hero screen starts exploring
function onWheel(event) {
  if (event.deltaY > 0) {
    startExploring()
  }
}

function onTouchStart(event) {
  touchStartY = event.touches[0].clientY
}

function onTouchMove(event) {
  if (touchStartY - event.touches[0].clientY > 40) {
    startExploring()
  }
}

function onKeydown(event) {
  if (phase.value === 'hero' && ['ArrowDown', 'PageDown', ' ', 'Enter'].includes(event.key)) {
    event.preventDefault()
    startExploring()
  }
}

// Leave the intro once routes and globe are ready and the title animation has had time to play
watch([loading, mapReady, mapError, introTimeDone], () => {
  const globeSettled = mapReady.value || Boolean(mapError.value)
  if (phase.value === 'intro' && !loading.value && globeSettled && introTimeDone.value) {
    showHero()
  }
})

onMounted(async () => {
  introTimer = setTimeout(() => {
    introTimeDone.value = true
  }, introMinimumMs)
  window.addEventListener('keydown', onKeydown)

  try {
    globeView = new MapLibreMap({
      container: globeHost.value,
      style: mapStyle,
      center: [20, 15],
      zoom: 1.4,
      pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
    })
    setMapInteraction(false)
    globeView.on('error', (event) => {
      if (event.error) {
        mapError.value = `Globe rendering error: ${event.error.message}`
      }
    })
    globeView.once('load', () => {
      mapReady.value = true
    })
    globeView.once('style.load', () => {
      globeView.setProjection({ type: 'globe' })
      // No glow around the globe, so it sits cleanly on the dark background
      globeView.setSky({ 'atmosphere-blend': 0 })
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
        // Keep the zoomed-out globe free of place names, matching the flat-coloured look
        if (layer.type === 'symbol') {
          globeView.setLayerZoomRange(layer.id, Math.max(layer.minzoom ?? 0, 4), layer.maxzoom ?? 24)
        }
      }
      addGlobeBaseLayers()
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
  clearTimeout(introTimer)
  stopSpinning()
  window.removeEventListener('keydown', onKeydown)
  globeView?.remove()
})
</script>

<template>
  <div
    class="globe-page"
    :class="`is-${phase}`"
    @wheel.passive="onWheel"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
  >
    <div
      ref="globeHost"
      class="globe-surface"
      role="region"
      aria-label="Interactive globe"
      aria-roledescription="3D globe"
    ></div>

    <section class="globe-intro" :aria-hidden="phase === 'explore'">
      <h1 class="globe-title" aria-label="CAIRN">
        <span
          v-for="(letter, index) in titleLetters"
          :key="index"
          class="globe-title-letter"
          :style="{ animationDelay: `${index * 0.12}s` }"
          aria-hidden="true"
          >{{ letter }}</span
        >
      </h1>
      <p class="globe-tagline">Find your next trail, anywhere on Earth</p>

      <p v-if="phase === 'intro'" class="globe-loading" role="status">
        Loading routes<span class="globe-loading-dot">.</span
        ><span class="globe-loading-dot">.</span><span class="globe-loading-dot">.</span>
      </p>
      <button v-else type="button" class="globe-scroll-cue" @click="startExploring">
        Scroll to explore
        <span class="globe-scroll-arrow" aria-hidden="true">&darr;</span>
      </button>
    </section>

    <aside v-if="phase === 'explore'" class="globe-panel" aria-live="polite">
      <h2 class="globe-panel-title">Routes around the globe</h2>
      <p v-if="error" class="globe-error" role="alert">{{ error }}</p>
      <p v-if="mapError" class="globe-error" role="alert">{{ mapError }}</p>
      <template v-if="!error">
        <p class="mb-2">
          Showing <strong>{{ routesWithGeometry.length }}</strong> of
          <strong>{{ routes.length }}</strong> routes. Hover over a route to see its details, or
          click it to view more.
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
        <p v-else-if="!routes.length" class="mb-2">No routes are available right now.</p>
      </template>

      <ul class="difficulty-legend" aria-label="Route difficulty colors">
        <li><span class="legend-swatch difficulty-easy"></span>Easy</li>
        <li><span class="legend-swatch difficulty-moderate"></span>Moderate</li>
        <li><span class="legend-swatch difficulty-hard"></span>Hard</li>
        <li><span class="legend-swatch difficulty-strenuous"></span>Strenuous</li>
      </ul>
    </aside>
  </div>
</template>

<style scoped>
/* Fills the screen below the site header; the three phases are driven by the is-* class */
.globe-page {
  position: relative;
  height: calc(100dvh - 4rem - 1px);
  min-height: 480px;
  overflow: hidden;
  background: #2a2a2a;
  color: #ffffff;
  transition: background-color 1.5s ease;
}

.globe-page.is-explore {
  background: #000000;
}

.globe-surface {
  position: absolute;
  inset: 0;
  opacity: 0;
  filter: brightness(0.45) saturate(0.6);
  transition:
    opacity 1.5s ease,
    filter 1.5s ease;
}

.is-hero .globe-surface {
  opacity: 1;
}

.is-explore .globe-surface {
  opacity: 1;
  filter: none;
}

/* Title screen, covering the globe so it can't be dragged until the user explores */
.globe-intro {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
  transition:
    opacity 1s ease,
    transform 1s ease;
}

.is-explore .globe-intro {
  opacity: 0;
  transform: translateY(-3rem);
  pointer-events: none;
}

.globe-title {
  margin: 0;
  font-size: clamp(3.5rem, 12vw, 7.5rem);
  font-weight: 300;
  letter-spacing: 0.08em;
  line-height: 1;
}

.globe-title-letter {
  display: inline-block;
  opacity: 0;
  animation: letter-rise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}

.globe-tagline {
  margin: 0.5rem 0 0;
  font-size: clamp(1rem, 2.5vw, 1.4rem);
  font-weight: 300;
  letter-spacing: 0.06em;
  opacity: 0;
  animation: fade-in 1s ease 0.8s forwards;
}

.globe-loading {
  margin: 2.5rem 0 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  letter-spacing: 0.1em;
}

.globe-loading-dot {
  animation: dot-pulse 1.2s ease-in-out infinite;
}

.globe-loading-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.globe-loading-dot:nth-child(3) {
  animation-delay: 0.4s;
}

.globe-scroll-cue {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin-top: 2.5rem;
  border: 0;
  background: none;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  animation: fade-in 1s ease forwards;
}

.globe-scroll-cue:hover {
  color: #ffffff;
}

.globe-scroll-arrow {
  font-size: 1.3rem;
  animation: arrow-bob 1.6s ease-in-out infinite;
}

@keyframes letter-rise {
  from {
    opacity: 0;
    transform: translateY(0.4em);
    filter: blur(8px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: blur(0);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes dot-pulse {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 1;
  }
}

@keyframes arrow-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(0.35rem);
  }
}

/* Route info and legend, floating over the globe once exploring */
.globe-panel {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 3;
  width: min(22rem, calc(100% - 2rem));
  padding: 1rem 1.25rem;
  border-radius: 1rem;
  background: rgba(17, 24, 39, 0.85);
  font-size: 0.9rem;
  animation: fade-in 1s ease 1s both;
}

.globe-panel-title {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.missing-routes {
  margin-bottom: 0.75rem;
}

.missing-routes ul {
  margin-top: 0.5rem;
}

.globe-error {
  color: #fca5a5;
}

.difficulty-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin: 0;
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

/* Route pills stay hidden until the user starts exploring */
.globe-surface :deep(.map-pill) {
  transition: opacity 1.2s ease;
}

/* MapLibre sets marker opacity inline (to dim ones behind the globe), so this needs !important */
.globe-page:not(.is-explore) :deep(.map-pill) {
  opacity: 0 !important;
  pointer-events: none;
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
  .globe-panel {
    top: auto;
    bottom: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .globe-title-letter,
  .globe-tagline,
  .globe-scroll-cue,
  .globe-scroll-arrow,
  .globe-loading-dot,
  .globe-panel {
    animation: none;
    opacity: 1;
  }
}
</style>

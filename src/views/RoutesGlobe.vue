<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LngLatBounds, Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useRouter } from 'vue-router'
import { fetchRouteGeometry, fetchRouteSummaries } from '../controller/routesController'

const maptilerKey = import.meta.env.VITE_MAPTILER_KEY
// MapTiler Outdoor shows peaks, contours, huts and trails; fall back to Carto if no key is set
const mapStyle = maptilerKey
  ? `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${maptilerKey}`
  : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

// Plain land/ocean tiles for the flat-coloured globe look; both use the OpenMapTiles layer names
const baseTilesUrl = maptilerKey
  ? `https://api.maptiler.com/tiles/v3/tiles.json?key=${maptilerKey}`
  : 'https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json'

// Raster tiles are declared at half their real pixel size so the map fetches one zoom level
// deeper than usual. That gives one image pixel per screen pixel on high-DPI (retina) screens
// instead of stretching each image pixel over four, which made the photos look blurry.
// Satellite photos for the Google Earth-style view; Esri's free imagery if no MapTiler key is set
const satelliteSource = maptilerKey
  ? {
      type: 'raster',
      url: `https://api.maptiler.com/tiles/satellite-v2/tiles.json?key=${maptilerKey}`,
      tileSize: 256,
    }
  : {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 128,
      maxzoom: 19,
      attribution: 'Imagery &copy; Esri',
    }

// NASA's Blue Marble (with sea-floor shading) for the bright, blue zoomed-out globe like Google Earth.
// Its tiles stop at zoom 8, so it fades into the sharper satellite photos above as you zoom in.
const blueMarbleSource = {
  type: 'raster',
  tiles: [
    'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',
  ],
  tileSize: 128,
  maxzoom: 8,
  attribution: 'Imagery &copy; NASA',
}

// The globe view used once the user starts exploring, centred on our routes in Southeast Asia
const exploreView = { center: [119, 9], zoom: 2.5 }
const introMinimumMs = 2200
// How long the camera takes to dive onto a route, the longest it then waits for the satellite
// photos to sharpen, and how long the fade to black takes (matches .globe-route-dive::before)
const routeDiveMs = 2400
const routeTileWaitMs = 8000
const routeFadeMs = 600
const spinDegreesPerMs = 360 / 150000
// Route pills closer together than this are stacked so none is hidden behind another
const stackRadiusMetres = 100
const stackSpacingPx = 28

// Where the user was last looking, so coming back from a route's page skips the intro and lands
// in the same spot. sessionStorage works like localStorage but is cleared when the tab closes,
// so a fresh visit still gets the full intro.
const savedViewKey = 'cairn-globe-view'

function readSavedView() {
  try {
    const view = JSON.parse(sessionStorage.getItem(savedViewKey))
    return view && Array.isArray(view.center) && Number.isFinite(view.zoom) ? view : null
  } catch {
    return null
  }
}

const savedView = readSavedView()

const router = useRouter()
const globeHost = ref(null)
const routes = ref([])
const loading = ref(true)
const error = ref('')
const mapError = ref('')
// 'intro' while loading, 'hero' shows the dim spinning globe, 'explore' lets the user interact
const phase = ref('intro')
const styleReady = ref(false)
const mapReady = ref(false)
const satelliteView = ref(savedView?.satellite ?? true)
// A returning visitor has already seen the title animation, so there's nothing to wait for
const introTimeDone = ref(Boolean(savedView))
// Name of the route being opened, shown while the globe dives onto it
const openingRouteName = ref('')
const routeDiveFading = ref(false)
const titleLetters = 'CAIRN'.split('')
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let introTimer
let routeDiveTimer
let spinFrame
let lastSpinTime
let touchStartY
let globeView
let activePopup
let hoverPopup
// Route whose click card is open, so its line stays visible after the cursor leaves the pill
let pinnedRouteId = null
// Pill labels currently on the map, keyed by cluster or route id
let markerLabels = new Map()
// Each route's card details (name, labels, difficulty, stack offset), keyed by route id
let routeProperties = new Map()
// Route whose line is drawn or being downloaded to be drawn
let highlightedRouteId = null
let routeFetchReady = false
let routeOverlayReady = false
let routeInteractionReady = false
// The outdoor map's own layers drawn under the satellite photos (land, water, hillshade, contours)
let layersUnderSatellite = []

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

// A route's pill sits at its trailhead, which the latitude and longitude columns hold
function routePosition(route) {
  const position = [Number(route.longitude), Number(route.latitude)]
  return route.longitude != null && route.latitude != null && isPosition(position) ? position : null
}

const routesOnGlobe = computed(() => routes.value.filter((route) => routePosition(route)))
const routesNotOnGlobe = computed(() => routes.value.filter((route) => !routePosition(route)))

// Each route's line is only downloaded the first time it's needed, then kept by route id.
// The request itself is kept too, so hovering again mid-download doesn't fetch it twice.
const routeLineRequests = new Map()
// Finished downloads: route id -> its line, or null if it has no usable line
const routeLines = new Map()

function loadRouteLine(routeId) {
  if (!routeLineRequests.has(routeId)) {
    routeLineRequests.set(routeId, downloadRouteLine(routeId))
  }
  return routeLineRequests.get(routeId)
}

async function downloadRouteLine(routeId) {
  try {
    const geometry = await fetchRouteGeometry(routeId)
    const line = hasRenderableGeometry(geometry) ? geometry : null
    routeLines.set(routeId, line)
    return line
  } catch {
    // Forget the failed download so the next hover tries again
    routeLineRequests.delete(routeId)
    return null
  }
}

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

  const markerFeatures = []
  routeProperties = new Map()
  for (const route of routesOnGlobe.value) {
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
    routeProperties.set(route.id, properties)
    markerFeatures.push({
      type: 'Feature',
      properties,
      geometry: {
        type: 'Point',
        coordinates: routePosition(route),
      },
    })
  }

  // Also gives each route's properties its stackOffsetY, which the line's card uses too
  assignMarkerStacks(markerFeatures)

  const markerData = {
    type: 'FeatureCollection',
    features: markerFeatures,
  }

  if (!routeOverlayReady) {
    return
  }

  const markerSource = globeView.getSource('route-markers')
  if (!markerSource) {
    // Holds only the one route line on show, so changing it is quick
    globeView.addSource('route-highlight', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
    // Markers get their own source so nearby ones can be grouped into clusters when zoomed out
    globeView.addSource('route-markers', {
      type: 'geojson',
      data: markerData,
      cluster: true,
      clusterRadius: 50,
      // Pills only split out at zoom 16+, where routes more than stackRadiusMetres apart
      // are far enough apart on screen not to overlap
      clusterMaxZoom: 15,
    })
    for (const layer of addRouteLayersToStyle()) {
      globeView.addLayer(layer)
    }
  } else {
    markerSource.setData(markerData)
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

// Only one route's line is drawn at a time: the one being hovered, or the one whose card is open.
// Pass null to clear it.
async function showRouteGeometry(routeId) {
  highlightedRouteId = routeId
  const line = routeId ? await loadRouteLine(routeId) : null
  // The cursor may have moved to another route while this line was downloading
  const source = globeView?.getSource('route-highlight')
  if (highlightedRouteId !== routeId || !source) {
    return
  }

  source.setData({
    type: 'FeatureCollection',
    features: line ? [{ type: 'Feature', properties: routeProperties.get(routeId), geometry: line }] : [],
  })
}

function distanceInMetres([lng1, lat1], [lng2, lat2]) {
  const toRadians = Math.PI / 180
  const latDelta = (lat2 - lat1) * toRadians
  const lngDelta = (lng2 - lng1) * toRadians
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1 * toRadians) * Math.cos(lat2 * toRadians) * Math.sin(lngDelta / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(a))
}

// Several routes share a trailhead, so their pills would sit exactly on top of each other
// at every zoom. Routes starting close to each other are stacked into a column instead,
// each pill shifted up or down by its own pixel offset.
function assignMarkerStacks(markerFeatures) {
  const stacks = []
  for (const feature of markerFeatures) {
    const position = feature.geometry.coordinates
    const stack = stacks.find(
      (group) => distanceInMetres(group[0].geometry.coordinates, position) < stackRadiusMetres,
    )
    if (stack) {
      stack.push(feature)
    } else {
      stacks.push([feature])
    }
  }

  for (const stack of stacks) {
    // Northernmost pill on top, so zooming in (which spreads them north-south) never
    // pushes one pill back onto another
    stack.sort((a, b) => b.geometry.coordinates[1] - a.geometry.coordinates[1])
    stack.forEach((feature, index) => {
      feature.properties.stackOffsetY = (index - (stack.length - 1) / 2) * stackSpacingPx
    })
  }
}

// Keeps a route's card attached to its own pill when that pill is shifted within a stack
function popupOffset(offsetY = 0) {
  const gap = 18
  const corner = Math.round(gap / Math.SQRT2)
  return {
    center: [0, offsetY],
    top: [0, offsetY + gap],
    'top-left': [corner, offsetY + corner],
    'top-right': [-corner, offsetY + corner],
    bottom: [0, offsetY - gap],
    'bottom-left': [corner, offsetY - corner],
    'bottom-right': [-corner, offsetY - corner],
    left: [gap, offsetY],
    right: [-gap, offsetY],
  }
}

// The route's line as screen points, filled in every few pixels so a long straight
// segment still counts as crossing the card
function routeScreenPoints(routeId) {
  // Before the line has downloaded, the card just takes its default side
  const line = routeLines.get(routeId)
  if (!line) {
    return []
  }

  const lines = line.type === 'LineString' ? [line.coordinates] : line.coordinates
  const points = []
  for (const line of lines) {
    const projected = line.map((position) => globeView.project(position))
    projected.forEach((point, index) => {
      points.push(point)
      const next = projected[index + 1]
      if (!next) {
        return
      }
      const steps = Math.floor(Math.hypot(next.x - point.x, next.y - point.y) / 8)
      for (let step = 1; step < steps; step++) {
        const t = step / steps
        points.push({ x: point.x + (next.x - point.x) * t, y: point.y + (next.y - point.y) * t })
      }
    })
  }
  return points
}

// Where the card would sit on screen for each anchor (the anchor is the card's side touching the pill)
function cardRectForAnchor(anchor, pill, width, height, offsetY) {
  const [dx, dy] = popupOffset(offsetY)[anchor]
  const x = pill.x + dx
  const y = pill.y + dy
  const left = anchor.includes('left') ? x : anchor.includes('right') ? x - width : x - width / 2
  const top = anchor.startsWith('top') ? y : anchor.startsWith('bottom') ? y - height : y - height / 2
  return { left, top, right: left + width, bottom: top + height }
}

// Picks the side of the pill that covers the least of the route's line,
// preferring above the pill and then sides that keep the card inside the map
function anchorAwayFromRoute(routeId, lngLat, width, height, offsetY = 0) {
  const pill = globeView.project(lngLat)
  const points = routeScreenPoints(routeId)
  const canvas = globeView.getCanvas()
  const mapWidth = canvas.clientWidth
  const mapHeight = canvas.clientHeight
  const anchors = ['bottom', 'top', 'left', 'right', 'bottom-left', 'bottom-right', 'top-left', 'top-right']

  let bestAnchor = 'bottom'
  let bestScore = Infinity
  for (const anchor of anchors) {
    const rect = cardRectForAnchor(anchor, pill, width, height, offsetY)
    const covered = points.filter(
      (point) =>
        point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom,
    ).length
    const offScreen = rect.left < 0 || rect.top < 0 || rect.right > mapWidth || rect.bottom > mapHeight
    // Going off screen is worse than covering a little of the line
    const score = covered + (offScreen ? 50 : 0)
    if (score < bestScore) {
      bestScore = score
      bestAnchor = anchor
    }
  }
  return bestAnchor
}

// Adds the card once to measure it, then places it on the side away from its route
function addRouteCardPopup(options, content, properties, lngLat) {
  const measuringPopup = new Popup(options).setLngLat(lngLat).setDOMContent(content).addTo(globeView)
  const { width, height } = measuringPopup.getElement().getBoundingClientRect()
  measuringPopup.remove()

  const anchor = anchorAwayFromRoute(properties.routeId, lngLat, width, height, properties.stackOffsetY)
  return new Popup({ ...options, anchor }).setLngLat(lngLat).setDOMContent(content).addTo(globeView)
}

function showHoverPopup(properties, lngLat) {
  hoverPopup?.remove()
  hoverPopup = addRouteCardPopup(
    {
      className: 'route-card-popup',
      closeButton: false,
      closeOnClick: false,
      maxWidth: '380px',
      offset: popupOffset(properties.stackOffsetY),
    },
    buildRouteCard(properties),
    properties,
    lngLat,
  )
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
    openRouteDetails(properties, lngLat)
  })
  content.querySelector('.route-card-body').appendChild(viewMoreButton)

  hideHoverPopup()
  activePopup?.remove()
  pinnedRouteId = properties.routeId
  showRouteGeometry(pinnedRouteId)
  // Stays open (keeping its route highlighted) until the user clicks its close button
  const popup = addRouteCardPopup(
    {
      className: 'route-card-popup',
      closeOnClick: false,
      maxWidth: '380px',
      offset: popupOffset(properties.stackOffsetY),
    },
    content,
    properties,
    lngLat,
  )
  // Hide this route's line again once its card closes
  popup.on('close', () => {
    if (pinnedRouteId === properties.routeId) {
      pinnedRouteId = null
      showRouteGeometry(null)
    }
  })
  activePopup = popup
}

// Flies the camera down onto the route, fades to black, then opens its details page
async function openRouteDetails(properties, lngLat) {
  if (openingRouteName.value) {
    return
  }

  const detailsPage = { name: 'route-detail', params: { id: properties.routeId } }
  if (!globeView || prefersReducedMotion) {
    router.push(detailsPage)
    return
  }

  openingRouteName.value = properties.name
  setMapInteraction(false)
  hideHoverPopup()
  // Closing the card unpins its line, so pin it again to keep it drawn during the dive
  activePopup?.remove()
  activePopup = null
  pinnedRouteId = properties.routeId
  showRouteGeometry(pinnedRouteId)

  // Frame the whole route if it has a line (usually already downloaded when its card opened),
  // otherwise zoom in on its pill
  const line = await loadRouteLine(properties.routeId)
  // The user may have left the page while the line was downloading
  if (!globeView) {
    return
  }
  let camera = { center: lngLat, zoom: 13 }
  if (line) {
    const lines = line.type === 'LineString' ? [line.coordinates] : line.coordinates
    const bounds = new LngLatBounds()
    for (const line of lines) {
      for (const position of line) {
        bounds.extend(position)
      }
    }
    camera = globeView.cameraForBounds(bounds, { padding: 80, maxZoom: 12 }) ?? camera
  }

  // Zooming deeper or tilting further makes the map fetch far more satellite tiles
  globeView.flyTo({
    center: camera.center,
    zoom: Math.min(camera.zoom, 13),
    pitch: 45,
    bearing: 25,
    duration: routeDiveMs,
    essential: true,
  })
  globeView.once('moveend', () => fadeOutWhenSharp(detailsPage))
}

// Waits on the route until its satellite photos have finished loading (or for a few seconds
// on a slow connection), then fades to black and opens the details page
function fadeOutWhenSharp(detailsPage) {
  let fading = false
  function fadeOut() {
    if (fading) {
      return
    }
    fading = true
    clearTimeout(routeDiveTimer)
    routeDiveFading.value = true
    routeDiveTimer = setTimeout(() => router.push(detailsPage), routeFadeMs)
  }

  // 'idle' fires once every tile on screen has loaded and faded in
  globeView.once('idle', fadeOut)
  routeDiveTimer = setTimeout(fadeOut, routeTileWaitMs)
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
  // Start downloading the line now, so it's usually ready by the time the pill is hovered
  loadRouteLine(properties.routeId)

  element.addEventListener('mouseenter', () => {
    showHoverPopup(properties, coordinates)
    showRouteGeometry(properties.routeId)
  })
  element.addEventListener('mouseleave', () => {
    hideHoverPopup()
    showRouteGeometry(pinnedRouteId)
  })
  element.addEventListener('click', (event) => {
    // Stop the map's own click from closing the popup straight away
    event.stopPropagation()
    showRoutePopup(properties, coordinates)
  })
  return new Marker({ element, offset: [0, properties.stackOffsetY ?? 0] })
    .setLngLat(coordinates)
    .addTo(globeView)
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
        showRouteGeometry(pinnedRouteId)
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
      source: 'route-highlight',
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
      source: 'route-highlight',
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

// Drawn over the map's filled areas (land, water, buildings) but under its roads, borders and
// place names, like Google Earth's labels layer. Shown or hidden by applyMapType().
function addSatelliteLayers() {
  globeView.addSource('satellite', satelliteSource)
  globeView.addSource('blue-marble', blueMarbleSource)
  const layers = globeView.getStyle().layers
  const areaTypes = ['background', 'fill', 'fill-extrusion', 'hillshade', 'raster']
  const lastAreaIndex = layers.findLastIndex((layer) => areaTypes.includes(layer.type))
  const firstLineLayerId = layers[lastAreaIndex + 1]?.id
  layersUnderSatellite = layers
    .slice(0, lastAreaIndex + 1)
    .filter((layer) => layer.layout?.visibility !== 'none')
    .map((layer) => layer.id)
  globeView.addLayer({ id: 'satellite', type: 'raster', source: 'satellite' }, firstLineLayerId)
  globeView.addLayer(
    {
      id: 'blue-marble',
      type: 'raster',
      source: 'blue-marble',
      // Fully faded out by zoom 6; stopping the layer there also stops its tiles downloading,
      // so they don't hold up the satellite photos when zooming in
      maxzoom: 6,
      paint: {
        'raster-opacity': ['interpolate', ['linear'], ['zoom'], 4, 1, 6, 0],
        'raster-brightness-min': 0.14,
        'raster-saturation': 0.3,
      },
    },
    firstLineLayerId,
  )
}

// Satellite replaces the flat-coloured globe at every zoom, like Google Earth.
// Map mode keeps the flat colours.
function applyMapType(showSatellite) {
  if (!globeView?.getLayer('satellite')) {
    return
  }
  for (const layerId of ['satellite', 'blue-marble', 'clouds']) {
    // The clouds load separately, so they may not be on the map yet
    if (globeView.getLayer(layerId)) {
      globeView.setLayoutProperty(layerId, 'visibility', showSatellite ? 'visible' : 'none')
    }
  }
  // The satellite photos cover these completely, so turning them off also stops their data
  // (like the hillshade and contour tiles) downloading and holding up the dive onto a route
  for (const layerId of ['globe-land', 'globe-ocean', 'globe-borders', ...layersUnderSatellite]) {
    globeView.setLayoutProperty(layerId, 'visibility', showSatellite ? 'none' : 'visible')
  }
}

// NASA's cloud picture (public/clouds.jpg) is white clouds on black, stretched evenly from pole to
// pole. The map needs it in the Web Mercator projection with see-through gaps between clouds.
async function addCloudLayer() {
  const image = new Image()
  image.src = '/clouds.jpg'
  await image.decode()

  // Copy one row at a time into the Mercator position for that latitude
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.width
  const context = canvas.getContext('2d', { willReadFrequently: true })
  for (let y = 0; y < canvas.height; y++) {
    const mercatorY = Math.PI * (1 - (2 * (y + 0.5)) / canvas.height)
    const latitude = (Math.atan(Math.sinh(mercatorY)) * 180) / Math.PI
    const sourceY = ((90 - latitude) / 180) * image.height
    context.drawImage(image, 0, sourceY, image.width, 1, 0, y, canvas.width, 1)
  }

  // Brighter pixels are thicker cloud: make every pixel white and use its brightness as opacity
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < pixels.data.length; i += 4) {
    pixels.data[i + 3] = pixels.data[i]
    pixels.data[i] = 255
    pixels.data[i + 1] = 255
    pixels.data[i + 2] = 255
  }
  context.putImageData(pixels, 0, 0)

  // The map may have been closed while the picture was loading
  if (!globeView?.getStyle()) {
    return
  }
  const mercatorEdge = 85.051129
  globeView.addSource('clouds', {
    type: 'image',
    url: canvas.toDataURL(),
    coordinates: [
      [-180, mercatorEdge],
      [180, mercatorEdge],
      [180, -mercatorEdge],
      [-180, -mercatorEdge],
    ],
  })
  globeView.addLayer(
    {
      id: 'clouds',
      type: 'raster',
      source: 'clouds',
      maxzoom: 4.5,
      layout: { visibility: satelliteView.value ? 'visible' : 'none' },
      // Clouds fade away as you zoom in, so they never hide the trails
      paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.9, 4.5, 0] },
    },
    // Keep the clouds under the routes even if the routes were added first
    globeView.getLayer('route-casing') ? 'route-casing' : undefined,
  )
}

watch(satelliteView, (showSatellite) => {
  applyMapType(showSatellite)
  saveView()
})

function saveView() {
  // Not during the dive, so coming back lands where the user clicked rather than zoomed in on the route
  if (phase.value !== 'explore' || openingRouteName.value) {
    return
  }

  const center = globeView.getCenter()
  const view = {
    center: [center.lng, center.lat],
    zoom: globeView.getZoom(),
    bearing: globeView.getBearing(),
    pitch: globeView.getPitch(),
    satellite: satelliteView.value,
  }
  try {
    sessionStorage.setItem(savedViewKey, JSON.stringify(view))
  } catch {
    // Storage is blocked (e.g. some private windows): the globe just won't remember the view
  }
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

  showRouteLines()
  // Only hand control to the user once the globe has settled on the routes
  globeView.once('moveend', () => setMapInteraction(true))
  globeView.easeTo({ ...exploreView, duration: prefersReducedMotion ? 0 : 2000 })
}

// Coming back to the globe: skip the hero screen and carry on exploring from the saved view
function resumeExploring() {
  phase.value = 'explore'
  if (globeView) {
    showRouteLines()
    setMapInteraction(true)
  }
}

function showRouteLines() {
  for (const layerId of ['route-casing', 'route-lines']) {
    if (globeView.getLayer(layerId)) {
      globeView.setPaintProperty(layerId, 'line-opacity', 1)
    }
  }
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

// The steps the intro loading bar fills up with; a failed step counts as done so the bar still finishes
const loadingSteps = computed(() => [
  { label: 'Building the globe', done: styleReady.value || Boolean(mapError.value) },
  { label: 'Fetching routes', done: !loading.value },
  { label: 'Loading map imagery', done: mapReady.value || Boolean(mapError.value) },
])

const loadingProgress = computed(() => {
  const doneCount = loadingSteps.value.filter((step) => step.done).length
  return Math.round((doneCount / loadingSteps.value.length) * 100)
})

const loadingMessage = computed(() => {
  const nextStep = loadingSteps.value.find((step) => !step.done)
  if (nextStep) {
    return `${nextStep.label}...`
  }
  return error.value ? 'Ready' : `Ready: ${routes.value.length} routes found`
})

// Leave the intro once routes and globe are ready and the title animation has had time to play
watch([loading, mapReady, mapError, introTimeDone], () => {
  const globeSettled = mapReady.value || Boolean(mapError.value)
  if (phase.value === 'intro' && !loading.value && globeSettled && introTimeDone.value) {
    if (savedView) {
      resumeExploring()
    } else {
      showHero()
    }
  }
})

onMounted(async () => {
  if (!introTimeDone.value) {
    introTimer = setTimeout(() => {
      introTimeDone.value = true
    }, introMinimumMs)
  }
  window.addEventListener('keydown', onKeydown)

  try {
    globeView = new MapLibreMap({
      container: globeHost.value,
      style: mapStyle,
      center: savedView?.center ?? [20, 15],
      zoom: savedView?.zoom ?? 1.4,
      bearing: savedView?.bearing ?? 0,
      pitch: savedView?.pitch ?? 0,
      pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
    })
    setMapInteraction(false)
    globeView.on('moveend', saveView)
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
      // No glow around the globe, so it sits cleanly on the background
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
      addSatelliteLayers()
      addGlobeBaseLayers()
      applyMapType(satelliteView.value)
      addCloudLayer()
      routeOverlayReady = true
      updateRouteLayer()
      styleReady.value = true
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    mapError.value = `Unable to initialize the globe: ${message}`
  }

  try {
    routes.value = await fetchRouteSummaries()
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
  clearTimeout(routeDiveTimer)
  stopSpinning()
  window.removeEventListener('keydown', onKeydown)
  globeView?.remove()
  // Lets route lines that finish downloading after the page closes see there's no map to draw on
  globeView = null
})
</script>

<template>
  <div
    class="globe-page"
    :class="[`is-${phase}`, { 'is-satellite': satelliteView }]"
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

      <div v-if="phase === 'intro'" class="globe-loading">
        <div
          class="progress"
          role="progressbar"
          aria-label="Loading routes"
          :aria-valuenow="loadingProgress"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="progress-bar" :style="{ width: `${loadingProgress}%` }"></div>
        </div>
        <p class="globe-loading-text" role="status">
          {{ loadingMessage }} <span class="globe-loading-percent">{{ loadingProgress }}%</span>
        </p>
      </div>
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
          Showing <strong>{{ routesOnGlobe.length }}</strong> of
          <strong>{{ routes.length }}</strong> routes. Hover over a route to see its details, or
          click it to view more.
        </p>
        <details v-if="routesNotOnGlobe.length" class="missing-routes">
          <summary>
            {{ routesNotOnGlobe.length }} route{{ routesNotOnGlobe.length === 1 ? '' : 's' }}
            missing a location
          </summary>
          <ul class="mb-0">
            <li v-for="route in routesNotOnGlobe" :key="route.id">
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

      <div class="btn-group btn-group-sm mt-3" role="group" aria-label="Map type">
        <button
          type="button"
          class="btn"
          :class="satelliteView ? 'btn-outline-light' : 'btn-light'"
          :aria-pressed="!satelliteView"
          @click="satelliteView = false"
        >
          Map
        </button>
        <button
          type="button"
          class="btn"
          :class="satelliteView ? 'btn-light' : 'btn-outline-light'"
          :aria-pressed="satelliteView"
          @click="satelliteView = true"
        >
          Satellite
        </button>
      </div>
    </aside>

    <!-- Covers the globe during the dive so nothing can be clicked, then fades to black -->
    <div
      v-if="openingRouteName"
      class="globe-route-dive"
      :class="{ 'is-fading': routeDiveFading }"
      role="status"
    >
      <p class="globe-route-dive-label">
        Heading to <strong>{{ openingRouteName }}</strong>
      </p>
    </div>
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

/* Scattered stars behind the satellite globe. Each layer of dots repeats at a different
   size so the pattern doesn't look like a grid. */
.globe-page.is-explore.is-satellite {
  background-image:
    radial-gradient(1px 1px at 20px 30px, #ffffff, transparent),
    radial-gradient(1px 1px at 140px 90px, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(1.5px 1.5px at 230px 170px, #ffffff, transparent),
    radial-gradient(1px 1px at 310px 40px, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(1px 1px at 90px 240px, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1.5px 1.5px at 270px 280px, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(1px 1px at 360px 200px, rgba(255, 255, 255, 0.4), transparent);
  background-size:
    380px 320px,
    430px 390px,
    510px 470px,
    350px 410px,
    460px 350px,
    560px 520px,
    400px 440px;
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
  width: min(18rem, 80vw);
  margin: 2.5rem 0 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  letter-spacing: 0.1em;
}

/* Thin bar on the dark intro, using Bootstrap's progress variables */
.globe-loading .progress {
  --bs-progress-height: 4px;
  --bs-progress-bg: rgba(255, 255, 255, 0.15);
  --bs-progress-bar-bg: #ffffff;
  --bs-progress-bar-transition: width 0.6s ease;
}

.globe-loading-text {
  margin: 0.75rem 0 0;
}

.globe-loading-percent {
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.4);
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

/* Sits over the globe while it dives onto a route; the label shows straight away and
   the black fade starts once the route's satellite photos have loaded (.is-fading) */
.globe-route-dive {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 3rem;
}

/* The black layer fades its opacity rather than its colour, so the browser can blend it
   without repainting the whole screen on every frame of the dive */
.globe-route-dive::before {
  content: '';
  position: absolute;
  inset: 0;
  background: #000000;
  opacity: 0;
  transition: opacity 0.6s ease-in;
}

.globe-route-dive.is-fading::before {
  opacity: 1;
}

.globe-route-dive-label {
  position: relative;
  margin: 0;
  padding: 0.6rem 1.25rem;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.85);
  color: #ffffff;
  letter-spacing: 0.04em;
  opacity: 0;
  animation: fade-in 0.4s ease forwards;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
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
  .globe-panel {
    animation: none;
    opacity: 1;
  }
}
</style>

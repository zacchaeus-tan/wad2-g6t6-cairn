// One-off: picks a few real trails with clear shapes for the sign-in page background
// and writes them to src/lib/authRoutes.js, so the page never loads the GeoJSON files.
// Run with: node scripts/build-auth-routes.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { geometryToPath } from '../src/lib/routeLine.js'

const BOX = { width: 600, height: 400 }
const OUTPUT = new URL('../src/lib/authRoutes.js', import.meta.url)

// How many routes to take from each file. Small files first, as they load quickest.
const SOURCES = [
  ['singapore', 1],
  ['thailand', 2],
  ['vietnam', 2],
  ['malaysia', 1],
]

const MIN_POINTS = 40 // fewer than this is close to a straight line
const MAX_PATH_LENGTH = 1500 // characters, to keep the module to a few KB
const MIN_ASPECT = 0.5 // of the shape's bounding box, so it fills the box rather than a sliver
const MAX_ASPECT = 2.2

function distance([lonA, latA], [lonB, latB], lonScale) {
  return Math.hypot((lonA - lonB) * lonScale, latA - latB)
}

function lineLength(line, lonScale) {
  return line.slice(1).reduce((sum, point, i) => sum + distance(line[i], point, lonScale), 0)
}

// The longest part of the route, because a dot can only walk along one unbroken line
function longestPart(geometry) {
  if (geometry?.type === 'LineString') return geometry.coordinates
  if (geometry?.type !== 'MultiLineString') return null
  const lonScale = Math.cos((geometry.coordinates[0][0][1] * Math.PI) / 180)
  return geometry.coordinates.reduce((best, part) =>
    lineLength(part, lonScale) > lineLength(best, lonScale) ? part : best,
  )
}

// Returns the route's path and how much it winds, or null when it has no clear shape
function candidate(feature) {
  const line = longestPart(feature.geometry)
  if (!line || line.length < 2 || !feature.properties?.name) return null

  const d = geometryToPath({ type: 'LineString', coordinates: line }, BOX)
  if (!d || d.length > MAX_PATH_LENGTH || d.split('L').length < MIN_POINTS) return null

  const lons = line.map(([lon]) => lon)
  const lats = line.map(([, lat]) => lat)
  const lonScale = Math.cos((lats[0] * Math.PI) / 180)
  const spanX = (Math.max(...lons) - Math.min(...lons)) * lonScale
  const spanY = Math.max(...lats) - Math.min(...lats)
  const aspect = spanX / spanY
  if (!(aspect >= MIN_ASPECT && aspect <= MAX_ASPECT)) return null

  return {
    name: feature.properties.name,
    d,
    winding: lineLength(line, lonScale) / Math.hypot(spanX, spanY),
  }
}

const routes = SOURCES.flatMap(([country, count]) => {
  const { features } = JSON.parse(
    readFileSync(new URL(`../data/geojson/${country}-routes.geojson`, import.meta.url)),
  )
  return features
    .map(candidate)
    .filter(Boolean)
    .sort((a, b) => b.winding - a.winding)
    .slice(0, count)
    .map(({ name, d }) => ({ name, country, d }))
})

writeFileSync(
  OUTPUT,
  `// Made by scripts/build-auth-routes.mjs. The names are for developers and are never shown.
export const authRoutes = ${JSON.stringify(routes, null, 2)}
`,
)
console.log(routes.map((r) => `${r.country}: ${r.name} (${r.d.length} chars)`).join('\n'))

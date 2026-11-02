// Forecast helpers for the edge functions that send weather to the model.
// Pure functions, no database access.

const MAX_FORECAST_DAYS = 7 // the route page shows about a week of forecast
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Must match the warnings produced by warningsFor() in weatherController.js.
// Anything else is dropped, so free text from the browser never reaches the prompt.
const ALLOWED_WARNINGS = new Set([
  'Near-freezing at summit',
  'Near-freezing',
  'Thunderstorm risk',
  'Rain likely after midday',
  'Strong gusts',
  'Very high UV',
  'Heavy recent rain: muddy trail, check river crossings',
])

export function num(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null
}

export function isDate(value) {
  return typeof value === 'string' && DATE_PATTERN.test(value) && !isNaN(Date.parse(value))
}

export function addDays(date, count) {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + count)
  return d.toISOString().slice(0, 10)
}

function dayNumber(startDate, date) {
  return Math.round((Date.parse(date) - Date.parse(startDate)) / 86400000) + 1
}

// Keeps only numbers, a plain date and known warnings
export function cleanForecast(forecast) {
  if (!Array.isArray(forecast)) {
    return []
  }
  return forecast.slice(0, MAX_FORECAST_DAYS).map((d) => ({
    date: isDate(d?.date) ? d.date : null,
    min: num(d?.min),
    max: num(d?.max),
    summitMin: num(d?.summitMin),
    summitMax: num(d?.summitMax),
    feelsMin: num(d?.feelsMin),
    rainMm: num(d?.rainMm),
    rainChance: num(d?.rainChance),
    windKph: num(d?.windKph),
    gustKph: num(d?.gustKph),
    uv: num(d?.uv),
    warnings: Array.isArray(d?.warnings) ? d.warnings.filter((w) => ALLOWED_WARNINGS.has(w)) : [],
  }))
}

function show(value, unit = '') {
  return value === null ? '?' : `${value}${unit}`
}

export function forecastLine(d, label) {
  const summit =
    d.summitMin !== null || d.summitMax !== null
      ? ` (summit ${show(d.summitMin)} to ${show(d.summitMax)} °C)`
      : ''
  const warnings = d.warnings.length ? ` Warnings: ${d.warnings.join('; ')}.` : ''
  return (
    `- ${label}: ${show(d.min)} to ${show(d.max)} °C at the trailhead${summit}, ` +
    `feels-like low ${show(d.feelsMin, ' °C')}, rain ${show(d.rainMm, ' mm')} ` +
    `(${show(d.rainChance, '%')} chance), wind ${show(d.windKph, ' km/h')}, ` +
    `gusts ${show(d.gustKph, ' km/h')}, UV ${show(d.uv)}.${warnings}`
  )
}

// The forecast lines for a trip's dates, and what to do about any days not covered
export function tripForecastSection(forecast, startDate, days) {
  if (!forecast.length) {
    return 'Forecast for the trip dates: unavailable. Do not guess the weather.'
  }

  const lastDate = addDays(startDate, days - 1)
  const tripDays = forecast
    .filter((d) => d.date && d.date >= startDate && d.date <= lastDate)
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  if (!tripDays.length) {
    return (
      `Forecast for the trip dates: unavailable, because the trip (${startDate} to ${lastDate}) ` +
      'is beyond the forecast range. Do not guess the weather.'
    )
  }

  const lines = tripDays
    .map((d) => forecastLine(d, `Day ${dayNumber(startDate, d.date)} (${d.date})`))
    .join('\n')
  const missing =
    tripDays.length < days
      ? `\nThe forecast covers only ${tripDays.length} of the ${days} hiking days. Do not assume weather for the other days.`
      : ''
  return `Forecast for the trip dates (${tripDays.length} of ${days} hiking days covered):\n${lines}${missing}`
}

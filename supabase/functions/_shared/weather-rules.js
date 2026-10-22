// Phase 2 admin alerts: turns an Open-Meteo daily forecast into suggested
// route alerts. Pure functions, no network or database access, so the
// thresholds are easy to read, tune and test.
//
//   daily = Open-Meteo `daily` block: arrays indexed by day, plus `time`
//   alert = { kind, severity, date, title, message }

// Thunderstorms are an everyday afternoon event across Southeast Asia, so a
// plain thunderstorm code is not flagged; only hail, which Open-Meteo reports
// as codes 96 and 99.
const HAIL_CODES = [96, 99]

// [warning, danger] thresholds. A value at or above the danger figure raises
// a danger alert, otherwise at or above the warning figure a warning.
export const THRESHOLDS = {
  rainMm: [50, 100], // total precipitation for the day
  gustKmh: [70, 100], // strongest wind gust
  heatC: [38, 42], // daily maximum temperature
}

function grade(value, [warning, danger]) {
  if (value == null) return null
  if (value >= danger) return 'danger'
  if (value >= warning) return 'warning'
  return null
}

const SEVERITY_RANK = { warning: 1, danger: 2 }

export function alertsForDay(daily, index) {
  const date = daily.time[index]
  const rain = daily.precipitation_sum?.[index]
  const gust = daily.wind_gusts_10m_max?.[index]
  const heat = daily.temperature_2m_max?.[index]
  const code = daily.weather_code?.[index]
  const alerts = []

  const rainSeverity = grade(rain, THRESHOLDS.rainMm)
  if (rainSeverity) {
    alerts.push({
      kind: 'rain',
      severity: rainSeverity,
      date,
      title: `Heavy rain forecast (${Math.round(rain)} mm)`,
      message: 'Expect flooded river crossings, slippery ground and a higher risk of landslides.',
    })
  }

  if (HAIL_CODES.includes(code)) {
    alerts.push({
      kind: 'hail',
      severity: 'warning',
      date,
      title: 'Thunderstorm with hail forecast',
      message: 'Avoid exposed ridges and summits; plan to be below the treeline by early afternoon.',
    })
  }

  const gustSeverity = grade(gust, THRESHOLDS.gustKmh)
  if (gustSeverity) {
    alerts.push({
      kind: 'wind',
      severity: gustSeverity,
      date,
      title: `Strong wind gusts forecast (${Math.round(gust)} km/h)`,
      message: 'Exposed sections and ridgelines may be unsafe; watch for falling branches.',
    })
  }

  const heatSeverity = grade(heat, THRESHOLDS.heatC)
  if (heatSeverity) {
    alerts.push({
      kind: 'heat',
      severity: heatSeverity,
      date,
      title: `Extreme heat forecast (${Math.round(heat)}°C)`,
      message: 'Start early, carry extra water and rest through the hottest hours.',
    })
  }

  return alerts
}

// Every alert across the forecast, most severe first.
export function alertsForForecast(daily) {
  if (!daily?.time?.length) return []
  return daily.time
    .flatMap((_, index) => alertsForDay(daily, index))
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.date.localeCompare(b.date))
}

// The window an alert covers: the forecast day in the route's own time zone,
// returned as UTC timestamps for starts_at / ends_at.
export function dayWindow(date, utcOffsetSeconds) {
  const start = Date.parse(`${date}T00:00:00Z`) - utcOffsetSeconds * 1000
  return {
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + 24 * 60 * 60 * 1000).toISOString(),
  }
}

import { describe, expect, it } from 'vitest'
import { alertsForDay, alertsForForecast, dayWindow } from './weather-rules.js'

const day = (overrides = {}) => ({
  time: ['2026-10-24'],
  weather_code: [95],
  precipitation_sum: [12],
  wind_gusts_10m_max: [30],
  temperature_2m_max: [32],
  ...overrides,
})

describe('alertsForDay', () => {
  it('raises nothing for an ordinary tropical thunderstorm', () => {
    expect(alertsForDay(day(), 0)).toEqual([])
  })

  it('grades heavy rain as a warning, then danger', () => {
    expect(alertsForDay(day({ precipitation_sum: [50] }), 0)[0]).toMatchObject({ kind: 'rain', severity: 'warning' })
    expect(alertsForDay(day({ precipitation_sum: [120] }), 0)[0]).toMatchObject({ kind: 'rain', severity: 'danger' })
  })

  it('flags hail but not plain thunderstorms', () => {
    expect(alertsForDay(day({ weather_code: [99] }), 0).map((a) => a.kind)).toEqual(['hail'])
  })

  it('flags strong gusts and extreme heat', () => {
    const kinds = alertsForDay(day({ wind_gusts_10m_max: [105], temperature_2m_max: [39] }), 0)
    expect(kinds).toMatchObject([
      { kind: 'wind', severity: 'danger' },
      { kind: 'heat', severity: 'warning' },
    ])
  })

  it('ignores missing values', () => {
    expect(alertsForDay({ time: ['2026-10-24'] }, 0)).toEqual([])
  })
})

describe('alertsForForecast', () => {
  it('puts danger alerts first', () => {
    const daily = {
      time: ['2026-10-24', '2026-10-25'],
      precipitation_sum: [60, 110],
    }
    expect(alertsForForecast(daily).map((a) => `${a.date} ${a.severity}`)).toEqual([
      '2026-10-25 danger',
      '2026-10-24 warning',
    ])
  })

  it('handles an empty forecast', () => {
    expect(alertsForForecast(undefined)).toEqual([])
  })
})

describe('dayWindow', () => {
  it('covers the local day in UTC', () => {
    // Singapore is UTC+8, so its day starts at 16:00 UTC the evening before.
    expect(dayWindow('2026-10-24', 8 * 3600)).toEqual({
      startsAt: '2026-10-23T16:00:00.000Z',
      endsAt: '2026-10-24T16:00:00.000Z',
    })
  })
})

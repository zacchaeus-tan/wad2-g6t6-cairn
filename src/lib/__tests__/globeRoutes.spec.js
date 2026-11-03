/* globeRoutes.spec.js
 Unit tests for the route data helpers behind the /globe page.
 A bad value here puts a pill in the wrong place or shows the wrong difficulty, and what the
 map draws can't be checked from an E2E test, so these catch it before it reaches the globe.
*/

import { describe, it, expect } from 'vitest'
import {
  countrySummaries,
  difficultyLevel,
  hasRenderableGeometry,
  routePosition,
  shortRouteName,
} from '../globe/globeRoutes'

describe('globeRoutes', () => {
  // Verify that only a line with at least 2 valid points can be drawn.
  it('should only accept a line with at least 2 valid points', () => {
    const line = [
      [110.4, -7.45],
      [110.5, -7.4],
    ]

    expect(hasRenderableGeometry({ type: 'LineString', coordinates: line })).toBe(true)
    expect(hasRenderableGeometry({ type: 'LineString', coordinates: [line[0]] })).toBe(false)
    expect(hasRenderableGeometry(null)).toBe(false)
  })

  // Verify that a position is [longitude, latitude], and that 0 isn't treated as missing.
  it('should return a position only when both coordinates are valid', () => {
    expect(routePosition({ longitude: '110.4', latitude: '-7.45' })).toEqual([110.4, -7.45])
    expect(routePosition({ longitude: 0, latitude: 0 })).toEqual([0, 0])
    expect(routePosition({ longitude: null, latitude: -7.45 })).toBe(null)
  })

  // Verify that the community grade comes first, and that grades stay between 1 and 4.
  it('should work out a difficulty between 1 and 4', () => {
    expect(difficultyLevel({ effective_difficulty: 3, official_difficulty: 1 })).toBe(3)
    expect(difficultyLevel({ technical_rating: 'Hard' })).toBe(3)
    expect(difficultyLevel({ effective_difficulty: 9 })).toBe(4)
  })

  // Verify that a route with no grade stays unrated rather than showing as easy.
  it('should return null when a route has no grade', () => {
    const noGrade = {
      effective_difficulty: null,
      official_difficulty: null,
      technical_rating: null,
    }

    expect(difficultyLevel(noGrade)).toBe(null)
    expect(difficultyLevel({ technical_rating: '' })).toBe(null)
  })

  // Verify that pills drop the bracketed part of a name, but are never left blank.
  it('should shorten a route name without leaving it blank', () => {
    expect(shortRouteName('Gunung Merbabu (Wekas BC)')).toBe('Gunung Merbabu')
    expect(shortRouteName('(Wekas BC)')).toBe('(Wekas BC)')
  })

  // Verify that the "Fly to" list is alphabetical and only counts routes with a location.
  it('should group routes by country in alphabetical order', () => {
    const routes = [
      { country: 'Nepal', longitude: 84, latitude: 28 },
      { country: 'Nepal', longitude: null, latitude: null },
      { country: 'Indonesia', longitude: 110, latitude: -7 },
      { country: 'Indonesia', longitude: 115, latitude: -8 },
    ]

    expect(countrySummaries(routes)).toEqual([
      {
        name: 'Indonesia',
        count: 2,
        bounds: [
          [110, -8],
          [115, -7],
        ],
      },
      {
        name: 'Nepal',
        count: 1,
        bounds: [
          [84, 28],
          [84, 28],
        ],
      },
    ])
  })
})

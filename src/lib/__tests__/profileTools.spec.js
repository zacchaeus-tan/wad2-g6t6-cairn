import { describe, expect, it } from 'vitest'
import {
  checklistToText,
  filterRoutes,
  gettingStartedSteps,
  routeCounts,
  sortRoutes,
  validatePasswordForm,
  validateProfileForm,
} from '../profileTools'

const route = (route_name, status, country = null, completed_at = null) => ({
  route_name,
  status,
  country,
  completed_at,
})
const routes = [
  route('Merbabu', 'completed', 'Indonesia', '2026-10-01T00:00:00Z'),
  route('Faber Walk', 'saved', null),
  route('Akiki', 'saved', 'Philippines'),
  route('Rinjani', 'completed', 'Indonesia', '2026-10-20T00:00:00Z'),
  route('Bukit Timah', 'completed', 'Singapore'),
]
const names = (list) => list.map((r) => r.route_name)

describe('filterRoutes', () => {
  it('keeps only the matching status', () => {
    expect(names(filterRoutes(routes, 'saved'))).toEqual(['Faber Walk', 'Akiki'])
    expect(filterRoutes(routes, 'completed')).toHaveLength(3)
  })
})

describe('routeCounts', () => {
  it('counts each filter', () => {
    expect(routeCounts(routes)).toEqual({ all: 5, saved: 2, completed: 3 })
    expect(routeCounts([])).toEqual({ all: 0, saved: 0, completed: 0 })
  })
})

describe('sortRoutes', () => {
  it('sorts by country, then name, with no country last', () => {
    expect(names(sortRoutes(routes, 'country'))).toEqual([
      'Merbabu',
      'Rinjani',
      'Akiki',
      'Bukit Timah',
      'Faber Walk',
    ])
  })
})

describe('checklistToText', () => {
  it('starts with the route and groups items, showing what is packed', () => {
    const text = checklistToText('Rinjani', [
      { label: 'Rain jacket', category: 'clothing', is_checked: false },
      { label: 'Hat', category: 'clothing', quantity: '1', is_checked: true },
      { label: 'First aid kit', category: 'safety', is_checked: false },
    ])
    expect(text).toBe(
      'Rinjani\n\nClothing\n[ ] Rain jacket\n[x] Hat — 1\n\nSafety\n[ ] First aid kit',
    )
  })
})

describe('gettingStartedSteps', () => {
  const done = (input) => gettingStartedSteps(input).map((step) => step.done)

  it('has nothing done for a new user', () => {
    expect(done({ profile: {}, savedRoutes: [], reviewCount: 0 })).toEqual([
      false,
      false,
      false,
      false,
    ])
  })

  it('has everything done once each step is finished', () => {
    const profile = { quiz_completed_at: '2026-10-01' }
    const savedRoutes = [{ status: 'saved' }, { status: 'completed' }]
    expect(done({ profile, savedRoutes, reviewCount: 1 })).toEqual([true, true, true, true])
  })
})

const validForm = {
  name: 'Mei',
  age: 20,
  gender: 'female',
  country: 'Singapore',
  about: '',
}
const errorsWith = (change) => validateProfileForm({ ...validForm, ...change })

describe('validateProfileForm', () => {
  it('accepts a valid form', () => {
    expect(errorsWith({})).toEqual({})
  })

  it('requires a name, ignoring spaces around it, up to 60 characters', () => {
    expect(errorsWith({ name: '   ' }).name).toBeTruthy()
    expect(errorsWith({ name: 'a'.repeat(60) }).name).toBeUndefined()
    expect(errorsWith({ name: `  ${'a'.repeat(60)}  ` }).name).toBeUndefined()
    expect(errorsWith({ name: 'a'.repeat(61) }).name).toBeTruthy()
  })
})

describe('validatePasswordForm', () => {
  it('rejects a mismatch', () => {
    const errors = validatePasswordForm({ password: 'abcdef', confirm: 'abcdeg' })
    expect(errors.password).toBeUndefined()
    expect(errors.confirm).toBeTruthy()
  })
})

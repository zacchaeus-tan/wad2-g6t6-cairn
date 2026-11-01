import { describe, expect, it } from 'vitest'
import {
  checklistToText,
  filterRoutes,
  gettingStartedSteps,
  groupChecklistItems,
  newlyDoneSteps,
  profileColumnsFrom,
  profileFormChanged,
  profileFormFrom,
  routeCounts,
  sortRoutes,
  validatePasswordForm,
  validateProfileForm,
} from './profileTools'

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
  it('keeps every route for all', () => {
    expect(filterRoutes(routes, 'all')).toHaveLength(5)
  })

  it('keeps only the matching status', () => {
    expect(names(filterRoutes(routes, 'saved'))).toEqual(['Faber Walk', 'Akiki'])
    expect(filterRoutes(routes, 'completed')).toHaveLength(3)
  })

  it('returns nothing when nothing matches', () => {
    expect(filterRoutes([routes[1]], 'completed')).toEqual([])
  })
})

describe('routeCounts', () => {
  it('counts each filter', () => {
    expect(routeCounts(routes)).toEqual({ all: 5, saved: 2, completed: 3 })
    expect(routeCounts([])).toEqual({ all: 0, saved: 0, completed: 0 })
  })
})

describe('sortRoutes', () => {
  it('sorts by name', () => {
    expect(names(sortRoutes(routes, 'name'))).toEqual([
      'Akiki',
      'Bukit Timah',
      'Faber Walk',
      'Merbabu',
      'Rinjani',
    ])
  })

  it('sorts by country, then name, with no country last', () => {
    expect(names(sortRoutes(routes, 'country'))).toEqual([
      'Merbabu',
      'Rinjani',
      'Akiki',
      'Bukit Timah',
      'Faber Walk',
    ])
  })

  it('sorts by newest completion, with no date last', () => {
    expect(names(sortRoutes(routes, 'completed'))).toEqual([
      'Rinjani',
      'Merbabu',
      'Akiki',
      'Bukit Timah',
      'Faber Walk',
    ])
  })

  it('falls back to name for an unknown sort', () => {
    expect(names(sortRoutes(routes, 'nope'))[0]).toBe('Akiki')
  })

  it('does not change the list it was given', () => {
    const before = names(routes)
    sortRoutes(routes, 'name')
    expect(names(routes)).toEqual(before)
  })
})

describe('groupChecklistItems', () => {
  it('groups in category order and skips empty categories', () => {
    const groups = groupChecklistItems([
      { label: 'Map', category: 'navigation' },
      { label: 'Hat', category: 'clothing' },
    ])
    expect(groups.map((g) => g.label)).toEqual(['Clothing', 'Navigation'])
  })

  it('puts an unknown or missing category under Other', () => {
    const groups = groupChecklistItems([{ label: 'A', category: 'wat' }, { label: 'B' }])
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Other')
    expect(groups[0].items).toHaveLength(2)
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

  it('still gives a useful text for an empty checklist', () => {
    expect(checklistToText('Rinjani', [])).toBe('Rinjani\n\nThis checklist is empty.')
  })
})

describe('gettingStartedSteps', () => {
  const done = (input) => gettingStartedSteps(input).map((step) => step.done)
  const saved = { status: 'saved' }
  const completed = { status: 'completed' }
  const quizzed = { quiz_completed_at: '2026-10-01' }

  // Every combination of quiz taken, no/saved/completed route and review written
  it.each([
    [{}, [], 0, [false, false, false, false]],
    [{}, [], 1, [false, false, false, true]],
    [{}, [saved], 0, [false, true, false, false]],
    [{}, [saved], 2, [false, true, false, true]],
    [{}, [completed], 0, [false, true, true, false]],
    [{}, [completed], 1, [false, true, true, true]],
    [quizzed, [], 0, [true, false, false, false]],
    [quizzed, [], 1, [true, false, false, true]],
    [quizzed, [saved], 0, [true, true, false, false]],
    [quizzed, [saved], 1, [true, true, false, true]],
    [quizzed, [saved, completed], 0, [true, true, true, false]],
    [quizzed, [saved, completed], 1, [true, true, true, true]],
  ])('profile %o, routes %o, %i reviews', (profile, savedRoutes, reviewCount, expected) => {
    expect(done({ profile, savedRoutes, reviewCount })).toEqual(expected)
  })

  it('treats a missing profile as no quiz', () => {
    expect(done({ profile: null, savedRoutes: [], reviewCount: 0 })[0]).toBe(false)
  })

  it('links each step to where it gets done', () => {
    const steps = gettingStartedSteps({ profile: {}, savedRoutes: [], reviewCount: 0 })
    expect(steps.map((step) => step.to)).toEqual([
      '/quiz',
      '/routes',
      '/profile?tab=routes',
      '/routes',
    ])
  })
})

describe('newlyDoneSteps', () => {
  const steps = [
    { key: 'quiz', done: true },
    { key: 'save', done: true },
    { key: 'hike', done: false },
  ]

  it('gives nothing the first time', () => {
    expect(newlyDoneSteps(steps, null)).toEqual([])
  })

  it('gives only steps finished since last time', () => {
    expect(newlyDoneSteps(steps, new Set(['quiz']))).toEqual(['save'])
    expect(newlyDoneSteps(steps, new Set(['quiz', 'save']))).toEqual([])
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

  it.each([
    [13, false],
    [120, false],
    ['45', false],
    [12, true],
    [121, true],
    [20.5, true],
    ['', true],
    [null, true],
    ['abc', true],
  ])('age %s: error %s', (age, hasError) => {
    expect(Boolean(errorsWith({ age }).age)).toBe(hasError)
  })

  it('only accepts a known gender', () => {
    expect(errorsWith({ gender: 'non_binary' }).gender).toBeUndefined()
    expect(errorsWith({ gender: 'Non-binary' }).gender).toBeTruthy()
    expect(errorsWith({ gender: '' }).gender).toBeTruthy()
    expect(errorsWith({ gender: 'constructor' }).gender).toBeTruthy()
  })

  it('only accepts a known country', () => {
    expect(errorsWith({ country: 'Atlantis' }).country).toBeTruthy()
    expect(errorsWith({ country: null }).country).toBeTruthy()
  })

  it('lets about be empty, up to 500 characters', () => {
    expect(errorsWith({ about: null }).about).toBeUndefined()
    expect(errorsWith({ about: 'a'.repeat(500) }).about).toBeUndefined()
    expect(errorsWith({ about: 'a'.repeat(501) }).about).toBeTruthy()
  })
})

describe('profileColumnsFrom', () => {
  it('gives exactly the editable columns, tidied', () => {
    expect(
      profileColumnsFrom({ ...validForm, name: ' Mei ', age: '21', about: '  ', is_admin: true }),
    ).toEqual({
      display_name: 'Mei',
      age: 21,
      gender: 'female',
      country: 'Singapore',
      about: null,
    })
  })
})

describe('profileFormChanged', () => {
  const profile = {
    display_name: 'Mei',
    age: 20,
    gender: 'female',
    country: 'Singapore',
    about: null,
    is_admin: false,
  }

  it('is false for an untouched form', () => {
    expect(profileFormChanged(profile, profileFormFrom(profile))).toBe(false)
  })

  it('ignores spaces and how the age was typed', () => {
    const form = { ...profileFormFrom(profile), name: ' Mei ', age: '20', about: '  ' }
    expect(profileFormChanged(profile, form)).toBe(false)
  })

  it('is true when a field differs', () => {
    expect(profileFormChanged(profile, { ...profileFormFrom(profile), about: 'Hi' })).toBe(true)
    expect(profileFormChanged(profile, { ...profileFormFrom(profile), age: 21 })).toBe(true)
  })
})

describe('profileFormFrom', () => {
  it('uses blanks for anything missing', () => {
    expect(profileFormFrom(null)).toEqual({ name: '', age: '', gender: '', country: '', about: '' })
  })
})

describe('validatePasswordForm', () => {
  it('accepts a matching password of 6 or more', () => {
    expect(validatePasswordForm({ password: 'abcdef', confirm: 'abcdef' })).toEqual({})
  })

  it('rejects 5 characters', () => {
    expect(validatePasswordForm({ password: 'abcde', confirm: 'abcde' }).password).toBeTruthy()
  })

  it('rejects a mismatch', () => {
    const errors = validatePasswordForm({ password: 'abcdef', confirm: 'abcdeg' })
    expect(errors.password).toBeUndefined()
    expect(errors.confirm).toBeTruthy()
  })
})

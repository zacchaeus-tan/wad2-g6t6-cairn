import { countries, genderLabels } from '@/lib/countries'

// Plain logic behind the profile page: no Vue and no database, so it can be unit-tested.

// ---------- saved routes ----------

export const ROUTE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'saved', label: 'Saved' },
  { value: 'completed', label: 'Completed' },
]

export const ROUTE_SORTS = [
  { value: 'name', label: 'Name A to Z' },
  { value: 'country', label: 'Country' },
  { value: 'completed', label: 'Recently completed' },
]

export function filterRoutes(routes, filter) {
  return filter === 'all' ? routes : routes.filter((route) => route.status === filter)
}

export function routeCounts(routes) {
  return Object.fromEntries(
    ROUTE_FILTERS.map(({ value }) => [value, filterRoutes(routes, value).length]),
  )
}

const byName = (a, b) => (a.route_name ?? '').localeCompare(b.route_name ?? '')

// A missing value always goes last, whichever way the list is sorted.
function missingLast(a, b) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return null
}

const ROUTE_COMPARERS = {
  name: byName,
  country: (a, b) =>
    (missingLast(a.country, b.country) ?? a.country.localeCompare(b.country)) || byName(a, b),
  completed: (a, b) =>
    (missingLast(a.completed_at, b.completed_at) ??
      new Date(b.completed_at) - new Date(a.completed_at)) ||
    byName(a, b),
}

export function sortRoutes(routes, sort) {
  return [...routes].sort(ROUTE_COMPARERS[sort] ?? byName)
}

// ---------- checklists ----------

export const CATEGORY_LABELS = {
  clothing: 'Clothing',
  safety: 'Safety',
  navigation: 'Navigation',
  water_food: 'Water & Food',
  shelter: 'Shelter',
  documents: 'Documents',
  other: 'Other',
}

export function groupChecklistItems(items) {
  const categoryOf = (item) => (CATEGORY_LABELS[item.category] ? item.category : 'other')
  return Object.keys(CATEGORY_LABELS)
    .map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      items: items.filter((item) => categoryOf(item) === key),
    }))
    .filter((group) => group.items.length)
}

// The route name, then each category with its items as "[x] Hat — 1".
export function checklistToText(routeName, items) {
  const groups = groupChecklistItems(items).map((group) =>
    [
      group.label,
      ...group.items.map((item) => {
        const quantity = item.quantity ? ` — ${item.quantity}` : ''
        return `[${item.is_checked ? 'x' : ' '}] ${item.label}${quantity}`
      }),
    ].join('\n'),
  )
  return [routeName, ...(groups.length ? groups : ['This checklist is empty.'])].join('\n\n')
}

// ---------- getting started ----------

export function gettingStartedSteps({ profile, savedRoutes, reviewCount }) {
  return [
    {
      key: 'quiz',
      label: 'Take the quiz',
      to: '/quiz',
      done: Boolean(profile?.quiz_completed_at),
    },
    {
      key: 'save',
      label: 'Save a route',
      to: '/routes',
      done: savedRoutes.length > 0,
    },
    {
      key: 'hike',
      label: 'Complete a hike',
      to: '/profile?tab=routes',
      done: savedRoutes.some((route) => route.status === 'completed'),
    },
    {
      key: 'review',
      label: 'Write a review',
      to: '/routes',
      done: reviewCount > 0,
    },
  ]
}

// The finished steps that weren't finished last time. Nothing the first time they're
// looked at (seen is null), so a page load doesn't redraw every tick.
export function newlyDoneSteps(steps, seen) {
  if (!seen) return []
  return steps.filter((step) => step.done && !seen.has(step.key)).map((step) => step.key)
}

// ---------- editing the profile ----------

export const NAME_MAX = 60
export const AGE_MIN = 13
export const AGE_MAX = 120
export const ABOUT_MAX = 500
export const PASSWORD_MIN = 6

// "Jane Tan" -> "JT", "jane@x.com" -> "J". Shown when there's no profile picture.
export function initialsOf(name) {
  return (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

// Kept in step with the upload-avatar Edge Function, which checks again
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

// What's wrong with a chosen picture, or '' when it's fine
export function validateAvatarFile(file) {
  if (!AVATAR_TYPES.includes(file?.type)) return 'Use a JPEG, PNG or WebP picture.'
  if (file.size > AVATAR_MAX_BYTES) return 'Use a picture under 2 MB.'
  return ''
}

export function profileFormFrom(profile) {
  return {
    name: profile?.display_name ?? '',
    age: profile?.age ?? '',
    gender: profile?.gender ?? '',
    country: profile?.country ?? '',
    about: profile?.about ?? '',
  }
}

// What's wrong with each field, keyed by field. Empty when the form is fine.
export function validateProfileForm({ name, age, gender, country, about }) {
  const errors = {}
  const trimmedName = (name ?? '').trim()
  const ageNumber = Number(age)

  if (!trimmedName) errors.name = 'Enter your name.'
  else if (trimmedName.length > NAME_MAX) errors.name = `Keep your name to ${NAME_MAX} characters.`

  if (
    String(age ?? '').trim() === '' ||
    !Number.isInteger(ageNumber) ||
    ageNumber < AGE_MIN ||
    ageNumber > AGE_MAX
  ) {
    errors.age = `Enter a whole number from ${AGE_MIN} to ${AGE_MAX}.`
  }

  if (!Object.hasOwn(genderLabels, gender ?? '')) errors.gender = 'Select a gender.'
  if (!countries.includes(country)) errors.country = 'Select a country.'

  if ((about ?? '').trim().length > ABOUT_MAX) {
    errors.about = `Keep this to ${ABOUT_MAX} characters.`
  }
  return errors
}

// The form as database columns. The only columns the profile form may write.
export function profileColumnsFrom({ name, age, gender, country, about }) {
  return {
    display_name: name.trim(),
    age: Number(age),
    gender,
    country,
    about: about?.trim() || null,
  }
}

export function profileFormChanged(profile, form) {
  const columns = profileColumnsFrom(form)
  return Object.keys(columns).some((column) => columns[column] !== (profile?.[column] ?? null))
}

export function validatePasswordForm({ password, confirm }) {
  const errors = {}
  if ((password ?? '').length < PASSWORD_MIN) {
    errors.password = `Use at least ${PASSWORD_MIN} characters.`
  }
  if (password !== confirm) errors.confirm = "These passwords don't match."
  return errors
}

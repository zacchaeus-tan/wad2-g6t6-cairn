/* route-signed-in.spec.js
 E2E tests for the /routes/:id page when signed in.
 Journey: a hiker (signed in) plans and reports on a route:
   1. Signs in from the route's trail register and comes back to the route
   2. Saves the route, and finds it on their profile's Saved routes tab
   3. Writes a review that flags a hazard, which then shows in the trail register
   4. Is told to describe a hazard before it can be posted
 What the hiker saves is mocked: the tests sign in through the real form with a fake user, and
 their reviews and saved routes are answered here, so no real account or data is touched.
 Everything else, such as the route itself, still comes from the real database.
*/

import { Buffer } from 'node:buffer'
import { test, expect } from '@playwright/test'

// Gunung Merbabu (Suwanting BC). If it is removed, choose another route here.
const ROUTE = '/routes/d3835d32-520c-428b-a819-e596af749324'
const ROUTE_ID = ROUTE.split('/').at(-1)

const USER = { id: '00000000-0000-4000-8000-000000000003', email: 'hiker@example.com', aud: 'authenticated' }
const PROFILE = { id: USER.id, display_name: 'Test Hiker', is_admin: false, quiz_completed_at: null }

// The app talks to Supabase on another origin, so mocked responses need this to be readable.
// Content-Range carries the number of reviews.
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' }

// Shaped like a real token, in case the Supabase client decodes it
const encode = (part) => Buffer.from(JSON.stringify(part)).toString('base64url')
const FAKE_TOKEN = `${encode({ alg: 'none' })}.${encode({ sub: USER.id })}.signature`

const LANDSLIDE = { category: 'landslide', label: 'Landslide or rockfall', sort_order: 1 }
const FLOODING = { category: 'flooding', label: 'Flooding', sort_order: 2 }

// Reads a filter such as route_id=eq.123 from a Supabase request
const filter = (url, column) => new URL(url).searchParams.get(column)?.replace('eq.', '')

// Stands in for Supabase. Keeps what the page saves, so reloading the data shows it.
async function mockSupabase(page) {
  const db = { reviews: [], incidents: [], userRoutes: [], requests: [] }

  // .single() asks for one object rather than a list
  const json = (route, body, status = 200) => {
    const single = route.request().headers().accept?.includes('vnd.pgrst.object')
    return route.fulfill({ status, headers: CORS, json: single && Array.isArray(body) ? body[0] : body })
  }
  const write = (route) => {
    const request = route.request()
    const entry = { method: request.method(), url: request.url(), body: request.postDataJSON() }
    db.requests.push(entry)
    return entry
  }

  // Public data comes from the real database. The real database would reject the fake token,
  // so these requests go without it, the same as for a visitor who isn't signed in.
  // Registered first, so the mocks below are tried before it.
  await page.route('**/rest/v1/**', (route) => {
    const headers = { ...route.request().headers() }
    delete headers.authorization
    return route.continue({ headers })
  })

  await page.route('**/auth/v1/token*', (route) =>
    json(route, { access_token: FAKE_TOKEN, refresh_token: 'fake', token_type: 'bearer', expires_in: 3600, user: USER }),
  )
  await page.route('**/auth/v1/user*', (route) => json(route, USER))
  await page.route('**/rest/v1/profiles*', (route) => json(route, PROFILE))
  // The fake user has no checklists
  await page.route('**/rest/v1/checklists*', (route) => json(route, []))
  await page.route('**/rest/v1/incident_categories*', (route) => json(route, [LANDSLIDE, FLOODING]))

  await page.route('**/rest/v1/reviews*', (route) => {
    const request = route.request()
    if (request.method() === 'GET') {
      const routeId = filter(request.url(), 'route_id')
      const userId = filter(request.url(), 'user_id')
      const rows = db.reviews.filter(
        (r) => (!routeId || r.route_id === routeId) && (!userId || r.user_id === userId),
      )
      const range = rows.length ? `0-${rows.length - 1}/${rows.length}` : '*/0'
      return route.fulfill({ headers: { ...CORS, 'content-range': range }, json: rows })
    }
    const { body } = write(route)
    const review = {
      id: 'review-1',
      created_at: new Date().toISOString(),
      ...body,
      profiles: { display_name: PROFILE.display_name },
      review_incidents: [],
    }
    db.reviews = [review]
    return json(route, [review], 201)
  })

  await page.route('**/rest/v1/review_incidents*', (route) => {
    const request = route.request()
    // The route's hazards are public, so reading them goes to the real database
    if (request.method() === 'GET') return route.fallback()
    if (request.method() === 'DELETE') return route.fulfill({ status: 204, headers: CORS })
    const { body } = write(route)
    for (const incident of body) {
      const category = [LANDSLIDE, FLOODING].find((c) => c.category === incident.category)
      const saved = { id: `incident-${db.incidents.length + 1}`, ...incident, incident_categories: { label: category.label } }
      db.incidents.push(saved)
      db.reviews.find((r) => r.id === incident.review_id).review_incidents.push(saved)
    }
    return route.fulfill({ status: 201, headers: CORS })
  })

  await page.route('**/rest/v1/user_routes*', (route) => {
    const request = route.request()
    if (request.method() === 'GET') {
      const routeId = filter(request.url(), 'route_id')
      return json(route, db.userRoutes.filter((r) => !routeId || r.route_id === routeId))
    }
    if (request.method() === 'DELETE') {
      const { url } = write(route)
      db.userRoutes = db.userRoutes.filter((r) => r.route_id !== filter(url, 'route_id'))
      return route.fulfill({ status: 204, headers: CORS })
    }
    const { body } = write(route)
    const row = { id: 'user-route-1', completed_at: null, updated_at: new Date().toISOString(), ...body }
    db.userRoutes = [row]
    return json(route, [row], 201)
  })

  // Recalculating a route's stats after a review
  await page.route('**/functions/v1/**', (route) => json(route, {}))

  return db
}

// Opens the route, signs in from the trail register, and comes back. Returns the mocked data.
async function signInOnRoute(page) {
  const db = await mockSupabase(page)
  await page.goto(ROUTE)
  // Waits for the register to load first, as it redraws its sign-in link when it does
  await expect(trailRegister(page).getByText('No reviews yet.')).toBeVisible()
  await trailRegister(page).getByRole('link', { name: 'Sign in' }).click()
  await page.getByLabel('Email').fill(USER.email)
  await page.getByLabel('Password').fill('password')
  await page.getByLabel('Password').press('Enter')
  await expect(page).toHaveURL(new RegExp(`${ROUTE}$`))
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Gunung Merbabu')
  return db
}

const trailRegister = (page) => page.getByRole('region', { name: 'Trail register' })

// Only the top of each profile tab shows above the page, where its name is, so click there
const openProfileTab = (page, name) => page.getByRole('tab', { name }).click({ position: { x: 20, y: 12 } })

// Fills in the parts of a review every hiker has to answer
async function fillReview(page) {
  await trailRegister(page).getByRole('button', { name: 'Write a review' }).click()
  await page.getByLabel('Quality (1–5)').selectOption('4')
  await page.getByLabel('How hard did it feel?').selectOption('Hard')
  await page.getByLabel('Did you finish?').selectOption('Completed')
}

test.describe('Saving a route', () => {
  // Verify the plan step: a saved route is kept, and shows on the hiker's profile.
  test('should save a route and list it on the profile', async ({ page }) => {
    // setup
    const db = await signInOnRoute(page)
    const name = (await page.getByRole('heading', { level: 1 }).textContent()).trim()

    // actions
    await page.getByRole('button', { name: 'Save route', exact: true }).click()

    // assert
    await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(db.userRoutes).toEqual([expect.objectContaining({ route_id: ROUTE_ID, status: 'saved' })])

    // actions
    await page.getByRole('banner').getByRole('link', { name: 'Profile' }).click()
    await openProfileTab(page, 'Saved routes')

    // assert
    await expect(page).toHaveURL(/\/profile\?tab=routes$/)
    const myRoutes = page.getByRole('region', { name: 'My routes' })
    await expect(myRoutes.getByRole('listitem').filter({ hasText: name })).toBeVisible()
  })
})

test.describe('Reviewing a route', () => {
  // Verify the report step: a review that flags a hazard is saved and shown to other hikers.
  test('should post a review that flags a hazard, and show it in the trail register', async ({ page }) => {
    // setup: the route has no reviews yet
    const db = await signInOnRoute(page)
    await expect(trailRegister(page).getByText('No reviews yet.')).toBeVisible()

    // actions
    await fillReview(page)
    await page.getByLabel('Your review').fill('Steep and muddy after the second post.')
    await page.getByRole('button', { name: 'Flag an incident' }).click()
    await page.getByRole('combobox', { name: 'Incident', exact: true }).selectOption(LANDSLIDE.label)
    await page.getByLabel('What happened?').fill('Rocks across the path near the summit')
    await page.getByRole('button', { name: 'Submit review' }).click()

    // assert: the review shows with its hazard
    const entry = trailRegister(page).getByTestId('review-entry')
    await expect(entry).toHaveCount(1)
    await expect(entry).toContainText('Test Hiker')
    await expect(entry).toContainText('Steep and muddy after the second post.')
    await expect(entry).toContainText(LANDSLIDE.label)
    await expect(entry).toContainText('Rocks across the path near the summit')

    // assert: the hazard was saved against the route, which is what the admin page acts on
    expect(db.incidents).toEqual([
      expect.objectContaining({ route_id: ROUTE_ID, category: LANDSLIDE.category, note: 'Rocks across the path near the summit' }),
    ])
  })

  // Verify that a hazard can't be posted without saying what happened, so admins get something to act on.
  test('should not post a hazard without saying what happened', async ({ page }) => {
    // setup
    const db = await signInOnRoute(page)

    // actions
    await fillReview(page)
    await page.getByRole('button', { name: 'Flag an incident' }).click()
    await page.getByRole('combobox', { name: 'Incident', exact: true }).selectOption(LANDSLIDE.label)
    await page.getByRole('button', { name: 'Submit review' }).click()

    // assert
    await expect(trailRegister(page).getByText('Describe what happened in incident 1, or remove it.')).toBeVisible()
    expect(db.requests).toHaveLength(0)
  })
})

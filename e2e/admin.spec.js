/* admin.spec.js
 E2E tests for the /admin page.
 Journey: an admin keeps hikers safe:
   1. Only admins can open the page
   2. Sees what needs attention
   3. Turns a hiker's hazard report into an alert, and can take an alert down
   4. Closes a route, with a note for hikers
   5. Removes a review, after confirming
 Supabase is mocked: the tests sign in through the real form with a fake admin, and every
 request is answered here, so no real account or data is touched.
*/

import { Buffer } from 'node:buffer'
import { test, expect } from '@playwright/test'

const ADMIN = { id: '00000000-0000-4000-8000-0000000000aa', email: 'admin@example.com', aud: 'authenticated' }

// The app talks to Supabase on another origin, so mocked responses need this to be readable
const CORS = { 'access-control-allow-origin': '*' }

// Shaped like a real token, in case the Supabase client decodes it
const encode = (part) => Buffer.from(JSON.stringify(part)).toString('base64url')
const FAKE_TOKEN = `${encode({ alg: 'none' })}.${encode({ sub: ADMIN.id })}.signature`

const OPEN_ROUTE = {
  id: 'route-open',
  name: 'Bukit Timah Summit',
  country: 'Singapore',
  official_difficulty: 1,
  effective_difficulty: 1,
  review_count: 3,
  stats_updated_at: '2026-10-01T00:00:00Z',
  distance_km: 4,
  elevation_gain_m: 150,
  altitude_m: 163,
  latitude: 1.35,
  longitude: 103.77,
  geometry_present: true,
  safety_status: 'open',
  safety_status_note: null,
}
const CLOSED_ROUTE = {
  ...OPEN_ROUTE,
  id: 'route-closed',
  name: 'Ciremai Track Via Apuy',
  country: 'Indonesia',
  safety_status: 'closed',
  safety_status_note: 'Closed by the park because of forest fire risk.',
}
// Missing its distance, so it shows on the Route info tab
const INCOMPLETE_ROUTE = { ...OPEN_ROUTE, id: 'route-incomplete', name: 'Gunung Datuk', country: 'Malaysia', distance_km: null }

// Stands in for Supabase. Keeps what the page saves, so reloading the data shows it.
async function mockSupabase(page) {
  const db = {
    routes: [OPEN_ROUTE, CLOSED_ROUTE, INCOMPLETE_ROUTE].map((r) => ({ ...r })),
    alerts: [],
    pointWarnings: [
      {
        route_id: OPEN_ROUTE.id,
        point_id: 'point-1',
        point_name: 'Summit hut',
        day_number: null,
        category: 'landslide',
        label: 'Landslide or rockfall',
        severity: 3,
        reporter_count: 2,
        last_reported_at: '2026-11-01T00:00:00Z',
        latest_note: 'Rocks across the path',
      },
    ],
    reviews: [
      {
        id: 'review-1',
        route_id: OPEN_ROUTE.id,
        rating: 1,
        perceived_difficulty: 2,
        review_text: 'Spam spam spam',
        completed: true,
        created_at: '2026-11-02T00:00:00Z',
        profiles: { display_name: 'Spammer' },
        routes: { name: OPEN_ROUTE.name },
        review_incidents: [],
      },
    ],
    requests: [], // writes, for checking what was sent
  }

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

  await page.route('**/auth/v1/token*', (route) =>
    json(route, { access_token: FAKE_TOKEN, refresh_token: 'fake', token_type: 'bearer', expires_in: 3600, user: ADMIN }),
  )
  await page.route('**/auth/v1/user*', (route) => json(route, ADMIN))
  await page.route('**/rest/v1/profiles*', (route) =>
    json(route, { id: ADMIN.id, display_name: 'Test Admin', is_admin: true }),
  )

  await page.route('**/rest/v1/routes*', (route) => {
    const request = route.request()
    if (['GET', 'HEAD'].includes(request.method())) {
      // The hazard query asks only for routes above "low"; none of these are
      if (request.url().includes('community_hazard_level')) return json(route, [])
      return json(route, db.routes)
    }
    const { body, url } = write(route)
    const id = new URL(url).searchParams.get('id').replace('eq.', '')
    const saved = db.routes.find((r) => r.id === id)
    Object.assign(saved, body)
    return json(route, [saved])
  })

  await page.route('**/rest/v1/route_alerts*', (route) => {
    const request = route.request()
    if (['GET', 'HEAD'].includes(request.method())) return json(route, db.alerts)
    const { method, body, url } = write(route)
    if (method === 'POST') {
      const routeRow = db.routes.find((r) => r.id === body.route_id)
      db.alerts.unshift({
        id: `alert-${db.alerts.length + 1}`,
        created_at: new Date().toISOString(),
        ...body,
        routes: { id: routeRow.id, name: routeRow.name, country: routeRow.country },
        creator: { display_name: 'Test Admin' },
        editor: null,
      })
    } else {
      const id = new URL(url).searchParams.get('id').replace('eq.', '')
      Object.assign(db.alerts.find((a) => a.id === id), body)
    }
    return route.fulfill({ status: 201, headers: CORS })
  })

  await page.route('**/rest/v1/route_point_warnings*', (route) => json(route, db.pointWarnings))
  await page.route('**/rest/v1/admin_report_reviews*', (route) => {
    if (route.request().method() === 'GET') return json(route, [])
    const { body } = write(route)
    return json(route, { id: 'reviewed-1', ...body })
  })
  await page.route('**/rest/v1/review_incidents*', (route) => json(route, []))
  await page.route('**/rest/v1/reviews*', (route) => {
    if (['GET', 'HEAD'].includes(route.request().method())) return json(route, db.reviews)
    const { url } = write(route)
    const id = new URL(url).searchParams.get('id').replace('eq.', '')
    db.reviews = db.reviews.filter((r) => r.id !== id)
    return json(route, [{ id }])
  })
  // Recalculating a route's stats after a change
  await page.route('**/rest/v1/rpc/**', (route) => json(route, null))
  await page.route('**/functions/v1/**', (route) => json(route, {}))

  return db
}

async function signInToAdmin(page) {
  const db = await mockSupabase(page)
  await page.goto('/admin')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Password').fill('password')
  await page.getByLabel('Password').press('Enter')
  await expect(page).toHaveURL(/\/admin/)
  await expect(page.getByRole('heading', { name: 'Route alerts and safety', level: 1 })).toBeVisible()
  return db
}

const routeBox = (page) => page.getByLabel('Route', { exact: true })
const tab = (page, name) => page.getByRole('tab', { name })
const panel = (page) => page.getByRole('tabpanel')

// The radios are hidden behind their labels, so click the label an admin sees
async function chooseStatus(page, status) {
  await page.getByRole('radiogroup', { name: 'Safety status' }).getByText(status, { exact: true }).click()
  await expect(page.getByRole('radio', { name: status })).toBeChecked()
}

test.describe('Admin page', () => {
  // Verify that only admins can open /admin.
  test('should send someone who is not an admin back home', async ({ page }) => {
    // setup: the signed in user is a hiker, not an admin
    await mockSupabase(page)
    await page.route('**/rest/v1/profiles*', (route) =>
      route.fulfill({ headers: CORS, json: { id: ADMIN.id, display_name: 'Hiker', is_admin: false } }),
    )
    await page.goto('/admin')

    // actions
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Password').fill('password')
    await page.getByLabel('Password').press('Enter')

    // assert
    await expect(page).toHaveURL(/\/$/)
  })

  // Verify that the counts show what needs doing, and each one opens its tab.
  test('should show the counts, and open the matching tab from each one', async ({ page }) => {
    // setup
    await signInToAdmin(page)

    // assert
    await expect(page.getByText('1 item needs your attention, and 1 route is not open.')).toBeVisible()
    await expect(page.getByTestId('admin-number-attention')).toContainText('1')
    await expect(page.getByTestId('admin-number-status')).toContainText('1')
    await expect(page.getByTestId('admin-number-info')).toContainText('1')

    // actions
    await page.getByTestId('admin-number-info').click()

    // assert
    await expect(tab(page, 'Route info')).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/tab=info/)
    await expect(panel(page)).toContainText('Gunung Datuk')
  })

  // Verify that a hazard hikers reported can be turned into a published alert.
  test('should fill in an alert from a hazard report and publish it', async ({ page }) => {
    // setup
    const db = await signInToAdmin(page)

    // actions
    await panel(page).getByRole('button', { name: 'Raise alert' }).click()

    // assert: the form is filled in from the report
    await expect(tab(page, 'Alerts')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Filled in from hiker reports')).toBeVisible()
    await expect(routeBox(page)).toHaveValue(OPEN_ROUTE.name)
    await expect(page.getByLabel('Title')).not.toHaveValue('')

    // actions
    await page.getByRole('button', { name: 'Publish alert' }).click()

    // assert: it was saved, and leaves the attention list and the count
    await expect(page.getByText('Alert published.')).toBeVisible()
    const sent = db.requests.find((r) => r.method === 'POST' && r.url.includes('route_alerts'))
    expect(sent.body).toMatchObject({ route_id: OPEN_ROUTE.id, source: 'community', status: 'active' })
    await expect(page.getByTestId('admin-number-attention')).toContainText('0')
    await expect(page.getByTestId('admin-number-alerts')).toContainText('1')
  })

  // Verify that an alert can't be published until a route is chosen.
  test('should not publish an alert without a route', async ({ page }) => {
    // setup
    const db = await signInToAdmin(page)
    await tab(page, 'Alerts').click()

    // actions: typing over the chosen name drops the choice
    await routeBox(page).fill('bukit')
    await panel(page).getByRole('button', { name: /Bukit Timah Summit/ }).click()
    await routeBox(page).fill('Bukit Timah Summi')
    await page.getByLabel('Title').fill('Bridge washed out')
    await page.getByRole('button', { name: 'Publish alert' }).click()

    // assert
    await expect(page.getByText('Select the route this alert is for.')).toBeVisible()
    expect(db.requests.some((r) => r.url.includes('route_alerts'))).toBe(false)
  })

  // Verify that an alert can be taken down, and that a mistake can be undone.
  test('should take down a published alert, and undo it', async ({ page }) => {
    // setup: publish an alert to take down
    const db = await signInToAdmin(page)
    await tab(page, 'Alerts').click()
    await routeBox(page).fill('bukit')
    await panel(page).getByRole('button', { name: /Bukit Timah Summit/ }).click()
    await page.getByLabel('Title').fill('Bridge washed out')
    await page.getByRole('button', { name: 'Publish alert' }).click()
    await expect(panel(page)).toContainText('Bridge washed out')

    // actions
    await panel(page).getByRole('button', { name: /Take down/i }).click()

    // assert
    await expect(page.getByTestId('admin-number-alerts')).toContainText('0')
    expect(db.alerts[0].status).toBe('dismissed')

    // actions
    await panel(page).getByRole('button', { name: /Undo/i }).click()

    // assert
    await expect(page.getByTestId('admin-number-alerts')).toContainText('1')
    expect(db.alerts[0].status).toBe('active')
  })

  // Verify that closing a route saves its status and note, and counts it as not open.
  test('should close a route and list it under Not open', async ({ page }) => {
    // setup
    const db = await signInToAdmin(page)
    await tab(page, 'Route status').click()

    // actions
    await page.getByLabel('Find a route').fill('bukit')
    await panel(page).getByRole('button', { name: /Bukit Timah Summit/ }).click()
    await chooseStatus(page, 'closed')
    await page.getByLabel(/Note for hikers/).fill('Closed for repairs.')
    await page.getByRole('button', { name: 'Save status' }).click()

    // assert
    await expect(page.getByText('Status saved.')).toBeVisible()
    const sent = db.requests.find((r) => r.method === 'PATCH' && r.url.includes('/routes'))
    expect(sent.body).toEqual({ safety_status: 'closed', safety_status_note: 'Closed for repairs.' })
    await expect(page.getByTestId('admin-number-status')).toContainText('2')
  })

  // Verify that a route can't be closed without telling hikers why.
  test('should need a note to close a route', async ({ page }) => {
    // setup
    const db = await signInToAdmin(page)
    await tab(page, 'Route status').click()

    // actions
    await page.getByLabel('Find a route').fill('bukit')
    await panel(page).getByRole('button', { name: /Bukit Timah Summit/ }).click()
    await chooseStatus(page, 'closed')
    await page.getByRole('button', { name: 'Save status' }).click()

    // assert
    await expect(panel(page).getByRole('alert')).toBeVisible()
    expect(db.requests.some((r) => r.url.includes('/routes'))).toBe(false)
  })

  // Verify that a review is only removed once the admin confirms.
  test('should remove a review only after confirming', async ({ page }) => {
    // setup
    const db = await signInToAdmin(page)
    await tab(page, 'Reviews').click()
    await expect(panel(page)).toContainText('Spam spam spam')

    // actions
    await panel(page).getByRole('button', { name: 'Remove' }).click()
    await panel(page).getByRole('button', { name: 'Cancel' }).click()

    // assert: cancelling sends nothing
    expect(db.requests.some((r) => r.url.includes('/reviews'))).toBe(false)

    // actions
    await panel(page).getByRole('button', { name: 'Remove' }).click()
    await panel(page).getByRole('button', { name: 'Confirm remove' }).click()

    // assert
    await expect(panel(page)).not.toContainText('Spam spam spam')
    expect(db.requests.some((r) => r.method === 'DELETE' && r.url.includes('/reviews'))).toBe(true)
  })
})

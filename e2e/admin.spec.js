/* admin.spec.js
 E2E tests for the /admin page.
 Journey: an admin signs in, checks what needs attention, publishes an alert, sets a route's
 status and removes a review.
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

test.describe('Admin page', () => {
  test('should send someone who is not an admin back home', async ({ page }) => {
    await mockSupabase(page)
    await page.route('**/rest/v1/profiles*', (route) =>
      route.fulfill({ headers: CORS, json: { id: ADMIN.id, display_name: 'Hiker', is_admin: false } }),
    )
    await page.goto('/admin')
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Password').fill('password')
    await page.getByLabel('Password').press('Enter')

    await expect(page).toHaveURL(/\/$/)
  })

  test('should show the counts, and open the matching tab from each one', async ({ page }) => {
    await signInToAdmin(page)

    await expect(page.getByText('1 item needs your attention, and 1 route is not open.')).toBeVisible()
    await expect(page.getByTestId('admin-number-attention')).toContainText('1')
    await expect(page.getByTestId('admin-number-status')).toContainText('1')
    await expect(page.getByTestId('admin-number-info')).toContainText('1')

    await page.getByTestId('admin-number-info').click()
    await expect(tab(page, 'Route info')).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/tab=info/)
    await expect(panel(page)).toContainText('Gunung Datuk')
  })

  test('should keep the open tab on reload, and move between tabs with the arrow keys', async ({ page }) => {
    await signInToAdmin(page)

    await tab(page, 'Route status').click()
    await page.reload()
    await expect(tab(page, 'Route status')).toHaveAttribute('aria-selected', 'true')

    await tab(page, 'Route status').press('ArrowRight')
    await expect(tab(page, 'Route info')).toHaveAttribute('aria-selected', 'true')
    await expect(tab(page, 'Route info')).toBeFocused()
    await tab(page, 'Route info').press('ArrowLeft')
    await expect(tab(page, 'Route status')).toHaveAttribute('aria-selected', 'true')
  })

  test('should open the hazard confirmed in the banner', async ({ page }) => {
    await signInToAdmin(page)
    await tab(page, 'Reviews').click()

    await page.getByRole('button', { name: /Hazard confirmed by hikers/ }).click()

    await expect(tab(page, 'Needs attention')).toHaveAttribute('aria-selected', 'true')
    await expect(panel(page)).toContainText('Landslide or rockfall')
  })

  test('should fill in an alert from a hazard report and publish it', async ({ page }) => {
    const db = await signInToAdmin(page)

    await panel(page).getByRole('button', { name: 'Raise alert' }).click()

    await expect(tab(page, 'Alerts')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Filled in from hiker reports')).toBeVisible()
    await expect(routeBox(page)).toHaveValue(OPEN_ROUTE.name)
    await expect(page.getByLabel('Title')).not.toHaveValue('')

    await page.getByRole('button', { name: 'Publish alert' }).click()

    await expect(page.getByText('Alert published.')).toBeVisible()
    const sent = db.requests.find((r) => r.method === 'POST' && r.url.includes('route_alerts'))
    expect(sent.body).toMatchObject({ route_id: OPEN_ROUTE.id, source: 'community', status: 'active' })
    // Handled, so it leaves the attention list and the count
    await expect(page.getByTestId('admin-number-attention')).toContainText('0')
    await expect(page.getByTestId('admin-number-alerts')).toContainText('1')
  })

  test('should publish an alert for a route found by searching', async ({ page }) => {
    const db = await signInToAdmin(page)
    await tab(page, 'Alerts').click()

    await routeBox(page).fill('bukit')
    await panel(page).getByRole('button', { name: /Bukit Timah Summit/ }).click()
    await expect(routeBox(page)).toHaveValue(OPEN_ROUTE.name)
    await page.getByLabel('Severity').selectOption('danger')
    await page.getByLabel('Title').fill('Bridge washed out')
    await page.getByRole('button', { name: 'Publish alert' }).click()

    await expect(page.getByText('Alert published.')).toBeVisible()
    const sent = db.requests.find((r) => r.method === 'POST' && r.url.includes('route_alerts'))
    expect(sent.body).toMatchObject({ route_id: OPEN_ROUTE.id, severity: 'danger', title: 'Bridge washed out' })
    await expect(panel(page)).toContainText('Bridge washed out')
  })

  test('should not publish an alert without a route', async ({ page }) => {
    const db = await signInToAdmin(page)
    await tab(page, 'Alerts').click()

    await routeBox(page).fill('bukit')
    await panel(page).getByRole('button', { name: /Bukit Timah Summit/ }).click()
    // Typing over the chosen name drops the choice
    await routeBox(page).fill('Bukit Timah Summi')
    await page.getByLabel('Title').fill('Bridge washed out')
    await page.getByRole('button', { name: 'Publish alert' }).click()

    await expect(page.getByText('Select the route this alert is for.')).toBeVisible()
    expect(db.requests.some((r) => r.url.includes('route_alerts'))).toBe(false)
  })

  test('should warn when the route for an alert is already closed', async ({ page }) => {
    await signInToAdmin(page)
    await tab(page, 'Alerts').click()

    await routeBox(page).fill('ciremai')
    await panel(page).getByRole('button', { name: /Ciremai Track Via Apuy/ }).click()

    await expect(panel(page)).toContainText('This route is already marked Closed')
    await expect(panel(page)).toContainText(CLOSED_ROUTE.safety_status_note)

    await routeBox(page).fill('bukit')
    await panel(page).getByRole('button', { name: /Bukit Timah Summit/ }).click()
    await expect(panel(page)).not.toContainText('This route is already marked Closed')
  })

  test('should take down a published alert, and undo it', async ({ page }) => {
    const db = await signInToAdmin(page)
    await tab(page, 'Alerts').click()
    await routeBox(page).fill('bukit')
    await panel(page).getByRole('button', { name: /Bukit Timah Summit/ }).click()
    await page.getByLabel('Title').fill('Bridge washed out')
    await page.getByRole('button', { name: 'Publish alert' }).click()
    await expect(panel(page)).toContainText('Bridge washed out')

    await panel(page).getByRole('button', { name: /Take down/i }).click()
    await expect(page.getByTestId('admin-number-alerts')).toContainText('0')
    expect(db.alerts[0].status).toBe('dismissed')

    await panel(page).getByRole('button', { name: /Undo/i }).click()
    await expect(page.getByTestId('admin-number-alerts')).toContainText('1')
    expect(db.alerts[0].status).toBe('active')
  })

  test('should close a route and list it under Not open', async ({ page }) => {
    const db = await signInToAdmin(page)
    await tab(page, 'Route status').click()

    await page.getByLabel('Find a route').fill('bukit')
    await panel(page).getByRole('button', { name: /Bukit Timah Summit/ }).click()
    await page.locator('label[for="status-closed"]').click()
    await page.getByLabel(/Note for hikers/).fill('Closed for repairs.')
    await page.getByRole('button', { name: 'Save status' }).click()

    await expect(page.getByText('Status saved.')).toBeVisible()
    const sent = db.requests.find((r) => r.method === 'PATCH' && r.url.includes('/routes'))
    expect(sent.body).toEqual({ safety_status: 'closed', safety_status_note: 'Closed for repairs.' })
    await expect(page.getByTestId('admin-number-status')).toContainText('2')
  })

  test('should need a note to close a route', async ({ page }) => {
    const db = await signInToAdmin(page)
    await tab(page, 'Route status').click()

    await page.getByLabel('Find a route').fill('bukit')
    await panel(page).getByRole('button', { name: /Bukit Timah Summit/ }).click()
    await page.locator('label[for="status-closed"]').click()
    await page.getByRole('button', { name: 'Save status' }).click()

    await expect(panel(page).getByRole('alert')).toBeVisible()
    expect(db.requests.some((r) => r.url.includes('/routes'))).toBe(false)
  })

  test('should remove a review only after confirming', async ({ page }) => {
    const db = await signInToAdmin(page)
    await tab(page, 'Reviews').click()
    await expect(panel(page)).toContainText('Spam spam spam')

    await panel(page).getByRole('button', { name: 'Remove' }).click()
    await panel(page).getByRole('button', { name: 'Cancel' }).click()
    expect(db.requests.some((r) => r.url.includes('/reviews'))).toBe(false)

    await panel(page).getByRole('button', { name: 'Remove' }).click()
    await panel(page).getByRole('button', { name: 'Confirm remove' }).click()

    await expect(panel(page)).not.toContainText('Spam spam spam')
    expect(db.requests.some((r) => r.method === 'DELETE' && r.url.includes('/reviews'))).toBe(true)
  })
})

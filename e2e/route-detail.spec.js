/* route-detail.spec.js
 E2E tests for the /routes/:id page.
 Journey: a visitor (not signed in) decides whether to walk a route:
   1. Reads the route's details and weather forecast
   2. Reads other hikers' reviews, and is told to sign in to write one
   3. Gets a way back if the route doesn't exist
 These tests only read data, so they can run again and again without any cleanup.
*/

import { test, expect } from '@playwright/test'

// Gunung Merbabu (Suwanting BC), which has reviews. If it loses them, choose another route here.
const ROUTE_WITH_REVIEWS = '/routes/d3835d32-520c-428b-a819-e596af749324'
const MISSING_ROUTE = '/routes/00000000-0000-0000-0000-000000000000'

test.describe('Viewing a route', () => {
  // Verify that the details a hiker decides on are shown, including live weather.
  test("should show the route's name, numbers and weather forecast", async ({ page }) => {
    // setup
    await page.goto(ROUTE_WITH_REVIEWS)

    // assert
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Gunung Merbabu')
    await expect(page.getByRole('region', { name: 'Route facts' })).toContainText('Distance')
    // The forecast comes from an outside service, so it gets longer than the usual 5 seconds
    await expect(page.getByText('Current Weather:')).toBeVisible({ timeout: 15000 })
  })

  // Verify that reviews can be read without an account, and that writing one asks for sign-in.
  test("should show a route's reviews and a sign-in prompt when signed out", async ({ page }) => {
    // setup
    await page.goto(ROUTE_WITH_REVIEWS)
    const register = page.getByRole('region', { name: 'Trail register' })

    // assert
    await expect(register.getByRole('heading', { name: 'Trail register' })).toBeVisible()
    await expect(register.getByTestId('review-entry').first()).toBeVisible()
    await expect(register.getByText('No reviews yet.')).toHaveCount(0)
    await expect(register.getByRole('link', { name: 'Sign in' })).toBeVisible()
  })

  // Verify that an old or mistyped link explains itself and offers a way back.
  test("should show a message and a link back when the route doesn't exist", async ({ page }) => {
    // setup
    await page.goto(MISSING_ROUTE)

    // assert
    await expect(page.getByText('This route could not be found.')).toBeVisible()

    // actions
    await page.getByRole('link', { name: 'Back to all routes' }).click()

    // assert
    await expect(page).toHaveURL(/\/routes$/)
  })
})

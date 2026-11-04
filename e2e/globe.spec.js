/* globe.spec.js
 E2E tests for the /globe page.
 Journey: a visitor (not signed in) explores the routes on the globe:
   1. Starts exploring from the title screen
   2. Flies to a country and back to all routes
   3. Opens a route from its pill on the globe
 The globe itself is a canvas that tests can't see into, so these use the HTML drawn over it:
 the route index, the pills, the cards and the position readout.
 These tests only read data, so they can run again and again without any cleanup.
*/

import { test, expect } from '@playwright/test'

// Where the globe settles once the user starts exploring (exploreView in RoutesGlobe.vue)
const START_POSITION = 'N 4.00° E 119.00°'

async function startExploring(page) {
  // The real map has to download before the button appears, which is slow with several browsers open
  test.slow()

  await page.goto('/globe')
  await page.getByRole('button', { name: 'Explore the globe' }).click()
}

test.describe('Exploring the globe', () => {
  // Verify that a country can be selected, and that "All routes" returns to the opening view.
  test('should select a country, then go back to all routes', async ({ page }) => {
    // setup
    await startExploring(page)
    const country = page.getByTestId('globe-country-button').first()

    // actions
    await country.click()

    // assert
    await expect(country).toHaveAttribute('aria-pressed', 'true')

    // actions
    await page.getByTestId('globe-all-routes-button').click()

    // assert
    await expect(country).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByTestId('globe-readout')).toHaveText(START_POSITION)
  })

  // Verify the end of the journey: a pill opens a card, and the card opens that route's page.
  test('should open the route page from a pill on the globe', async ({ page }) => {
    // setup
    await startExploring(page)

    // actions
    await page.getByTestId('route-pill').first().click()
    const openRoute = page.getByTestId('route-card-view-more')
    await expect(openRoute).toBeVisible()
    const card = page.getByTestId('route-card').filter({ has: openRoute })
    const name = await card.getByRole('heading').textContent()
    await openRoute.click()

    // assert: the camera dives onto the route and waits for its photos before the page opens
    await expect(page.getByTestId('route-transition-screen')).toContainText(name, {
      timeout: 30000,
    })
    await expect(page).toHaveURL(/\/routes\/[^/]+$/, { timeout: 30000 })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
  })
})

/* routes-browse.spec.js
 E2E tests for the /routes page.
 Journey: a visitor (not signed in) finds a route to walk by:
   1. Searching routes by name
   2. Filtering by country and difficulty
   3. Sorting and paging through the results
   4. Opening a route's page
 These tests only read data, so they can run again and again without any cleanup.
 Expected values come from what the page has loaded, not hard-coded route names,
 so the tests still pass when routes are added or edited.
*/

import { test, expect } from '@playwright/test'

const PAGE_SIZE = 24

test.describe('Browsing routes', () => {
  // Verify that a search only leaves routes whose name matches, whatever the case.
  test('should only show routes whose name matches, ignoring case', async ({ page }) => {
    // setup
    await page.goto('/routes')
    const tiles = page.getByTestId('route-tile')
    const name = await tiles.first().getByRole('heading').textContent()

    // actions
    await page.getByTestId('routes-search').fill(name.toUpperCase())

    // assert: hasNotText picks out any tile that doesn't match, and there should be none left
    await expect(tiles.filter({ hasNotText: name })).toHaveCount(0)
    await expect(tiles.getByRole('heading', { name })).not.toHaveCount(0)
  })

  // Verify that a search with no results explains itself and can be cleared.
  test('should show a message when nothing matches, and recover on clear', async ({ page }) => {
    // setup
    await page.goto('/routes')
    const tiles = page.getByTestId('route-tile')
    const emptyState = page.getByTestId('routes-empty')

    // actions
    await page.getByTestId('routes-search').fill('no route is called this')

    // assert
    await expect(emptyState.getByRole('heading')).toHaveText('No routes match these filters')
    await expect(tiles).toHaveCount(0)

    // actions
    await emptyState.getByRole('button', { name: 'Clear all filters' }).click()

    // assert
    await expect(emptyState).toBeHidden()
    await expect(page.getByTestId('routes-search')).toHaveValue('')
    await expect(tiles).toHaveCount(PAGE_SIZE)
  })

  // Verify that the country filter only leaves routes from that country.
  test('should only show routes from the chosen country', async ({ page }) => {
    // setup
    await page.goto('/routes')
    const tiles = page.getByTestId('route-tile')

    // actions
    await page.getByRole('button', { name: /^Country/ }).click()
    const countrySelect = page.getByRole('combobox', { name: 'Country' })
    await countrySelect.selectOption({ index: 1 })
    const country = await countrySelect.inputValue()

    // assert
    await expect(tiles.filter({ hasNotText: country })).toHaveCount(0)
    await expect(tiles.first()).toBeVisible()
  })

  // Verify that the difficulty filter only leaves routes of that grade.
  test('should only show routes of the chosen difficulty', async ({ page }) => {
    // setup
    await page.goto('/routes')
    const tiles = page.getByTestId('route-tile')

    // actions
    await page.getByRole('button', { name: /^Difficulty/ }).click()
    await page.getByRole('checkbox', { name: /Moderate/ }).check()

    // assert
    await expect(tiles.filter({ hasNotText: 'Moderate' })).toHaveCount(0)
    await expect(tiles.first()).toBeVisible()
  })

  // Verify that sorting by distance puts the longest routes first.
  test('should list the longest routes first when sorted by distance', async ({ page }) => {
    // setup
    await page.goto('/routes')
    const sortButton = page.getByRole('button', { name: /^Sort/ })

    // actions
    await sortButton.click()
    await page.getByRole('button', { name: 'Longest first' }).click()
    await expect(sortButton).toContainText('Longest first')
    // Tiles leaving the list fade out first, so wait for them to go before reading the order
    await expect(page.getByTestId('route-tile')).toHaveCount(PAGE_SIZE)

    // Each tile starts "1,234 km · +500 m · 2 days". Routes with no distance show "—".
    const facts = await page.getByTestId('route-tile-facts').allTextContents()
    const distances = facts
      .map((text) => parseFloat(text.trim().replaceAll(',', '')))
      .filter((distance) => !Number.isNaN(distance))

    // assert
    expect(distances.length).toBeGreaterThan(1)
    expect(distances).toEqual(distances.toSorted((a, b) => b - a))
  })

  // Verify that "Show more" adds another page of routes.
  test('should load another page of routes on "Show more"', async ({ page }) => {
    // setup
    await page.goto('/routes')
    const tiles = page.getByTestId('route-tile')
    await expect(tiles).toHaveCount(PAGE_SIZE)

    // actions
    await page.getByRole('button', { name: 'Show more' }).click()

    // assert
    await expect(tiles).toHaveCount(PAGE_SIZE * 2)
  })

  // Verify that the transition screen shows the route, and its page then opens with no loading message.
  test('should show the transition screen before the route page opens', async ({ page }) => {
    // setup
    await page.goto('/routes')
    const firstTile = page.getByTestId('route-tile').first()
    const name = await firstTile.getByRole('heading').textContent()

    // actions
    await firstTile.click()

    // assert: the transition waits for the route's details before the page opens
    await expect(page.getByTestId('route-transition-screen')).toContainText(name)
    await expect(page).toHaveURL(/\/routes\/[^/]+$/, { timeout: 30000 })
    await expect(page.getByTestId('route-loading')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
  })

  // Verify that a database failure shows an error rather than an empty page.
  test('should show an error when the database is unavailable', async ({ page }) => {
    // setup: make the routes request fail before the page loads
    await page.route('**/rest/v1/routes*', (route) =>
      route.fulfill({ status: 500, json: { message: 'Service unavailable' } }),
    )

    // actions
    await page.goto('/routes')

    // assert
    await expect(page.getByRole('alert')).toContainText('Unable to load routes')
    await expect(page.getByTestId('route-tile')).toHaveCount(0)
  })
})

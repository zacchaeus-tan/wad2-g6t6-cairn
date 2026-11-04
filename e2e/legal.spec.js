/* legal.spec.js
 E2E tests for the privacy policy and terms pages.
 Journey: a visitor opens the privacy policy and the terms from the footer.
 Google's sign-in setup links to both, so they must open without signing in.
*/

import { test, expect } from '@playwright/test'

test.describe('Privacy policy and terms', () => {
  // Verify that the privacy policy opens from the footer, at the top, without signing in.
  test('should open the privacy policy from the footer, at the top', async ({ page }) => {
    // setup
    await page.goto('/routes')

    // actions
    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click()

    // assert
    await expect(page).toHaveURL(/\/privacy$/)
    await expect(page.getByRole('heading', { name: 'Privacy policy', level: 1 })).toBeInViewport()
  })


  // Verify that the terms open from the footer without signing in.
  test('should open the terms of service from the footer', async ({ page }) => {
    // setup
    await page.goto('/routes')

    // actions
    await page.getByRole('contentinfo').getByRole('link', { name: 'Terms' }).click()

    // assert
    await expect(page).toHaveURL(/\/terms$/)
    await expect(page.getByRole('heading', { name: 'Terms of service', level: 1 })).toBeVisible()
  })
})

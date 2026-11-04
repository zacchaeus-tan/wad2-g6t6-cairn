/* legal.spec.js
 E2E tests for the privacy policy page.
 Journey: a visitor opens the privacy policy from the footer.
 Google's sign-in setup links to it, so it must open without signing in.
*/

import { test, expect } from '@playwright/test'

test.describe('Privacy policy', () => {
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
})

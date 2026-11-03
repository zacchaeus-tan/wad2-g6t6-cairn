/* legal.spec.js
 E2E tests for the privacy policy and terms pages.
 Google's sign-in setup links to both, so they must open without signing in.
*/

import { test, expect } from '@playwright/test'

test.describe('Privacy and terms', () => {
  test('should open the privacy policy from the footer, at the top', async ({ page }) => {
    await page.goto('/routes')

    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click()

    await expect(page).toHaveURL(/\/privacy$/)
    await expect(page.getByRole('heading', { name: 'Privacy policy', level: 1 })).toBeInViewport()
  })

  test('should show the terms without signing in', async ({ page }) => {
    await page.goto('/terms')

    await expect(page.getByRole('heading', { name: 'Terms of service', level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'privacy policy' })).toHaveAttribute('href', '/privacy')
  })
})

/* auth.spec.js
 E2E tests for the /auth page.
 Journey: a visitor signs in, or switches to registering.
 The wrong-password test answers the sign-in request itself, so it never reaches Supabase
 and can run again and again without hitting its limits.
*/

import { test, expect } from '@playwright/test'

test.describe('Signing in', () => {
  test('should show the sign-in form', async ({ page }) => {
    await page.goto('/auth')

    await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeAttached()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in', pressed: true })).toBeVisible()
    await expect(page.getByLabel('Name')).toHaveCount(0)
  })

  test('should reveal the extra fields when choosing Register', async ({ page }) => {
    await page.goto('/auth')

    await page.getByRole('button', { name: 'Register' }).click()

    await expect(page.getByRole('button', { name: 'Register', pressed: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Create your profile', level: 1 }),
    ).toBeAttached()
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('Age')).toBeVisible()
    await expect(page.getByLabel('Gender')).toBeVisible()
    await expect(page.getByLabel('Country')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create profile' })).toBeVisible()
  })

  test('should show an error for a wrong password', async ({ page }) => {
    await page.route('**/auth/v1/token*', (route) =>
      route.fulfill({
        status: 400,
        json: { code: 'invalid_credentials', message: 'Invalid login credentials' },
      }),
    )
    await page.goto('/auth')

    await page.getByLabel('Email').fill('hiker@example.com')
    await page.getByLabel('Password').fill('wrong-password')
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('alert')).toContainText('Invalid login credentials')
  })
})

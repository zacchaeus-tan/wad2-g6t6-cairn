/* auth.spec.js
 E2E tests for the /auth page.
 Journey: a visitor signs in:
   1. Is told when their password is wrong
   2. Is sent to Google, to come back to their profile
   3. As a new Google user, fills in the rest of their profile first
 The wrong-password test answers the sign-in request itself, so it never reaches Supabase
 and can run again and again without hitting its limits.
*/

import { Buffer } from 'node:buffer'
import { test, expect } from '@playwright/test'

test.describe('Signing in', () => {
  // Verify that a wrong password explains itself rather than failing silently.
  test('should show an error for a wrong password', async ({ page }) => {
    // setup
    await page.route('**/auth/v1/token*', (route) =>
      route.fulfill({
        status: 400,
        json: { code: 'invalid_credentials', message: 'Invalid login credentials' },
      }),
    )
    await page.goto('/auth')

    // actions
    await page.getByLabel('Email').fill('hiker@example.com')
    await page.getByLabel('Password').fill('wrong-password')
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click()

    // assert
    await expect(page.getByRole('alert')).toContainText('Invalid login credentials')
  })
})

test.describe('Signing in with Google', () => {
  // Verify that Google sign-in starts, and will bring the user back to their profile.
  test('should send them to Google and back to their profile', async ({ page }) => {
    // setup: Google's page is replaced, so the test never leaves our app
    await page.route('**/auth/v1/authorize*', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: 'Google sign-in' }),
    )
    await page.goto('/auth')

    // actions
    await page.getByRole('button', { name: 'Continue with Google' }).click()

    // assert
    await expect(page).toHaveURL(/\/auth\/v1\/authorize\?provider=google/)
    const returnTo = new URL(page.url()).searchParams.get('redirect_to')
    expect(new URL(returnTo).pathname).toBe('/profile')
  })

  // Verify that a new Google user fills in their profile before going on.
  // Signs in through the form with mocked Supabase replies, as a user whose account came from
  // Google, so it never reaches Supabase or Google
  test('should ask a new Google user for the rest of their profile', async ({ page }) => {
    // setup
    const user = {
      id: '00000000-0000-4000-8000-000000000002',
      email: 'hiker@gmail.com',
      aud: 'authenticated',
      app_metadata: { provider: 'google' },
    }
    const profile = { id: user.id, display_name: 'Google Hiker', age: null, gender: null, country: null, about: null }
    const cors = { 'access-control-allow-origin': '*' }
    const encode = (part) => Buffer.from(JSON.stringify(part)).toString('base64url')

    await page.route('**/auth/v1/token*', (route) =>
      route.fulfill({
        headers: cors,
        json: {
          access_token: `${encode({ alg: 'none' })}.${encode({ sub: user.id })}.signature`,
          refresh_token: 'fake',
          token_type: 'bearer',
          expires_in: 3600,
          user,
        },
      }),
    )
    await page.route('**/auth/v1/user*', (route) => route.fulfill({ headers: cors, json: user }))
    await page.route('**/rest/v1/profiles*', (route) => {
      if (route.request().method() !== 'PATCH') return route.fulfill({ headers: cors, json: profile })
      Object.assign(profile, route.request().postDataJSON())
      return route.fulfill({ headers: cors, json: [{ id: user.id }] })
    })
    await page.goto('/auth?redirect=/routes')

    // actions
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill('password')
    await page.getByLabel('Password').press('Enter')

    // assert: the profile form opens with their Google name, and can't be skipped
    await expect(page).toHaveURL(/\/welcome/)
    await expect(page.getByLabel('Name')).toHaveValue('Google Hiker')
    await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0)

    // actions
    await page.getByLabel('Age').fill('25')
    await page.getByLabel('Gender').selectOption({ index: 1 })
    await page.getByLabel('Country').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Save and continue' }).click()

    // assert: it goes on to where they were headed
    await expect(page).toHaveURL(/\/routes$/)
    expect(profile.age).toBe(25)
  })
})

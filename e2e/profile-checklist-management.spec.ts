import { test, expect } from '@playwright/test'

test('View and manage a saved gear checklist in Profile', async ({ page }) => {
  test.setTimeout(60_000)

  // 1. Navigate to the home page
  await page.goto('/')

  // 2. Sign in
  await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click()

  await page.getByRole('textbox', { name: 'Email' }).fill(process.env.TEST_EMAIL!)

  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.TEST_PASSWORD!)

  await page.locator('form').getByRole('button', { name: 'Sign in' }).click()

  // Confirm successful login
  await expect(page.getByRole('banner').getByRole('link', { name: 'Profile' })).toBeVisible({
    timeout: 15000,
  })

  // 3. Navigate to Profile
  await page.getByRole('banner').getByRole('link', { name: 'Profile' }).click()

  await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible()

  // 4. Open Checklists tab
  await page.getByRole('tab', { name: 'Checklists' }).click()

  const checklistRegion = page.getByRole('region', {
    name: 'My saved gear checklists',
  })

  await expect(checklistRegion).toBeVisible()

  // 5. Expand the Ao Ech checklist
  const aoEchChecklist = checklistRegion.getByRole('button', {
    name: /Ao Ech \(Frog Lake\) Trail/i,
  })

  await expect(aoEchChecklist).toBeVisible()
  await aoEchChecklist.click()

  // 6. Uncheck and recheck an item
  const rainJacket = checklistRegion.getByRole('checkbox', {
    name: 'Mark Lightweight rain jacket',
  })

  await expect(rainJacket).toBeVisible()

  await rainJacket.uncheck()
  await expect(rainJacket).not.toBeChecked()

  await rainJacket.check()
  await expect(rainJacket).toBeChecked()

  // 7. Verify packing completion
  await expect(
    checklistRegion.getByRole('status').filter({
      hasText: 'Packing complete!',
    }),
  ).toBeVisible()

  await expect(checklistRegion.getByText('100%', { exact: true })).toBeVisible()

  // 8. Refresh and verify the saved checklist persists
  await page.reload()

  await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible()

  await page.getByRole('tab', { name: 'Checklists' }).click()

  const refreshedChecklistRegion = page.getByRole('region', {
    name: 'My saved gear checklists',
  })

  await expect(
    refreshedChecklistRegion.getByRole('button', {
      name: /Ao Ech \(Frog Lake\) Trail/i,
    }),
  ).toBeVisible()
})

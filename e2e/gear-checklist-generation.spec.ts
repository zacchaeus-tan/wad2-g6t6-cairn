import { test, expect } from '@playwright/test'

test('Generate, complete and save a gear checklist', async ({ page }) => {
  // 1. Navigate to Ao Ech route
  await page.goto('/')

  await page.getByRole('banner').getByRole('link', { name: 'Browse routes' }).click()

  await page.getByRole('link', { name: /Vietnam Easy Ao Ech/ }).click()

  await expect(page.getByRole('heading', { name: 'Ao Ech (Frog Lake) Trail' })).toBeVisible()

  // 2. Sign in
  await page.locator('#gear').getByRole('link', { name: 'Sign in' }).click()

  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible()

  await page.getByRole('textbox', { name: 'Email' }).fill(process.env.TEST_EMAIL!)

  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.TEST_PASSWORD!)

  await page.locator('form').getByRole('button', { name: 'Sign in' }).click()

  // Confirm login succeeded
  await expect(page.getByRole('banner').getByRole('link', { name: 'Profile' })).toBeVisible({
    timeout: 15000,
  })

  // 3. Return to Ao Ech route if login redirected elsewhere
  if (!page.url().includes('/routes/')) {
    await page.goto('/routes/542714ca-dca1-4994-b6a5-12f34d5a1fac')
  }

  await expect(page.getByRole('heading', { name: 'Ao Ech (Frog Lake) Trail' })).toBeVisible()

  // 4. Generate checklist
  const gearRegion = page.getByRole('region', { name: 'Gear checklist' })

  const generateButton = gearRegion.getByRole('button', {
    name: 'Generate checklist',
  })

  if (await generateButton.isVisible().catch(() => false)) {
    await generateButton.click()
  }

  // 5. Wait for generated items
  const checkboxes = gearRegion.getByRole('checkbox')

  await expect(checkboxes.first()).toBeVisible({
    timeout: 30000,
  })

  const itemCount = await checkboxes.count()

  console.log('Generated checklist items:', itemCount)

  expect(itemCount).toBeGreaterThan(0)

  // 6. Check every item
  for (let i = 0; i < itemCount; i++) {
    await checkboxes.nth(i).check()
  }

  // 7. Verify packing completion
  await expect(
    gearRegion.getByRole('status').filter({
      hasText: 'Packing complete!',
    }),
  ).toBeVisible()

  await expect(gearRegion.getByText('100%', { exact: true })).toBeVisible()

  // 8. Save checklist
  const saveButton = gearRegion.getByRole('button', {
    name: 'Save checklist',
  })

  await expect(saveButton).toBeVisible()
  await saveButton.click()

  await expect(gearRegion.getByRole('button', { name: 'Saved' })).toBeVisible({ timeout: 15000 })

  // 9. Navigate to Profile
  await page.getByRole('banner').getByRole('link', { name: 'Profile' }).click()

  await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible()

  // 10. Open Checklists tab
  await page.getByRole('tab', { name: 'Checklists' }).click()

  const checklistRegion = page.getByRole('region', {
    name: 'My saved gear checklists',
  })

  await expect(checklistRegion).toBeVisible()

  await expect(
    checklistRegion.getByRole('button', {
      name: /Ao Ech \(Frog Lake\) Trail/i,
    }),
  ).toBeVisible({ timeout: 15000 })

  // Print the actual saved checklist contents
  console.log('Saved checklists:', await checklistRegion.innerText())

  // Check whether Ao Ech exists
  const aoEchChecklist = checklistRegion.getByRole('button', {
    name: /Ao Ech/i,
  })

  console.log('Ao Ech checklist count:', await aoEchChecklist.count())

  await expect(aoEchChecklist).toBeVisible({
    timeout: 15000,
  })

  // 11. Refresh and verify persistence
  await page.reload()

  await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible()

  await page.getByRole('tab', { name: 'Checklists' }).click()

  await expect(
    page
      .getByRole('region', { name: 'My saved gear checklists' })
      .getByRole('button', { name: /Ao Ech/i }),
  ).toBeVisible({ timeout: 15000 })
})

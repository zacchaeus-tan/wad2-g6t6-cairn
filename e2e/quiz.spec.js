/* quiz.spec.js
 E2E tests for the /quiz page.
 Journey: a visitor (signed in) takes the hiking quiz:
   1. Answers 5 questions, and can go back without losing an answer
   2. Saves the answers, is told they are saved, and is taken to their profile
   3. Retakes the quiz, which starts from the previous answers, and saves a new one
   4. Is told if saving fails
 Saving writes to the user's profile, so Supabase is mocked: the tests sign in through the
 real form with a fake user, and no real account or data is touched.
 Expected values come from quizQuestions, not hard-coded text,
 so the tests still pass when questions are added or edited.
*/

import { Buffer } from 'node:buffer'
import { test, expect } from '@playwright/test'
import { quizQuestions, splitOption } from '../src/lib/quizQuestions.js'

const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'hiker@example.com', aud: 'authenticated' }

// The app talks to Supabase on another origin, so mocked responses need this to be readable
const CORS = { 'access-control-allow-origin': '*' }

// Shaped like a real token, in case the Supabase client decodes it
const encode = (part) => Buffer.from(JSON.stringify(part)).toString('base64url')
const FAKE_TOKEN = `${encode({ alg: 'none' })}.${encode({ sub: USER.id })}.signature`

// Stands in for Supabase. Returns the profile row, which saving the quiz updates.
async function mockSupabase(page) {
  const profile = { id: USER.id, display_name: 'Test Hiker', is_admin: false, quiz_completed_at: null }

  await page.route('**/auth/v1/token*', (route) =>
    route.fulfill({
      headers: CORS,
      json: { access_token: FAKE_TOKEN, refresh_token: 'fake', token_type: 'bearer', expires_in: 3600, user: USER },
    }),
  )
  await page.route('**/auth/v1/user*', (route) => route.fulfill({ headers: CORS, json: USER }))
  await page.route('**/rest/v1/profiles*', (route) => {
    if (route.request().method() !== 'PATCH') return route.fulfill({ headers: CORS, json: profile })
    Object.assign(profile, route.request().postDataJSON())
    return route.fulfill({ status: 204, headers: CORS })
  })
  // The profile page loads these too; the fake user has none
  await page.route('**/rest/v1/user_routes*', (route) => route.fulfill({ headers: CORS, json: [] }))
  await page.route('**/rest/v1/checklists*', (route) => route.fulfill({ headers: CORS, json: [] }))

  return profile
}

// Opens /quiz, gets sent to sign in, and comes back. Returns the mocked profile row.
async function signInToQuiz(page) {
  const profile = await mockSupabase(page)
  await page.goto('/quiz')
  await page.getByLabel('Email').fill(USER.email)
  await page.getByLabel('Password').fill('password')
  await page.getByLabel('Password').press('Enter')
  await expect(page).toHaveURL(/\/quiz$/)
  return profile
}

const questionHeading = (page, question) => page.getByRole('heading', { name: question.label })
const summitHeading = (page) => page.getByRole('heading', { name: 'You made it to the top.' })
const quizSection = (page) => page.getByRole('region', { name: 'Quiz questions' })
const summaryRow = (page, question) => quizSection(page).getByRole('listitem').filter({ hasText: question.short })
const optionRadio = (page, option) => page.getByRole('radio', { name: splitOption(option.desc).title })
const backButton = (page) => page.getByRole('button', { name: 'Back down' })
const saveAnswers = (page) => page.getByRole('button', { name: 'Save answers' }).click()

// Back down and Next stop only show below 992px; wider screens move between questions with
// the stops on the mountain. 375px wide is the iPhone 6, the smallest screen we design for.
const PHONE = { viewport: { width: 375, height: 667 } }

// The app waits 2 seconds after saving before it redirects, and the profile page then has to
// load, which can take longer than the usual 5 seconds when several browsers are running
const AFTER_SAVE = { timeout: 15000 }

// The second option of each question, so answers don't depend on what's listed first
const defaultAnswer = (question) => question.options[1]

// Waits for the question first: the old one stays on screen while it fades out.
// Picking an answer moves on to the next question by itself.
async function answer(page, question, option = defaultAnswer(question)) {
  await expect(questionHeading(page, question)).toBeVisible()
  await page.getByRole('radiogroup').getByText(splitOption(option.desc).title, { exact: true }).click()
}

async function answerAll(page, pick = defaultAnswer) {
  for (const question of quizQuestions) await answer(page, question, pick(question))
  await expect(summitHeading(page)).toBeVisible()
}

// Answers the first question, then goes back to it from the second
async function answerFirstAndGoBack(page) {
  const [first, second] = quizQuestions
  await answer(page, first)
  await expect(questionHeading(page, second)).toBeVisible()
  await backButton(page).click()
  await expect(questionHeading(page, first)).toBeVisible()
}

// Moves on from an answered question with the button rather than by picking an answer
async function nextFrom(page, question) {
  await expect(questionHeading(page, question)).toBeVisible()
  await page.getByRole('button', { name: /Next stop|To the summit/ }).click()
}

// Finishes a first attempt with the default answers, then opens the quiz again from the profile
async function saveAndRetake(page) {
  await answerAll(page)
  await saveAnswers(page)
  await expect(page).toHaveURL(/\/profile$/, AFTER_SAVE)
  await page.getByRole('link', { name: 'Retake quiz' }).click()
  await expect(page).toHaveURL(/\/quiz$/)
}

async function expectSummary(page, pick = defaultAnswer) {
  await expect(quizSection(page).getByRole('listitem')).toHaveCount(quizQuestions.length)
  for (const question of quizQuestions) {
    await expect(summaryRow(page, question)).toContainText(pick(question).desc)
  }
}

async function expectSaved(page, profile, pick = defaultAnswer) {
  await expect(quizSection(page).getByRole('status')).toHaveText('Saved. Taking you to your profile.')
  for (const question of quizQuestions) {
    expect(profile[question.column]).toBe(pick(question).val)
  }
}

test.describe('Taking the quiz', () => {
  // Verify that /quiz is only for signed in users, and that signing in returns to it.
  test('should send a signed out visitor to sign in first', async ({ page }) => {
    // actions
    await page.goto('/quiz')

    // assert
    await expect(page).toHaveURL(/\/auth\?redirect=/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in')
  })

  test.describe('moving with the buttons on a phone', () => {
    test.use(PHONE)

    // Verify that going back returns to the last question with its answer still picked.
    test('should go back to the previous question and keep its answer', async ({ page }) => {
      // setup
      await signInToQuiz(page)

      // assert: there's nothing before the first question
      await expect(backButton(page)).toBeDisabled()

      // actions
      await answerFirstAndGoBack(page)

      // assert
      await expect(optionRadio(page, defaultAnswer(quizQuestions[0]))).toBeChecked()
    })
  })

  // Verify the end of the journey: saving confirms, then opens a profile showing the answers.
  test('should save the answers and redirect to the profile page', async ({ page }) => {
    // setup
    const profile = await signInToQuiz(page)
    await answerAll(page)

    // actions
    await saveAnswers(page)

    // assert: the notification comes first, then the app waits a moment before redirecting
    await expectSaved(page, profile)

    await expect(page).toHaveURL(/\/profile$/, AFTER_SAVE)
    const experience = page.getByRole('region', { name: 'Your experience' })
    await expect(experience.getByRole('link', { name: 'Retake quiz' })).toBeVisible()
    // The first question is shown as a badge on the summary card rather than in this section
    for (const question of quizQuestions.slice(1)) {
      await expect(experience.getByText(defaultAnswer(question).desc)).toBeVisible()
    }
  })

  test.describe('retaking it on a phone', () => {
    test.use(PHONE)

    // Verify that a second attempt can replace an answer and leaves the others as they were.
    test('should save a new answer when the quiz is retaken', async ({ page }) => {
      // Two full attempts and two redirects take longer than a normal test
      test.slow()

      // setup
      const profile = await signInToQuiz(page)
      const [first, ...rest] = quizQuestions
      const pick = (question) => (question === first ? first.options[0] : defaultAnswer(question))
      await saveAndRetake(page)

      // actions
      await answer(page, first, pick(first))
      for (const question of rest) await nextFrom(page, question)
      await expectSummary(page, pick)
      await saveAnswers(page)

      // assert
      await expectSaved(page, profile, pick)
      await expect(page).toHaveURL(/\/profile$/, AFTER_SAVE)
    })
  })

  // Verify that a failed save shows an error and leaves the user on the quiz.
  test('should show an error and stay on the quiz when saving fails', async ({ page }) => {
    // setup: only the save fails, so loading the profile still works
    await signInToQuiz(page)
    await page.route('**/rest/v1/profiles*', (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback()
      return route.fulfill({ status: 500, headers: CORS, json: { message: 'Service unavailable' } })
    })
    await answerAll(page)

    // actions
    await saveAnswers(page)

    // assert
    await expect(quizSection(page).getByRole('alert')).toHaveText('Service unavailable')
    await expect(quizSection(page).getByRole('status')).toHaveCount(0)
    await expect(page).toHaveURL(/\/quiz$/)
  })
})

# CAIRN

CAIRN is a trek planner for hikers in Southeast Asia. A short quiz about the hikes you've done lets every route show whether it suits you and where it will stretch you. Route grades shift with real hiker reviews, and AI helps you plan the days and pack the right gear.

- **Live site:** https://cairn-trails.vercel.app/
- **Repository:** https://github.com/zacchaeus-tan/wad2-g6t6-cairn

## Features

- **Browse and search routes** with filters for country, difficulty, trip length, distance and climb, or explore them on a 3D globe.
- **Route pages** with the route's line, its numbers, a 7-day forecast for the trailhead and summit, and any safety notices.
- **Suitability check**: fixed rules compare a route with your quiz answers and completed hikes (`src/lib/matching.js`).
- **Community grade**: reviews move a route's difficulty away from its official grade, and incident reports raise its hazard level (`supabase/functions/_shared/route-stats.js`).
- **AI planning**: a day-by-day itinerary and a gear checklist, written by OpenAI from the route, the forecast and your trip.
- **Profile**: saved and completed routes, saved checklists, your reviews and a profile picture.
- **Admin page**: turn hiker reports into alerts, set a route's safety status, fill in missing route details and moderate reviews.

## Built with

- [Vue 3](https://vuejs.org/), [Vue Router](https://router.vuejs.org/), [Pinia](https://pinia.vuejs.org/) and [Vite](https://vite.dev/)
- [Bootstrap 5](https://getbootstrap.com/) for the grid and utility classes
- [Motion for Vue](https://motion.dev/) (`motion-v`) for animation
- [MapLibre GL JS](https://maplibre.org/) for the globe, with map tiles from [MapTiler](https://www.maptiler.com/) (or [CARTO](https://carto.com/basemaps) and Esri World Imagery when no MapTiler key is set) and NASA GIBS Blue Marble imagery
- [Supabase](https://supabase.com/) for the database, sign-in, storage and Edge Functions
- [Open-Meteo](https://open-meteo.com/) for weather forecasts
- [OpenAI](https://openai.com/) (`gpt-4.1-mini`) for itineraries and gear checklists
- Trail data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL)

## Project structure

| Folder               | What's in it                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/views`          | One component per page                                                                                 |
| `src/components`     | Components, grouped by the page or feature they belong to                                              |
| `src/controller`     | Pinia stores and controllers: checks input and turns Supabase replies into state or errors             |
| `src/model`          | Calls to Supabase and Open-Meteo, returned unchanged                                                   |
| `src/lib`            | Plain logic with no Vue or database (suitability rules, formatting, globe helpers), and its unit tests |
| `supabase/functions` | Edge Functions: `generate-itinerary`, `generate-checklist`, `recalc-route-stats` and `upload-avatar`   |
| `e2e`                | Playwright end-to-end tests                                                                            |

The database schema lives in the Supabase project. SQL changes are run there directly, so this repo has no migration files.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Set up and run the app

The app runs against our hosted Supabase project, which holds the database, sign-in, storage and the Edge Functions (including the OpenAI key). You don't need a Supabase account or the Supabase CLI to run it.

1. Install [Node.js](https://nodejs.org/) 22.18 or later (or 24.12 or later), then install [pnpm](https://pnpm.io/):

   ```sh
   npm install -g pnpm
   ```

2. Unzip the submitted files (or clone the repository), open a terminal in the project folder, and install the dependencies:

   ```sh
   pnpm install
   ```

3. Create the `.env` file by copying `.env.example`. It already has the values the app needs:

   ```sh
   cp .env.example .env
   ```

   On Windows Command Prompt, use `copy .env.example .env`.

4. Start the development server:

   ```sh
   pnpm dev
   ```

5. Open the address it prints, usually http://localhost:5173. Browsing routes and the globe works without signing in; everything else needs one of the [accounts below](#accounts-for-testing).

To build and preview the production version instead:

```sh
pnpm build
pnpm preview
```

### What's in `.env`

| Variable                        | What it is                                                                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`             | The Supabase project's URL                                                                                                                                                                                                                                         |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The Supabase project's publishable key                                                                                                                                                                                                                             |
| `VITE_MAPTILER_KEY`             | MapTiler key for the globe's map and satellite tiles. Without one, the globe falls back to CARTO and Esri. It also switches to them by itself if MapTiler refuses the key (e.g. the free plan's monthly limit is used up), and stays on them until the month ends. |

These keys are meant to be public: the browser needs them, so they're also in the live site's JavaScript. What a visitor can do with them is limited by Supabase's Row Level Security. The OpenAI key is never in the browser. It's a Supabase secret that only the Edge Functions can read, set with `supabase secrets set OPENAI_API_KEY=...`.

## Accounts for testing

Use these to try the parts of the app that need signing in, on the live site or a local copy.

| Account | Email                    | Password                  | What it can do                                                                                                     |
| ------- | ------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Hiker   | `test-user@example.com`  | `Trek-730ecfab91a0-User`  | Take the quiz, save and complete routes, generate itineraries and gear checklists, write reviews, edit the profile |
| Admin   | `test-admin@example.com` | `Trek-2501340e8540-Admin` | Everything a hiker can, plus the Admin page (alerts, route status, route info and review moderation)               |

You can also register your own account on the sign-in page, or sign in with Google.

## Testing strategy

### Why most of our tests are end-to-end

CAIRN's value is in journeys that cross pages and services: a hiker finds a route, checks its weather and reviews, signs in, and plans or reports on it. Most of the bugs we hit while building were in the joins between parts, not inside one function: router guards sending people to the wrong page, Supabase rows not coming back, transitions opening the wrong route, the weather API being slow. A unit test can't catch those, so we test mainly with Playwright end-to-end (E2E) tests that drive the real app in a real browser, the way a user would.

We keep a few Vitest unit tests for pure logic that is hard to reach through the UI (checking and grouping globe routes, drafting alerts from hazard reports, profile helpers).

We don't try to test everything. We chose the journeys below by asking two questions: how bad is it for a hiker if this breaks, and how likely is it to break?

### How we decide which tests to keep

A test earns its place if it does at least one of these:

1. **Covers a journey step**: something a hiker or admin must be able to do, such as finding a route, saving the quiz or publishing an alert.
2. **Protects a rule**: something that keeps hikers safe or data correct, such as sign-in guards, a closure needing a note, or confirming before a review is removed.
3. **Catches a real failure**: an error a user could actually hit, such as the database being down, a wrong password or a failed save.

We cut tests that repeated the steps of another test, or that only checked a nicety (for example keyboard shortcuts between admin tabs). That took the suite from 45 E2E tests to 30. The same rules showed that planning and reviewing a route had no tests at all, so we added 3 for those, and later 1 for the terms of service page, making 34. Last, we added 2 that check the globe still works when MapTiler refuses our key (for example once the free plan's monthly limit is used up), making 36.

### Focus areas

| Focus area                                                           | Why it matters                                                                                                                                                   | Spec                                            |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Find a route** (search, filter, sort, page, globe)                 | The first thing every visitor does. Filters, sorting and paging share state, so they break each other easily.                                                    | `routes-browse.spec.js`, `globe.spec.js`        |
| **Decide on a route** (details, live weather, reviews)               | The page hikers use to judge if a route is safe. It depends on an outside weather API and on other hikers' reviews.                                              | `route-detail.spec.js`                          |
| **Sign in and access** (sign in, Google, guards)                     | Everything personal sits behind sign-in. A broken guard either locks hikers out or shows pages they shouldn't see.                                               | `auth.spec.js`, `quiz.spec.js`, `admin.spec.js` |
| **Personalise** (experience quiz to profile)                         | Saves the hiker's answers, which shape what we suggest to them.                                                                                                  | `quiz.spec.js`                                  |
| **Plan and report** (save a route, review it and flag a hazard)      | What a signed-in hiker does with a route. A flagged hazard is what the admin page turns into an alert, so a broken review form means admins never hear about it. | `route-signed-in.spec.js`                       |
| **Keep hikers safe** (admin alerts, route status, review moderation) | The highest-stakes feature: a wrong closure or a missing alert can send someone onto a dangerous trail.                                                          | `admin.spec.js`                                 |
| **Legal pages**                                                      | Google sign-in needs the privacy policy to open without signing in.                                                                                              | `legal.spec.js`                                 |

### What we test in each journey

- **The happy path**, start to finish, checking what the user sees and what was saved.
- **Error states**: the database down, a wrong password, a failed save, a route that doesn't exist.
- **Rules the app enforces**: signed-out visitors sent to sign in, non-admins sent home, a hazard needs a description, an alert needs a route, closing a route needs a note.

### How the tests stay stable and repeatable

- **Selectors a user would recognise.** We find elements by role, label or visible text first (`getByRole`, `getByLabel`), which also checks the page is accessible. Where an element has no name, such as a route tile or a pill on the globe, we added a `data-testid`. We avoid CSS classes and element order, which change whenever the design does.
- **No hard-coded data.** Tests read what they expect from the page or from the app's own source (for example the quiz questions in `src/lib/quizQuestions.js`), so they keep passing when routes or questions change.
- **Two kinds of data.** Journeys that only read data run against the real Supabase project, so they prove the real database works. Journeys that write data (quiz, admin, Google sign-up, saving and reviewing a route) answer Supabase's requests with Playwright's `page.route`, so no real account or row is touched, every run starts from the same state, and we can make a request fail on purpose to test error messages. The signed-in route tests mix the two: what the hiker saves is mocked, while public data such as the route itself still comes from the real database. The MapTiler fallback tests answer every MapTiler request with a refusal, so they use none of our monthly map limit.
- **A clean server every run.** Playwright starts its own dev server on port 5199 and never reuses one that is already running.
- **Three browsers.** Every test runs on Chromium, Firefox and WebKit (Safari's engine).
- **Phone width where the UI changes.** The quiz's Back down and Next stop buttons only appear below 992px, so the tests that use them run at 375px wide (iPhone 6).
- **Clear structure.** One spec file per journey, with the journey described at the top. Each test is named "should …", says what it verifies in a comment, and is split into setup, actions and assert, as in the course's Playwright example. Shared steps such as signing in are helper functions.

### What we don't test automatically, and why

- **What the globe draws.** It is a WebGL canvas that Playwright can't see into, so we test the HTML drawn over it (pills, cards, the position readout) instead.
- **Real Google sign-in.** It runs on Google's site, so we stop at the redirect and check where it would send the user back to.
- **Animations and most of the styling.** We checked these by hand in Chrome DevTools, from iPhone 6 (375px) up to desktop widths.
- **What the AI writes.** Itineraries and gear checklists come from an AI model, so the text changes every time. A test can only check that one appears, not that it is right. A gear checklist only has items once the AI has written one, so we left it out of the E2E tests.

### How we made the tests

We used two methods, depending on what a test needs:

- **Recorded in VS Code (8 tests).** Tests that only read real data and make simple checks were recorded by Zacchaeus with the Playwright VS Code extension's recorder, then tidied into setup → actions → assert: renamed, made to use relative URLs, extra recorded steps removed, and the last step turned into an assertion. These are the tests that were recorded:
  - `legal.spec.js`: should open the terms of service from the footer (new)
  - `legal.spec.js`: should open the privacy policy from the footer, at the top
  - `quiz.spec.js`: should send a signed out visitor to sign in first
  - `route-detail.spec.js`: should show the route's name, numbers and weather forecast
  - `route-detail.spec.js`: should show a route's reviews and a sign-in prompt when signed out
  - `route-detail.spec.js`: should show a message and a link back when the route doesn't exist
  - `routes-browse.spec.js`: should show a message when nothing matches, and recover on clear
  - `routes-browse.spec.js`: should show the transition screen before the route page opens
- **Generated with AI (28 tests).** Tests that need mocked Supabase data, or checks worked out from the page (sorting, counting, reading route names), can't be recorded, so these were generated with AI and reviewed by the team. This is every other test in `e2e/`.

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
# Run the unit tests and re-run them when files change
pnpm test:unit
# Run the unit tests once
pnpm vitest run
# Run the tests in one file
pnpm vitest run src/lib/__tests__/globeRoutes.spec.js
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

The tests in `e2e/` drive the real app in a browser, against the Supabase project in your `.env`. They run on Chromium, Firefox and WebKit by default, with no browser windows showing.

Before the first run:

1. Run `pnpm install`.
2. Copy `.env.example` to `.env` (see [Set up and run the app](#set-up-and-run-the-app)).
3. Install the browsers:

```sh
pnpm exec playwright install
```

You don't need to start the app yourself. Playwright starts its own dev server on port 5199 and stops it afterwards, so make sure nothing else is using that port.

```sh
# Run all the end-to-end tests
pnpm playwright test
# Run the tests only on Chromium
pnpm playwright test --project=chromium
# Run the tests in one file
pnpm playwright test e2e/routes-browse.spec.js
# Run the tests with browser windows showing
pnpm playwright test --headed
# Run the tests in debug mode
pnpm playwright test --debug
# Open the HTML report from the last run
pnpm exec playwright show-report
```

Running one browser or one file, `--headed` and `--debug` are extra commands from the [Playwright docs](https://playwright.dev/docs/running-tests).

You can also run them from the Testing panel in VS Code with the [Playwright Test for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) extension.

| Spec                              | User journey                                                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/routes-browse.spec.js` (8)   | Search, filter, sort and page through routes, open a route, and see an error if the database is unavailable                                         |
| `e2e/globe.spec.js` (2)           | Fly to a country on the globe and back, and open a route from its pill                                                                              |
| `e2e/route-detail.spec.js` (3)    | Read a route's details, weather and reviews, get prompted to sign in to write one, and find a way back from a missing route                         |
| `e2e/auth.spec.js` (3)            | See an error for a wrong password, get sent to Google and back, and finish a new Google user's profile                                              |
| `e2e/quiz.spec.js` (5)            | Get sent to sign in, go back without losing an answer, save to the profile, retake it with a new answer, and see an error if saving fails           |
| `e2e/admin.spec.js` (8)           | Keep non-admins out, check what needs attention, turn a hazard report into an alert, take an alert down, close a route, and remove a review         |
| `e2e/route-signed-in.spec.js` (3) | Sign in from a route, save it and find it on the profile, post a review that flags a hazard, and be stopped from flagging one without a description |
| `e2e/legal.spec.js` (2)           | Open the privacy policy and the terms of service from the footer without signing in                                                                 |

### Lint with [ESLint](https://eslint.org/) and [Oxlint](https://oxc.rs/docs/guide/usage/linter)

```sh
# Run both linters and fix what they can
pnpm lint
# Format the code in src/ with Prettier
pnpm format
```

## Use of AI

- **End-to-end tests**: 26 of the 34 Playwright tests were generated with AI and reviewed by the team (see [How we made the tests](#how-we-made-the-tests)).
- **Code tidy-up**: AI was used to check the code comments for accuracy and to remove unused code.
- **MapLibre GL JS**: AI was used to research and assist in understanding the code for the globe and its features.
- **Open AI API key**: AI was used to write the prompt for the itinerary and checklist.
- **Supabase Edge Functions**: AI was used to learn more on how to use Supabase as a backend.
- **Understand errors and aid in fixing bugs**: AI was used to help us debug code where necessary.

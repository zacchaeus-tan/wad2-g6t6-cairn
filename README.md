# CAIRN

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Compile and Minify for Production

```sh
pnpm build
```

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

The tests in `e2e/` drive the real app in a browser, against the Supabase project in your `.env`. They run on Chromium, Firefox and WebKit by default, and browser windows open while they run.

Before the first run:

1. Run `pnpm install`.
2. Copy `.env.example` to `.env` and fill in the values.
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
# Run the tests in debug mode
pnpm playwright test --debug
# Open the HTML report from the last run
pnpm exec playwright show-report
```

You can also run them from the Testing panel in VS Code with the [Playwright Test for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) extension.

| Spec | User journey |
| --- | --- |
| `e2e/routes-browse.spec.js` | Search, filter, sort and page through routes, open a route, and see an error if the database is unavailable |
| `e2e/auth.spec.js` | See the sign-in form, switch to registering, and see an error for a wrong password |
| `e2e/quiz.spec.js` | Sign in, answer the quiz, go back, review the summary, save to the profile, retake it, and see an error if saving fails |

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```

# Contributing to autobones

Thanks for helping. Bug reports, small fixes and ideas are all welcome.

## Set up

You need Node 20 or newer.

```bash
git clone https://github.com/Drinor101/autobones.git
cd autobones
npm install
npm run build        # dist/ (ESM + CJS + types) and style.css
npm run typecheck
```

## Try your change

The React example in `examples/react` uses the library straight from this folder:

```bash
npm run build                       # rebuild the library after changing src/
cd examples/react
npm install
npm run dev                         # http://localhost:5173
```

There is also a framework-free page in `demo/` (`npm run demo`, then open `/demo/`).

The landing page in `site/` works the same way (`cd site && npm install && npm run dev`). It is deployed to Netlify from `netlify.toml`.

## Where things are

| File | What it does |
| --- | --- |
| `src/core.ts` | The measuring engine, layout memory and `createSkeleton()` |
| `src/react.tsx`, `vue.ts`, `svelte.ts`, `element.ts` | One thin adapter per framework |
| `scripts/` | Build helpers (`style.css`, the `"use client"` directive) |
| `examples/react` | A small React app that copies well |
| `site/` | The landing page (Vite + React), deployed to Netlify |

## Ground rules

- **No runtime dependencies.** Frameworks stay optional peer dependencies.
- **Keep the core small.** Check the size after a change: `gzip -9c dist/chunk-*.js | wc -c`. It is about 5 KB today, so say why if a change adds more than a few hundred bytes.
- **A new option goes everywhere.** Add it to `SkeletonOptions`, then wire it into every adapter: React props and the options list, Vue props and `optionKeys`, and the `<auto-skeleton>` attributes.
- **Never store user text** in saved layouts. Only geometry and colors.
- **Wrap `localStorage`** in try/catch.

## Tests

The tests run the real built library (`dist/`) in real browsers: Chromium, Firefox and WebKit (Safari's engine), using [Playwright](https://playwright.dev).

```bash
npm run test:install   # once: downloads the three browsers
npm test               # builds, then runs everything
npm run test:e2e       # runs everything without rebuilding
npx playwright test core.spec.ts --project=chromium   # one file, one browser
```

What is covered, in `tests/e2e/`:

| File | What it checks |
| --- | --- |
| `core.spec.ts` | Measuring and drawing: text, media, boxes, surfaces, rounded corners, dark mode, reduced motion, resizing |
| `states.spec.ts` | `delay`, `minDuration`, restarting while loading, `fade` |
| `memory.spec.ts` | Layout memory, reload, shipped layouts at several widths, export and import |
| `themes.spec.ts` | A layout recorded in a light page and shown in a dark one, and the other way round |
| `react.spec.ts` | The React `<Skeleton>`, `useSkeleton`, refs, StrictMode, unmounting |
| `vue-svelte.spec.ts` | The Vue component and directive, and the Svelte action |
| `package.spec.ts` | The built package in plain Node: every entry as ESM and CJS, server rendering, `style.css` |

Things worth knowing when you add a test:

- **Fixtures** are small HTML pages in `tests/fixtures/` that load `dist/`. `tests/serve.mjs` serves them and bundles the React one (React is CommonJS, so a browser cannot load it directly).
- **Timing tests run inside the page.** Waiting from outside the browser lets a slow machine eat the margins and makes tests flaky, so `states.spec.ts` does each whole sequence in one `page.evaluate`.
- **Check that a new test can fail.** Break the code on purpose, confirm the test goes red, then restore it.
- If Firefox crashes with a graphics error on your machine, lower `workers` in `playwright.config.ts`.

## Before you open a pull request

```bash
npm run typecheck
npm test
npx publint
```

CI runs the same checks, plus a type-resolution check of every entry point and builds of the React example and the landing page.

In the pull request, say what changed and why, and what you checked by hand (browser, framework, light and dark). If it fixes a bug, a small reproduction in the description helps a lot.

## Reporting a bug

Use the bug report form. The most useful reports have a small reproduction (a CodeSandbox, StackBlitz or a snippet of your component) and say which framework and browser you use.

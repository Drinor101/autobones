# autobones: project context

Framework-agnostic **auto-layout skeleton loader** library. Instead of hand-made skeleton components, it measures the real rendered UI and draws matching skeleton "bones" over it. The ship plan is in `PLAN.md`; work through it in order and tick boxes as tasks are done.

## How it works
1. The app renders its real component while loading (with placeholder data), or nothing at all.
2. `measureBones()` in `src/core.ts` walks the DOM and measures:
   - **text**: one bone per rendered line (via `Range.getClientRects()`), sized to the font; same-line runs are merged
   - **media**: `img, svg, video, canvas, input, button, …` and `[data-bone]` become one solid bone
   - **box**: empty leaf elements with a visible background or border (e.g. avatar divs)
   - **surface**: containers with background, border or shadow keep their chrome, drawn under their bones
   - **clipping**: containers with `overflow` other than visible and rounded corners (`clipOf`) round the corner radius of media/box bones that touch their padding-box corners (`clipRadius`), e.g. a cover image in a rounded card or an `<img>` in a circular frame. It only rewrites plain `px` radii and leaves everything else alone.
3. Content is hidden (`visibility: hidden` on children, `color: transparent` on root), `aria-busy` and `inert` are set, and bones are drawn on an absolutely positioned overlay.
4. Observers (`ResizeObserver`, `MutationObserver`, `document.fonts.ready`) re-measure while loading. `takeRecords()` after each render prevents feedback loops.

## Layout memory (`name` option)
- After loading ends, the real layout is captured (immediately and again after 1 s) and saved per name: in memory, in `localStorage` (`autobones:<name>`), and in a per-session `recorded` list keyed by width.
- While idle, an extra `ResizeObserver` re-captures when the container width changes, so resizing in dev records several widths.
- When loading with nothing to measure, the lookup order is: live content → user's own layout → shipped layout at the closest width → nothing. A remembered layout is scaled horizontally to the current width and its height is reserved with `min-height`.
- The three layout maps live on `globalThis[Symbol.for("autobones.layouts.v1")]`, not in module scope. The CJS build bundles one copy of core per entry, and apps can load both ESM and CJS, so module-level maps would give each copy its own state. Don't move them back.
- `registerLayouts(file)` loads shipped layouts (`{ version: 1, layouts: { [name]: LayoutSnapshot[] } }`).
- `exportLayouts()` merges shipped and recorded layouts into that file and downloads `autobones.layouts.json`. It is also on `window.autobones` for console use.
- `clearLayouts(name?)` forgets the user's own and recorded layouts, never shipped ones.

## Loading states
- `delay`: content is hidden immediately but bones appear only after the delay; if loading ends first, nothing is ever shown.
- `minDuration`: once shown, bones stay at least this long.
- `fade`: overlay cross-fades out (class `ab-fading` keeps `position: relative` meanwhile). Skipped under `prefers-reduced-motion`.

## Files
- `src/core.ts`: engine, styles (`STYLES`, injected into `<head>` once), layout memory, `createSkeleton()` controller
- `src/index.ts`: public exports
- `src/react.tsx`: `<Skeleton>` component and `useSkeleton` hook
- `src/vue.ts`: `<Skeleton>` component and `v-skeleton` directive
- `src/svelte.ts`: `use:skeleton` action (Svelte 3/4/5, no compile step needed)
- `src/element.ts`: `<auto-skeleton>` Web Component (SSR-safe base class)
- `scripts/write-css.mjs`: writes `style.css` from `STYLES` for strict-CSP users
- `demo/index.html`: demo page using `dist/`
- `tests/` and `playwright.config.ts`: the test suite. `tests/e2e/*.spec.ts` are the tests, `tests/fixtures/` are small HTML pages that load `dist/` (`probe.js` is a shared in-page helper that summarizes a skeleton's DOM), and `tests/serve.mjs` serves the repo root and bundles the React fixture with esbuild (output in `tests/.generated/`, git-ignored). Timing tests (`states.spec.ts`) run their whole sequence inside one `page.evaluate` so a slow machine cannot eat the margins. `package.spec.ts` runs in plain Node and only on the chromium project.
- `site/`: the public landing page (Vite + React 19, `cd site && npm run dev`), deployed to Netlify by `netlify.toml` (it builds the library first, then the site, and publishes `site/dist`). It uses the real library via `file:..` and dedupes React like `examples/react`. Its "Measured" hero view draws the output of the library's own `measureBones()`. `vite.config.ts` writes Netlify's `URL` into the Open Graph tags so link previews get an absolute image address. `public/og.png` (1200x630) and `public/apple-touch-icon.png` are generated images; `public/logo.svg` is the logo source (also used in the README).
- `examples/react`: Vite + React 19 app (`cd examples/react && npm run dev`) with `<Skeleton>` (placeholder data and layout-memory-only) and `useSkeleton`. It depends on `file:../..` and `vite.config.ts` dedupes React, because the linked package resolves the root's React 18 devDependency otherwise. After changing `src/`, run `npm run build` in the root first.

## Commands
- `npm run build`: tsup (ESM + CJS + .d.ts) then writes style.css
- `npm run typecheck`
- `npm test`: build, then the whole Playwright suite (Chromium, Firefox, WebKit). `npm run test:e2e` skips the build. `npm run test:install` downloads the browsers once.
- `npm run demo`: build and serve; open `/demo/`

## Status and known gaps
- Core, React adapter and Web Component were verified in Chrome (light/dark, mobile width, memory, shipped layouts, delay/minDuration/fade).
- The tsup build is verified (typecheck, publint, attw, and a clean-copy run of the CI and Netlify build commands).
- Vue (`<Skeleton>` and `v-skeleton`, boolean and options forms) and the Svelte action were smoke-tested in Chrome: show/hide, restart, live option changes, unmount/destroy cleanup. That used hand-written render functions and calling the action directly, so **single-file components and the Svelte compiler were not exercised**, and there is no `examples/vue` or `examples/svelte` yet.
- **Automated tests:** 157 Playwright tests pass in Chromium, Firefox and WebKit (14 Node-only ones run once), three full runs in a row with no flakes. They cover measuring, rounded corners, dark mode and reduced motion, `delay`/`minDuration`/`fade`, layout memory and shipped layouts, the React adapter (refs, StrictMode, live option updates), the Vue component and directive, the Svelte action, and the built package (ESM/CJS, SSR). Several were checked by deliberately breaking the library and confirming the right test fails. CI runs them on Node 22.
- **Still not covered:** Vue and Svelte single-file components and the Svelte compiler (the adapters are tested through render functions and a direct action call), React 17, real touch devices, and performance with 200+ items.
- Known issues are listed in PLAN.md section 2.3.

## Conventions
- Zero runtime dependencies; frameworks are optional peer dependencies.
- Keep the core small (currently about 5.1 KB gzipped); check size after changes (`gzip -9c dist/chunk-*.js | wc -c`).
- `scripts/use-client.mjs` prepends `"use client"` to `dist/react.js` and `dist/react.cjs` after tsup (esbuild drops module-level directives). It runs as part of `npm run build`; the React entry must keep it so Next.js App Router users can import it from Server Component files.
- `package.json` `exports` uses nested `import`/`require` conditions with their own `types` (`.d.ts` / `.d.cts`), plus `typesVersions` for node10. Verify with `npx @arethetypeswrong/cli --pack .` after changing it.
- Never store user text in saved layouts, only geometry and colors.
- All `localStorage` access is wrapped in try/catch.
- New options go in `SkeletonOptions` and must be wired into every adapter (React props and deps, Vue props and `optionKeys`, element attributes).

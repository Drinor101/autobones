<p align="center">
  <img src="https://raw.githubusercontent.com/Drinor101/autobones/main/site/public/logo.svg" width="88" height="88" alt="autobones logo" />
</p>

<h1 align="center">autobones</h1>

<p align="center"><strong>Skeleton loaders that build themselves from your real UI.</strong></p>

<p align="center">
  <a href="https://www.npmjs.com/package/autobones"><img src="https://img.shields.io/npm/v/autobones" alt="npm version" /></a>
  <a href="https://github.com/Drinor101/autobones/actions/workflows/ci.yml"><img src="https://github.com/Drinor101/autobones/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/Drinor101/autobones/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Drinor101/autobones" alt="License: MIT" /></a>
</p>

<p align="center">
  <a href="https://autobones.netlify.app">Live demo</a> ·
  <a href="#install">Install</a> ·
  <a href="https://github.com/Drinor101/autobones/issues">Issues</a>
</p>

Auto-layout skeleton loaders. Instead of hand-drawing placeholder shapes, autobones renders **your real component**, measures its text lines, images, avatars, buttons and cards, then draws matching skeleton bones on top. Change the component and the skeleton updates itself.

- Works with **React, Vue, Svelte, Web Components and plain JS**
- ~5 KB gzipped core, zero dependencies
- **No placeholder data needed** with layout memory: it remembers what your component looked like
- **Perfect skeletons on a user's very first visit** by shipping layouts captured during development
- **No flicker**: skip the skeleton on fast loads, never flash it, cross-fade to content
- Follows layout changes (resize, reflow, fonts loading) automatically
- Accessible: `aria-busy`, `inert` content, bones hidden from screen readers
- Respects `prefers-reduced-motion` and `prefers-color-scheme`
- Shimmer, pulse or static; themeable with CSS variables

## How it works

1. You render your component while loading, usually with **placeholder data** of roughly the right length.
2. autobones walks the DOM and measures:
   - **text**: one bone per rendered line, sized to the font
   - **media**: `img`, `svg`, `video`, `canvas`, `input`, `button`, … become one solid bone
   - **boxes**: empty elements with a background or border (e.g. an avatar `div`)
   - **surfaces**: cards and panels keep their own background, border and shadow
   - **clipping**: bones in the corner of a rounded `overflow: hidden` container are rounded to match, so a cover image inside a rounded card or a circular avatar looks right
3. The real content is hidden and the bones are drawn on an overlay. All bones share one shimmer, so they move in sync.

## The 10-second version

```tsx
<Skeleton loading={isLoading} name="user-card" delay={150}>
  {user && <UserCard user={user} />}
</Skeleton>
```

- First visit: shows the skeleton shaped from placeholder data if you render some, otherwise nothing.
- After real content renders once, its shape is saved under `"user-card"`.
- Every load after that (even after a page reload) shows that exact skeleton, with nothing inside to render.
- If data arrives within 150 ms, no skeleton is shown at all.

## Install

```bash
npm install autobones
```

## React

```tsx
import { Skeleton } from "autobones/react";

<Skeleton loading={isLoading}>
  <UserCard user={user ?? placeholderUser} />
</Skeleton>
```

`<Skeleton>` renders a `div` (use `as="section"` to change it), passes `className`, `style`, `id` and any other props to it, and forwards `ref` to it. Every [option](#options) is a prop, and changing one while loading takes effect right away.

To attach a skeleton to an element you render yourself, use the hook. It takes the same options:

```tsx
import { useSkeleton } from "autobones/react";

function Stats({ loading }: { loading: boolean }) {
  const ref = useSkeleton<HTMLDivElement>(loading, { animation: "pulse", delay: 150 });
  return <div ref={ref}>...</div>;
}
```

**Next.js and server rendering.** `autobones/react` is marked `"use client"`, so you can import it in App Router files as is. On the server it renders your children normally, with no warnings; the skeleton takes over once the page hydrates, so server-rendered content can be visible for a moment first.

## Vue

```vue
<script setup>
import { Skeleton, vSkeleton } from "autobones/vue";
</script>

<template>
  <Skeleton :loading="isLoading">
    <UserCard :user="user ?? placeholderUser" />
  </Skeleton>

  <!-- or as a directive -->
  <div v-skeleton="isLoading">...</div>
</template>
```

## Svelte (3, 4 and 5)

```svelte
<script>
  import { skeleton } from "autobones/svelte";
</script>

<div use:skeleton={loading}>
  <UserCard user={user ?? placeholderUser} />
</div>

<div use:skeleton={{ loading, animation: "pulse" }}>...</div>
```

## Web Component (Angular, Solid, Astro, plain HTML…)

```html
<script type="module">import "autobones/element";</script>

<auto-skeleton loading name="user-card" delay="150" animation="pulse">
  ...your markup...
</auto-skeleton>
```

Toggle with `el.loading = false` or by removing the `loading` attribute.

## Vanilla JS

```js
import { createSkeleton } from "autobones";

const s = createSkeleton(document.querySelector("#profile"), { animation: "shimmer" });
await loadData();
s.setLoading(false);
```

## Layout memory

Give a skeleton a `name` and it remembers the real layout:

```tsx
<Skeleton loading={isLoading} name="post-card">
  {post && <PostCard post={post} />}
</Skeleton>
```

- Captured when loading finishes, and again a second later once images and fonts settle.
- Saved in memory and in `localStorage` (turn off with `persist={false}`). Only shapes and colors are stored, never your text.
- If the container is a different width next time, the bones scale to fit; the height is reserved so the page doesn't jump.
- If you *do* render placeholder content while loading, that live layout always wins.
- Share one name across a list (`name="post-card"` on every item). Clear with `clearLayouts("post-card")` or `clearLayouts()`.

## Ship layouts for first visits

Layout memory needs one real render per user. To give **brand-new visitors** a perfect skeleton too, capture layouts while you develop and ship them with your app:

1. **Record.** Run your app in dev and open the pages with named skeletons. Drag the browser window through your breakpoints (e.g. desktop → tablet → phone). autobones records one snapshot per width automatically.
2. **Export.** In the browser console run:

   ```js
   autobones.exportLayouts()
   ```

   This downloads `autobones.layouts.json` (a few KB). Put it in your project and commit it. Exporting again merges new recordings into whatever is already registered, so you can build the file up page by page.
3. **Ship.** Register it once at startup, before your app renders:

   ```ts
   import layouts from "./autobones.layouts.json";
   import { registerLayouts } from "autobones"; // also exported from autobones/react, /vue, /svelte, /element

   registerLayouts(layouts);
   ```

Now every `name`d skeleton has a layout from the first visit, picked for the closest captured width.

**Which layout wins?**
1. Live content rendered while loading (e.g. placeholder data)
2. This user's own remembered layout
3. The shipped layout for the closest width
4. Nothing

A shipped layout beats the user's own only if it was captured at a clearly closer width (e.g. they rotated their phone).

Re-export after you change a component's layout. A file from an incompatible version is ignored with a console warning instead of breaking.

**Light and dark.** The bones always follow the visitor's theme. A card's own background and border are recorded in whatever theme you captured them in. If a visitor's page has the opposite tone (a light recording shown on a dark page, or the other way round), autobones draws a neutral outline in the bone color instead of the wrong colors, so a white card never appears on a dark page. It judges the tone from the page's actual backgrounds, so it works with your own theme switch, not only the operating system setting. Record in the theme most of your visitors use.

## No flicker

```tsx
<Skeleton loading={isLoading} delay={150} minDuration={400} fade={200}>
```

- `delay`: wait before showing bones. Fast responses never show a skeleton (content stays hidden during the wait).
- `minDuration`: once bones appear, keep them at least this long so they don't blink.
- `fade`: cross-fade from bones to content. Disabled automatically for reduced-motion users.

## Options

| Option            | Default     | Description                                            |
| ----------------- | ----------- | ------------------------------------------------------ |
| `animation`       | `"shimmer"` | `"shimmer"`, `"pulse"` or `"none"`                     |
| `baseColor`       | theme       | Bone color                                             |
| `highlightColor`  | theme       | Shimmer highlight color                                |
| `duration`        | `1500`      | Animation length in ms                                 |
| `textRadius`      | `4px`       | Corner radius of text bones                            |
| `textHeightRatio` | `0.8`       | Text bone height as a fraction of the font size        |
| `observe`         | `true`      | Re-measure on resize and DOM changes                   |
| `boneSelector`    | none        | Extra selectors to treat as one solid bone             |
| `injectStyles`    | `true`      | Set `false` for strict CSP and import `autobones/style.css` |
| `name`            | none        | Layout memory key                                      |
| `persist`         | `true`      | Keep remembered layouts across reloads (`localStorage`) |
| `delay`           | `0`         | ms to wait before showing bones                        |
| `minDuration`     | `0`         | Minimum ms bones stay visible once shown               |
| `fade`            | `200`       | Cross-fade duration in ms (`0` to disable)             |

### Functions

| Function                  | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| `registerLayouts(file)`   | Load a shipped `autobones.layouts.json` (object or JSON string)      |
| `exportLayouts(options?)` | Build the layouts file; downloads it in the browser (`{ download: false }` to just return it) |
| `clearLayouts(name?)`     | Forget this user's remembered layouts; shipped layouts stay          |

## Fine-tuning with attributes

- `data-bone` turns any element into one solid bone (e.g. a complex chart).
- `data-bone-ignore` skips an element entirely (e.g. a close button that should stay hidden without a bone).

## Theming

```css
.ab-root {
  --ab-base: #e5e7eb;
  --ab-highlight: #f5f6f8;
  --ab-duration: 1.5s;
  --ab-text-radius: 4px;
}
```

## Tips

- With `name` and a shipped layouts file, you can skip placeholder data entirely, even on first visits.
- Without them, placeholder data of about the real length gives the best skeleton.
- Give images a size (`width`/`height` or `aspect-ratio`) so they take up space before they load.

### Long lists

A skeleton per card is fine. When the page resizes, every skeleton redraws together in a single animation frame, and bones that did not move are left alone.

Measured in Chromium on a Windows PC, with a separate skeleton around each card (about 10 bones per card):

| Cards | Bones | Shimmer animation | Resize |
| --- | --- | --- | --- |
| 200 | 2,000 | smooth, 60 fps | one brief hitch, about 70 ms |
| 500 | 5,000 | about 35 fps | about 0.3 to 0.7 s |
| 1,000 | 10,000 | about 16 fps (60 fps with `animation: "none"`) | about 0.4 s |

The shimmer paints every bone on every frame, so its cost grows with the number of bones. `pulse` is no cheaper: in the same test it was slower at 1,000 cards. For a very long list, set `animation="none"`, or only render as many placeholder cards as fit on screen (ten or so) rather than the whole list. Your numbers will differ with the device, so measure on a slow phone if that matters to you.

## Development

```bash
npm install
npm run build      # dist/ (ESM + CJS + types) and style.css
npm run typecheck
npm run demo       # open http://localhost:3000/demo/
```

A React app that uses the library from this folder is in [`examples/react`](https://github.com/Drinor101/autobones/tree/main/examples/react). See [CONTRIBUTING.md](https://github.com/Drinor101/autobones/blob/main/CONTRIBUTING.md) for the full workflow.

## License

MIT

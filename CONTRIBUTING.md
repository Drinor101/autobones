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

## Before you open a pull request

```bash
npm run typecheck
npm run build
npx publint
```

CI runs the same checks, plus a type-resolution check of every entry point and a build of the React example.

In the pull request, say what changed and why, and what you checked by hand (browser, framework, light and dark). If it fixes a bug, a small reproduction in the description helps a lot.

## Reporting a bug

Use the bug report form. The most useful reports have a small reproduction (a CodeSandbox, StackBlitz or a snippet of your component) and say which framework and browser you use.

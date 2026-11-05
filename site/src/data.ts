export const REPO = "https://github.com/Drinor101/autobones";
export const NPM = "https://www.npmjs.com/package/autobones";
export const AUTHOR = "https://github.com/Drinor101";

export interface Article {
  author: string;
  meta: string;
  title: string;
  body: string;
  from: string;
  to: string;
  likes: number;
  comments: number;
  shares: number;
}

export const ARTICLES: Article[] = [
  {
    author: "Ada Park",
    meta: "4 min read · Design systems",
    title: "Why skeletons beat spinners",
    body: "Skeleton screens set expectations about layout, so the page feels faster even when it isn't.",
    from: "#f59e0b",
    to: "#ec4899",
    likes: 1204,
    comments: 86,
    shares: 312,
  },
  {
    author: "Liam Chen",
    meta: "6 min read · Performance",
    title: "Measuring layout without layout thrash",
    body: "Batch your reads, write once, and let ResizeObserver tell you when things move.",
    from: "#22d3ee",
    to: "#6366f1",
    likes: 8731,
    comments: 214,
    shares: 1052,
  },
  {
    author: "Noor Haddad",
    meta: "3 min read · Accessibility",
    title: "Reduced motion is not optional",
    body: "Shimmer is fun until it isn't. Respect the user's settings by default.",
    from: "#34d399",
    to: "#0ea5e9",
    likes: 452,
    comments: 37,
    shares: 95,
  },
];

/** Shown while loading: roughly the length of real content, so lines wrap in the same places. */
export const PLACEHOLDER: Article = {
  author: "Placeholder name",
  meta: "0 min read · Topic",
  title: "A placeholder title that wraps onto two lines",
  body: "A placeholder excerpt of about the same length as the real text will be, so every line lands in the same place.",
  from: "#cbd5e1",
  to: "#94a3b8",
  likes: 1000,
  comments: 100,
  shares: 100,
};

/** A gradient picture as a data URI, so the page needs no image files or network. */
export const art = (from: string, to: string, w: number, h: number) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  );

export interface Snippet {
  id: string;
  label: string;
  file: string;
  code: string;
}

export const SNIPPETS: Snippet[] = [
  {
    id: "react",
    label: "React",
    file: "Profile.tsx",
    code: `import { Skeleton } from "autobones/react";

export function Profile() {
  const { user, isLoading } = useUser();

  return (
    <Skeleton loading={isLoading} name="profile" delay={150}>
      <UserCard user={user ?? placeholderUser} />
    </Skeleton>
  );
}`,
  },
  {
    id: "vue",
    label: "Vue",
    file: "Profile.vue",
    code: `<script setup>
import { Skeleton } from "autobones/vue";
</script>

<template>
  <Skeleton :loading="isLoading" name="profile" :delay="150">
    <UserCard :user="user ?? placeholderUser" />
  </Skeleton>
</template>`,
  },
  {
    id: "svelte",
    label: "Svelte",
    file: "Profile.svelte",
    code: `<script>
  import { skeleton } from "autobones/svelte";
</script>

<div use:skeleton={{ loading, name: "profile", delay: 150 }}>
  <UserCard user={user ?? placeholderUser} />
</div>`,
  },
  {
    id: "element",
    label: "Web Component",
    file: "index.html",
    code: `<script type="module">import "autobones/element";</script>

<auto-skeleton loading name="profile" delay="150">
  <!-- your markup -->
</auto-skeleton>`,
  },
  {
    id: "js",
    label: "Plain JS",
    file: "main.js",
    code: `import { createSkeleton } from "autobones";

const skeleton = createSkeleton(document.querySelector("#profile"), { delay: 150 });

await loadData();
skeleton.setLoading(false);`,
  },
];

export const SHIP_LAYOUTS = `// 1. In dev, open your pages and resize through your breakpoints. Then run:
autobones.exportLayouts();   // downloads autobones.layouts.json

// 2. Commit that file, and register it once at startup
import layouts from "./autobones.layouts.json";
import { registerLayouts } from "autobones";

registerLayouts(layouts);`;

export const INSTALL = [
  { id: "npm", cmd: "npm install autobones" },
  { id: "pnpm", cmd: "pnpm add autobones" },
  { id: "yarn", cmd: "yarn add autobones" },
  { id: "bun", cmd: "bun add autobones" },
];

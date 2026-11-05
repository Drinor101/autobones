import type { Page } from "@playwright/test";

/** A small inline picture, so the fixtures need no network. */
export const IMG =
  "data:image/svg+xml," +
  encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='320' height='120'><rect width='100%' height='100%' fill='#89a'/></svg>");

/**
 * A realistic card: rounded and overflow:hidden, with a full-bleed cover image, a circular avatar frame,
 * a plain colored dot, four text lines and two buttons.
 * Expected bones: text 4, media 4 (cover, avatar image, 2 buttons), box 1 (the dot), surface 1 (the card).
 */
export function cardHtml(opts: { title?: string; body?: string } = {}) {
  const { title = "A card title", body = "Short body text." } = opts;
  return `
    <article class="card">
      <img class="cover" src="${IMG}" width="320" height="120" alt="" />
      <div class="card-body">
        <div class="author">
          <span class="frame"><img src="${IMG}" width="40" height="40" alt="" /></span>
          <div><div class="name">Ada Park</div><div class="meta">4 min read</div></div>
          <span class="dot"></span>
        </div>
        <h3>${title}</h3>
        <p>${body}</p>
        <div class="actions"><button>Like</button><button>Share</button></div>
      </div>
    </article>`;
}

/** The element every test turns into a skeleton. */
export const box = (inner: string, width = 320) => `<div id="box" style="width:${width}px">${inner}</div>`;

export async function openFixture(page: Page, file = "page.html") {
  await page.goto(`/tests/fixtures/${file}`);
  await page.waitForFunction(() => (window as any).ready === true);
}

export const mount = (page: Page, html: string) =>
  page.evaluate((h) => {
    document.getElementById("root")!.innerHTML = h;
  }, html);

/** createSkeleton() on an element, kept on window.sk[key] so later calls can reach the controller. */
export const start = (page: Page, selector: string, options: Record<string, unknown> = {}, loading = true) =>
  page.evaluate(
    ([sel, opts, isLoading]) => {
      const w = window as any;
      w.sk[sel as string] = w.ab.createSkeleton(document.querySelector(sel as string), opts, isLoading);
    },
    [selector, options, loading] as const,
  );

export const call = (page: Page, selector: string, method: string, ...args: unknown[]) =>
  page.evaluate(([sel, m, a]) => (window as any).sk[sel as string][m as string](...(a as unknown[])), [selector, method, args] as const);

export interface Summary {
  text: number;
  media: number;
  box: number;
  surface: number;
  /** Number of children in the first overlay. */
  total: number;
  overlays: number;
  overlayHidden: string | null;
  rootClass: boolean;
  loadingClass: boolean;
  fading: boolean;
  busy: string | null;
  inert: boolean;
  minHeight: string;
  animation: string | null;
}

/** What the skeleton currently looks like in the DOM (zeros while the element does not exist yet). */
export const summary = (page: Page, selector = "#box"): Promise<Summary> => page.evaluate((sel) => (window as any).probe(sel), selector);

export interface BoneInfo {
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Computed corner radii: top-left, top-right, bottom-right, bottom-left. */
  corners: string[];
}

export const bones = (page: Page, selector = "#box"): Promise<BoneInfo[]> =>
  page.evaluate((sel) => {
    const overlay = document.querySelector(sel)!.querySelector(":scope > .ab-overlay");
    return Array.from(overlay?.children ?? []).map((el) => {
      const e = el as HTMLElement;
      const cs = getComputedStyle(e);
      return {
        kind: e.dataset.kind!,
        x: parseFloat(e.style.left),
        y: parseFloat(e.style.top),
        w: parseFloat(e.style.width),
        h: parseFloat(e.style.height),
        corners: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius],
      };
    });
  }, selector);

/** Position and size of a real element, relative to #box's padding box (the same space the bones use). */
export const rectOf = (page: Page, selector: string, rootSelector = "#box") =>
  page.evaluate(
    ([sel, rootSel]) => {
      const root = document.querySelector(rootSel as string) as HTMLElement;
      const r0 = root.getBoundingClientRect();
      return Array.from(document.querySelectorAll(sel as string)).map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - r0.left - root.clientLeft, y: r.top - r0.top - root.clientTop, w: r.width, h: r.height };
      });
    },
    [selector, rootSelector] as const,
  );

export const px = (value: string) => parseFloat(value);

/**
 * autobones core — framework-agnostic auto-layout skeletons.
 *
 * Renders your real component (usually with placeholder data), measures the
 * layout of its text lines, media and boxes, hides the content, and draws
 * matching skeleton "bones" on an overlay.
 */

export interface SkeletonOptions {
  /** Base bone color. Default: CSS var --ab-base */
  baseColor?: string;
  /** Shimmer highlight color. Default: CSS var --ab-highlight */
  highlightColor?: string;
  /** Animation style. Default: "shimmer" */
  animation?: "shimmer" | "pulse" | "none";
  /** Animation duration in ms. Default: 1500 */
  duration?: number;
  /** Radius used for text-line bones. Default: 4px */
  textRadius?: string;
  /** Text bones are this fraction of the line's font size tall. Default: 0.8 */
  textHeightRatio?: number;
  /** Re-measure automatically when the content resizes or changes. Default: true */
  observe?: boolean;
  /** Extra CSS selectors to treat as a single solid bone. */
  boneSelector?: string;
  /** Inject the default stylesheet. Disable for strict CSP and import style.css. Default: true */
  injectStyles?: boolean;
  /**
   * Layout memory key. After real content renders once, its shape is saved under this name.
   * Next time it loads with nothing to render, that saved skeleton is drawn instead,
   * so no placeholder data is needed.
   */
  name?: string;
  /** Keep remembered layouts across page reloads (localStorage). Default: true */
  persist?: boolean;
  /** Wait this many ms before showing bones, so fast loads never flash a skeleton. Default: 0 */
  delay?: number;
  /** Once shown, keep the skeleton at least this many ms to avoid a flash. Default: 0 */
  minDuration?: number;
  /** Cross-fade from skeleton to content over this many ms. Default: 200 */
  fade?: number;
}

export interface Bone {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: string;
  /** text/media/box are shimmering bones; surface is a container's own background and border. */
  kind: "text" | "media" | "box" | "surface";
  /** Extra inline CSS for surfaces (background, border, shadow). */
  style?: string;
}

export interface SkeletonController {
  /** Show or hide the skeleton. */
  setLoading(loading: boolean): void;
  /** Force a re-measure (e.g. after fonts load). */
  update(): void;
  /** Change options at runtime. */
  setOptions(options: SkeletonOptions): void;
  /** Remove everything and stop observing. */
  destroy(): void;
  readonly loading: boolean;
}

const ROOT_CLASS = "ab-root";
const LOADING_CLASS = "ab-loading";
const OVERLAY_CLASS = "ab-overlay";
const BONE_CLASS = "ab-bone";
const STYLE_ID = "autobones-styles";

/** Elements that become one solid bone; their children are not walked. */
const MEDIA_SELECTOR =
  "img,svg,video,canvas,picture,iframe,input,textarea,select,button,progress,meter,[data-bone]";

export const STYLES = `
.${ROOT_CLASS}{
  --ab-base:#e5e7eb;--ab-highlight:#f5f6f8;--ab-duration:1.5s;--ab-text-radius:4px;
}
@media (prefers-color-scheme:dark){
  .${ROOT_CLASS}{--ab-base:#2a2d34;--ab-highlight:#3a3e47;}
}
.${LOADING_CLASS}{position:relative;color:transparent!important}
.${LOADING_CLASS}>:not(.${OVERLAY_CLASS}){visibility:hidden}
.ab-fading{position:relative}
.${OVERLAY_CLASS}{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1}
.ab-surface{position:absolute}
.${BONE_CLASS}{
  position:absolute;background-color:var(--ab-base);
  background-image:linear-gradient(100deg,transparent 30%,var(--ab-highlight) 50%,transparent 70%);
  background-size:200vw 100%;background-repeat:no-repeat;background-attachment:fixed;
  animation:ab-shimmer var(--ab-duration) linear infinite;
}
.${ROOT_CLASS}[data-ab-animation=pulse] .${BONE_CLASS}{
  background-image:none;animation:ab-pulse var(--ab-duration) ease-in-out infinite;
}
.${ROOT_CLASS}[data-ab-animation=none] .${BONE_CLASS}{background-image:none;animation:none}
@keyframes ab-shimmer{from{background-position:-200vw 0}to{background-position:200vw 0}}
@keyframes ab-pulse{0%,100%{opacity:1}50%{opacity:.45}}
@media (prefers-reduced-motion:reduce){
  .${BONE_CLASS}{animation:none!important;background-image:none!important}
  .${OVERLAY_CLASS}{transition:none!important}
}
`;

function injectStyles(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLES;
  doc.head.appendChild(style);
}

function isTransparent(color: string) {
  return (
    !color ||
    color === "transparent" ||
    /rgba?\([^)]*,\s*0(\.0+)?\s*\)$/.test(color) ||
    /\/\s*0(\.0+)?\s*\)$/.test(color)
  );
}

function hasVisibleBox(cs: CSSStyleDeclaration) {
  return (
    !isTransparent(cs.backgroundColor) ||
    cs.backgroundImage !== "none" ||
    (parseFloat(cs.borderTopWidth) > 0 && !isTransparent(cs.borderTopColor) && cs.borderTopStyle !== "none")
  );
}

/** A leaf box is an element with a visible box and no element/text children. */
function isEmptyLeaf(el: Element) {
  for (const n of Array.from(el.childNodes)) {
    if (n.nodeType === 1) return false;
    if (n.nodeType === 3 && n.textContent!.trim()) return false;
  }
  return true;
}

function radiusFor(el: Element, cs: CSSStyleDeclaration, w: number, h: number) {
  const r = cs.borderRadius;
  if (r && r !== "0px") {
    // Treat big radii on near-square elements as circles.
    if (r.includes("%") && parseFloat(r) >= 50 && Math.abs(w - h) < 2) return "50%";
    return r;
  }
  if (el.tagName === "BUTTON" || el.tagName === "INPUT") return "6px";
  return "4px";
}

/** Merge text bones that sit on the same line with a small gap, e.g. "<b>1,204</b> followers". */
function mergeTextRuns(bones: Bone[]): Bone[] {
  const out: Bone[] = [];
  for (const b of bones) {
    const prev = out[out.length - 1];
    if (
      prev && b.kind === "text" && prev.kind === "text" &&
      Math.abs(prev.y + prev.height / 2 - (b.y + b.height / 2)) < Math.min(prev.height, b.height) / 2 &&
      b.x >= prev.x && b.x - (prev.x + prev.width) < Math.max(prev.height, b.height) * 0.6
    ) {
      const top = Math.min(prev.y, b.y);
      const bottom = Math.max(prev.y + prev.height, b.y + b.height);
      prev.width = b.x + b.width - prev.x;
      prev.y = top;
      prev.height = bottom - top;
      continue;
    }
    out.push({ ...b });
  }
  return out;
}

/** The padding box and inner corner radii of an element that clips its content, in viewport pixels. */
interface Clip {
  l: number;
  t: number;
  r: number;
  b: number;
  /** Top-left, top-right, bottom-right, bottom-left. */
  rad: number[];
}

/** Describes `el` if it clips its content (overflow other than visible) and has rounded corners. */
function clipOf(el: Element, cs: CSSStyleDeclaration): Clip | null {
  if (cs.overflowX === "visible" && cs.overflowY === "visible") return null;
  const rect = el.getBoundingClientRect();
  const bw = (side: string) => parseFloat(cs.getPropertyValue(`border-${side}-width`)) || 0;
  const [bt, br, bb, bl] = ["top", "right", "bottom", "left"].map(bw);
  const px = (v: string, size: number) => (v.endsWith("%") ? (parseFloat(v) / 100) * size : parseFloat(v)) || 0;
  const corners = [["top-left", bt, bl], ["top-right", bt, br], ["bottom-right", bb, br], ["bottom-left", bb, bl]] as const;
  const rad = corners.map(([corner, borderA, borderB]) => {
    const [h, v = h] = cs.getPropertyValue(`border-${corner}-radius`).split(" ");
    // The content is clipped at the padding box, whose radius is the outer radius minus the border.
    return Math.max(0, Math.min(px(h, rect.width), px(v, rect.height)) - Math.max(borderA, borderB));
  });
  if (!rad.some((n) => n > 0)) return null;
  return { l: rect.left + bl, t: rect.top + bt, r: rect.right - br, b: rect.bottom - bb, rad };
}

/** Round the corners of a bone that sits in the corner of a clipping container, like the container does. */
function clipRadius(box: { left: number; top: number; width: number; height: number }, radius: string, clips: Clip[]) {
  // Only plain pixel radii (what getComputedStyle gives for 1 to 4 values) are rewritten; anything else is left alone.
  const m = /^([\d.]+)px(?: ([\d.]+)px)?(?: ([\d.]+)px)?(?: ([\d.]+)px)?$/.exec(radius);
  if (!m) return radius;
  const [a, b = a, c = a, d = b] = m.slice(1).filter((s) => s !== undefined).map(Number);
  const out = [a, b, c, d];
  const right = box.left + box.width;
  const bottom = box.top + box.height;
  const near = (x: number, y: number) => Math.abs(x - y) < 1.5;
  for (const k of clips) {
    const atL = near(box.left, k.l), atR = near(right, k.r), atT = near(box.top, k.t), atB = near(bottom, k.b);
    if (atT && atL) out[0] = Math.max(out[0], k.rad[0]);
    if (atT && atR) out[1] = Math.max(out[1], k.rad[1]);
    if (atB && atR) out[2] = Math.max(out[2], k.rad[2]);
    if (atB && atL) out[3] = Math.max(out[3], k.rad[3]);
  }
  return out.map((n) => `${Math.round(n * 10) / 10}px`).join(" ");
}

/** Measure all bones inside `root`, relative to `root`'s padding box. */
export function measureBones(root: HTMLElement, opts: SkeletonOptions = {}): Bone[] {
  const bones: Bone[] = [];
  const clips: Clip[] = [];
  const origin = root.getBoundingClientRect();
  const ox = origin.left + root.clientLeft - root.scrollLeft;
  const oy = origin.top + root.clientTop - root.scrollTop;
  const ratio = opts.textHeightRatio ?? 0.8;
  const textRadius = opts.textRadius ?? "var(--ab-text-radius)";
  const solid = opts.boneSelector ? `${MEDIA_SELECTOR},${opts.boneSelector}` : MEDIA_SELECTOR;
  const range = root.ownerDocument.createRange();

  const push = (r: DOMRect | { left: number; top: number; width: number; height: number }, radius: string, kind: Bone["kind"], style?: string) => {
    if (r.width < 1 || r.height < 1) return;
    if (clips.length && (kind === "media" || kind === "box")) radius = clipRadius(r, radius, clips);
    bones.push({ x: r.left - ox, y: r.top - oy, width: r.width, height: r.height, radius, kind, style });
  };

  const walk = (el: Element) => {
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3) {
        if (!node.textContent!.trim()) continue;
        const parent = node.parentElement!;
        const fontSize = parseFloat(getComputedStyle(parent).fontSize) || 16;
        range.selectNodeContents(node);
        // One bone per rendered line: merge rects that share a line.
        const lines: { left: number; right: number; top: number; bottom: number }[] = [];
        for (const r of Array.from(range.getClientRects())) {
          if (r.width < 1) continue;
          const mid = r.top + r.height / 2;
          const line = lines.find((l) => mid > l.top && mid < l.bottom);
          if (line) {
            line.left = Math.min(line.left, r.left);
            line.right = Math.max(line.right, r.right);
          } else lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
        }
        for (const l of lines) {
          const h = Math.min(fontSize * ratio, l.bottom - l.top);
          const top = l.top + (l.bottom - l.top - h) / 2;
          push({ left: l.left, top, width: l.right - l.left, height: h }, textRadius, "text");
        }
        continue;
      }
      if (node.nodeType !== 1) continue;
      const child = node as Element;
      if (child.classList.contains(OVERLAY_CLASS) || child.hasAttribute("data-bone-ignore")) continue;
      const cs = getComputedStyle(child);
      if (cs.display === "none") continue;

      const isSolid = child.matches(solid);
      const isBox = !isSolid && isEmptyLeaf(child) && hasVisibleBox(cs);
      if (isSolid || isBox) {
        const r = child.getBoundingClientRect();
        push(r, radiusFor(child, cs, r.width, r.height), isSolid ? "media" : "box");
        continue;
      }
      // Containers with their own chrome (cards, panels) keep it, drawn under their bones.
      if (hasVisibleBox(cs) || cs.boxShadow !== "none") {
        const r = child.getBoundingClientRect();
        const border = ["Top", "Right", "Bottom", "Left"]
          .map((side) => {
            const k = (p: string) => cs.getPropertyValue(`border-${side.toLowerCase()}-${p}`);
            return `border-${side.toLowerCase()}:${k("width")} ${k("style")} ${k("color")}`;
          })
          .join(";");
        push(r, cs.borderRadius, "surface", `background:${cs.backgroundColor};${border};box-shadow:${cs.boxShadow}`);
      }
      const clip = clipOf(child, cs);
      if (clip) clips.push(clip);
      walk(child);
      if (clip) clips.pop();
    }
  };

  const rootClip = clipOf(root, getComputedStyle(root));
  if (rootClip) clips.push(rootClip);
  walk(root);
  range.detach?.();
  return mergeTextRuns(bones);
}

/* ------------------------------------------------------------------ */
/* Layout memory                                                       */
/* ------------------------------------------------------------------ */

export interface LayoutSnapshot {
  /** Container width (px) when captured. */
  width: number;
  /** Container border-box height (px) when captured. */
  height: number;
  bones: Bone[];
}

/** The file you ship with your app (see exportLayouts / registerLayouts). */
export interface LayoutsFile {
  version: 1;
  /** One snapshot per captured width, per layout name. */
  layouts: Record<string, LayoutSnapshot[]>;
}

const LAYOUTS_VERSION = 1;
const STORAGE_PREFIX = "autobones:";
/** Widths closer than this count as the same breakpoint. */
const SAME_WIDTH = 24;
const MAX_WIDTHS = 6;

interface LayoutStore {
  /** This user's own layouts (latest per name), mirrored to localStorage. */
  own: Map<string, LayoutSnapshot>;
  /** Layouts shipped with the app via registerLayouts(). */
  shipped: Map<string, LayoutSnapshot[]>;
  /** Everything captured in this session, at every width, for exportLayouts(). */
  recorded: Map<string, LayoutSnapshot[]>;
}

// Kept on globalThis so every copy of this module shares one store. Without that,
// the CJS build (one bundled copy per entry) and an app that loads both the ESM and
// CJS builds would each get their own, and layouts registered in one would be invisible to the other.
const STORE_KEY = Symbol.for("autobones.layouts.v1");
const store: LayoutStore = ((globalThis as Record<symbol, unknown>)[STORE_KEY] ??= {
  own: new Map(),
  shipped: new Map(),
  recorded: new Map(),
} satisfies LayoutStore) as LayoutStore;
const { own, shipped, recorded } = store;

const r1 = (n: number) => Math.round(n * 10) / 10;
const compact = (snap: LayoutSnapshot): LayoutSnapshot => ({
  width: r1(snap.width),
  height: r1(snap.height),
  bones: snap.bones.map((b) => ({ ...b, x: r1(b.x), y: r1(b.y), width: r1(b.width), height: r1(b.height) })),
});

function upsertByWidth(list: LayoutSnapshot[], snap: LayoutSnapshot) {
  const i = list.findIndex((s) => Math.abs(s.width - snap.width) <= SAME_WIDTH);
  if (i >= 0) list[i] = snap;
  else {
    list.push(snap);
    list.sort((x, y) => x.width - y.width);
    if (list.length > MAX_WIDTHS) {
      // Drop the neighbour closest in width to the new snapshot.
      const j = list.indexOf(snap);
      const drop = j === 0 ? 1 : j === list.length - 1 ? j - 1 : list[j + 1].width - snap.width < snap.width - list[j - 1].width ? j + 1 : j - 1;
      list.splice(drop, 1);
    }
  }
}

function closest(list: LayoutSnapshot[] | undefined, width: number) {
  if (!list?.length) return undefined;
  return list.reduce((best, s) => (Math.abs(s.width - width) < Math.abs(best.width - width) ? s : best));
}

function loadOwn(name: string): LayoutSnapshot | undefined {
  if (own.has(name)) return own.get(name);
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + name);
    if (raw) {
      const snap = JSON.parse(raw) as LayoutSnapshot;
      own.set(name, snap);
      return snap;
    }
  } catch {
    /* storage blocked or corrupt: ignore */
  }
  return undefined;
}

/**
 * Pick the best remembered layout for this width: the user's own layout,
 * unless a shipped one was captured at a clearly closer width.
 */
function findLayout(name: string, width: number): LayoutSnapshot | undefined {
  const mine = loadOwn(name);
  const ship = closest(shipped.get(name), width);
  if (mine && (!ship || Math.abs(mine.width - width) <= Math.abs(ship.width - width) + SAME_WIDTH)) return mine;
  return ship ?? mine;
}

function saveLayout(name: string, raw: LayoutSnapshot, persist: boolean) {
  const snap = compact(raw);
  own.set(name, snap);
  const list = recorded.get(name) ?? [];
  upsertByWidth(list, snap);
  recorded.set(name, list);
  if (!persist) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(snap));
  } catch {
    /* quota or privacy mode: memory cache still works */
  }
}

/**
 * Load layouts captured during development so even a user's first visit gets
 * a pixel-accurate skeleton. Call once at startup, before your app renders.
 */
export function registerLayouts(file: LayoutsFile | string) {
  const data: LayoutsFile = typeof file === "string" ? JSON.parse(file) : file;
  if (!data || data.version !== LAYOUTS_VERSION || typeof data.layouts !== "object") {
    console.warn(`[autobones] Ignoring layouts file: expected version ${LAYOUTS_VERSION}. Re-export it with exportLayouts().`);
    return;
  }
  for (const [name, list] of Object.entries(data.layouts)) {
    if (Array.isArray(list) && list.length) shipped.set(name, [...list].sort((x, y) => x.width - y.width));
  }
}

/**
 * Build a layouts file from everything captured in this session (merged on top of
 * any registered layouts). In the browser it also downloads autobones.layouts.json.
 *
 * Tip: in dev, open your pages, resize the window through your breakpoints,
 * then run `autobones.exportLayouts()` in the console.
 */
export function exportLayouts(options: { download?: boolean; filename?: string } = {}): LayoutsFile {
  const layouts: Record<string, LayoutSnapshot[]> = {};
  for (const name of new Set([...shipped.keys(), ...recorded.keys()])) {
    const list = [...(shipped.get(name) ?? [])];
    for (const snap of recorded.get(name) ?? []) upsertByWidth(list, snap);
    layouts[name] = list;
  }
  const file: LayoutsFile = { version: LAYOUTS_VERSION, layouts };
  const wantDownload = options.download ?? typeof document !== "undefined";
  if (wantDownload && typeof document !== "undefined") {
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = options.filename ?? "autobones.layouts.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const names = Object.keys(layouts);
  console.info(`[autobones] Exported ${names.length} layout(s): ${names.map((n) => `${n} (${layouts[n].map((s) => s.width + "px").join(", ")})`).join("; ") || "none yet"}`);
  return file;
}

/** Forget this user's remembered layouts (and this session's recordings): one by name, or all. Shipped layouts stay. */
export function clearLayouts(name?: string) {
  const names = name ? [name] : [...new Set([...own.keys(), ...recorded.keys()])];
  for (const n of names) {
    own.delete(n);
    recorded.delete(n);
  }
  try {
    if (name) localStorage.removeItem(STORAGE_PREFIX + name);
    else
      for (const k of Object.keys(localStorage))
        if (k.startsWith(STORAGE_PREFIX)) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

// Console access for the dev workflow: autobones.exportLayouts()
if (typeof window !== "undefined") {
  const w = window as unknown as { autobones?: object };
  w.autobones ??= { exportLayouts, clearLayouts };
}

const hasLive = (bones: Bone[]) => bones.some((b) => b.kind !== "surface");
const prefersReducedMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* Controller                                                          */
/* ------------------------------------------------------------------ */

export function createSkeleton(
  root: HTMLElement,
  initialOptions: SkeletonOptions = {},
  initialLoading = true,
): SkeletonController {
  let opts: SkeletonOptions = { ...initialOptions };
  let wanted = false; // what the app asked for
  let shown = false; // bones currently on screen
  let shownAt = 0;
  let overlay: HTMLDivElement | null = null;
  let fadingOverlay: HTMLDivElement | null = null;
  let frame = 0;
  let delayTimer: ReturnType<typeof setTimeout> | undefined;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;
  let captureTimers: ReturnType<typeof setTimeout>[] = [];
  let resizeObs: ResizeObserver | null = null;
  let mutationObs: MutationObserver | null = null;
  let savedMinHeight: string | null = null;
  const doc = root.ownerDocument;

  if (opts.injectStyles !== false) injectStyles(doc);
  root.classList.add(ROOT_CLASS);

  const applyOptions = () => {
    const s = root.style;
    opts.baseColor ? s.setProperty("--ab-base", opts.baseColor) : s.removeProperty("--ab-base");
    opts.highlightColor ? s.setProperty("--ab-highlight", opts.highlightColor) : s.removeProperty("--ab-highlight");
    opts.duration ? s.setProperty("--ab-duration", `${opts.duration}ms`) : s.removeProperty("--ab-duration");
    root.setAttribute("data-ab-animation", opts.animation ?? "shimmer");
  };

  const setMinHeight = (borderBoxHeight: number) => {
    if (savedMinHeight === null) savedMinHeight = root.style.minHeight;
    const cs = getComputedStyle(root);
    const extra =
      cs.boxSizing === "border-box"
        ? 0
        : parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    root.style.minHeight = `${Math.max(0, borderBoxHeight - extra)}px`;
  };

  const restoreMinHeight = () => {
    if (savedMinHeight === null) return;
    root.style.minHeight = savedMinHeight;
    savedMinHeight = null;
  };

  /** Live bones from the rendered content, or the remembered layout when there's nothing to measure. */
  const resolveBones = (): Bone[] => {
    const live = measureBones(root, opts);
    if (hasLive(live) || !opts.name) {
      if (savedMinHeight !== null && hasLive(live)) restoreMinHeight();
      return live;
    }
    const snap = findLayout(opts.name, root.clientWidth);
    if (!snap) return live;
    const width = root.clientWidth || snap.width;
    const sx = snap.width ? width / snap.width : 1;
    setMinHeight(snap.height);
    return snap.bones.map((b) => ({ ...b, x: b.x * sx, width: b.width * sx }));
  };

  const render = () => {
    frame = 0;
    if (!shown || !overlay) return;
    // Measure with the overlay detached so it can't affect layout.
    overlay.remove();
    const bones = resolveBones();
    const frag = doc.createDocumentFragment();
    for (const b of bones) {
      const d = doc.createElement("div");
      d.dataset.kind = b.kind;
      d.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.width}px;height:${b.height}px;border-radius:${b.radius}`;
      if (b.kind === "surface") {
        d.className = "ab-surface";
        d.style.cssText += `;box-sizing:border-box;${b.style}`;
      } else d.className = BONE_CLASS;
      frag.appendChild(d);
    }
    overlay.replaceChildren(frag);
    root.appendChild(overlay);
    // Discard the mutations we just caused so we don't re-render in a loop.
    mutationObs?.takeRecords();
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  const observe = () => {
    if (opts.observe === false) return;
    if (typeof ResizeObserver !== "undefined") {
      resizeObs = new ResizeObserver(schedule);
      resizeObs.observe(root);
    }
    mutationObs = new MutationObserver((records) => {
      const isOurs = (r: MutationRecord) =>
        r.target === overlay ||
        !!overlay?.contains(r.target) ||
        (r.type === "childList" &&
          [...Array.from(r.addedNodes), ...Array.from(r.removedNodes)].every((n) => n === overlay));
      if (records.every(isOurs)) return;
      schedule();
    });
    mutationObs.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["src", "class", "style"] });
    doc.fonts?.ready.then(schedule);
  };

  const unobserve = () => {
    resizeObs?.disconnect();
    mutationObs?.disconnect();
    resizeObs = mutationObs = null;
  };

  /** Save the real content's current shape under opts.name. */
  const capture = () => {
    if (!opts.name || wanted || shown) return;
    const bones = measureBones(root, opts);
    if (!hasLive(bones)) return;
    saveLayout(opts.name, { width: root.clientWidth, height: root.getBoundingClientRect().height, bones }, opts.persist !== false);
  };

  /** Capture right away, and again once images and fonts settle. */
  const scheduleCapture = () => {
    if (!opts.name) return;
    captureTimers.forEach(clearTimeout);
    captureTimers = [setTimeout(capture, 0), setTimeout(capture, 1000)];
  };

  // While idle, re-capture when the container changes width, so resizing through
  // your breakpoints in dev records one snapshot per width.
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let lastIdleWidth = -1;
  const idleObs =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          if (!opts.name || wanted) return;
          const w = root.clientWidth;
          if (Math.abs(w - lastIdleWidth) < 1) return;
          lastIdleWidth = w;
          clearTimeout(idleTimer);
          idleTimer = setTimeout(capture, 400);
        })
      : null;
  idleObs?.observe(root);

  const clearFade = () => {
    clearTimeout(fadeTimer);
    fadingOverlay?.remove();
    fadingOverlay = null;
    root.classList.remove("ab-fading");
  };

  const hideContent = () => {
    root.classList.add(LOADING_CLASS);
    root.setAttribute("aria-busy", "true");
    root.setAttribute("inert", "");
  };

  const showContent = () => {
    root.classList.remove(LOADING_CLASS);
    root.removeAttribute("aria-busy");
    root.removeAttribute("inert");
  };

  const show = () => {
    delayTimer = undefined;
    if (shown || !wanted) return;
    shown = true;
    shownAt = Date.now();
    overlay = doc.createElement("div");
    overlay.className = OVERLAY_CLASS;
    overlay.setAttribute("aria-hidden", "true");
    render(); // synchronous first paint: no flash of real content
    observe();
  };

  const finish = () => {
    stopTimer = undefined;
    shown = false;
    unobserve();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    restoreMinHeight();
    showContent();
    const ov = overlay;
    overlay = null;
    const fade = opts.fade ?? 200;
    if (ov && fade > 0 && !prefersReducedMotion()) {
      // Cross-fade: content is visible underneath while the bones fade out.
      fadingOverlay = ov;
      root.classList.add("ab-fading");
      ov.style.transition = `opacity ${fade}ms ease`;
      void ov.offsetWidth; // commit the starting opacity
      ov.style.opacity = "0";
      fadeTimer = setTimeout(clearFade, fade);
    } else ov?.remove();
    scheduleCapture();
  };

  const start = () => {
    clearTimeout(stopTimer);
    stopTimer = undefined;
    if (wanted) return;
    wanted = true;
    captureTimers.forEach(clearTimeout);
    clearFade();
    hideContent();
    if (shown) return; // still on screen from a pending minDuration stop
    const delay = opts.delay ?? 0;
    if (delay > 0) delayTimer = setTimeout(show, delay);
    else show();
  };

  const stop = () => {
    if (!wanted) return;
    wanted = false;
    clearTimeout(delayTimer);
    delayTimer = undefined;
    if (!shown) {
      // Data arrived before the delay ran out: the skeleton never appeared.
      showContent();
      scheduleCapture();
      return;
    }
    const remaining = (opts.minDuration ?? 0) - (Date.now() - shownAt);
    if (remaining > 0) stopTimer = setTimeout(finish, remaining);
    else finish();
  };

  applyOptions();
  if (initialLoading) start();
  else scheduleCapture();

  return {
    get loading() {
      return wanted;
    },
    setLoading(next) {
      next ? start() : stop();
    },
    update() {
      if (shown) render();
      else if (!wanted) scheduleCapture();
    },
    setOptions(next) {
      const observeChanged = (next.observe ?? true) !== (opts.observe ?? true);
      opts = { ...opts, ...next };
      applyOptions();
      if (shown) {
        if (observeChanged) {
          unobserve();
          observe();
        }
        schedule();
      }
    },
    destroy() {
      idleObs?.disconnect();
      clearTimeout(idleTimer);
      clearTimeout(delayTimer);
      clearTimeout(stopTimer);
      captureTimers.forEach(clearTimeout);
      wanted = false;
      if (shown) {
        shown = false;
        unobserve();
        if (frame) cancelAnimationFrame(frame);
        overlay?.remove();
        overlay = null;
      }
      clearFade();
      restoreMinHeight();
      showContent();
      root.classList.remove(ROOT_CLASS);
      root.removeAttribute("data-ab-animation");
    },
  };
}

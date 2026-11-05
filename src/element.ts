import { createSkeleton, registerLayouts, exportLayouts, clearLayouts, type SkeletonController, type SkeletonOptions } from "./core";

/**
 * <auto-skeleton loading animation="pulse"> ...your markup... </auto-skeleton>
 *
 * Works anywhere: plain HTML, Angular, Solid, Lit, Astro, or inside any framework.
 * Toggle with el.loading = false or by removing the `loading` attribute.
 */
// Safe to import during SSR, where HTMLElement doesn't exist.
const Base = (typeof HTMLElement !== "undefined" ? HTMLElement : class {}) as typeof HTMLElement;

export class AutoSkeletonElement extends Base {
  static observedAttributes = ["loading", "base-color", "highlight-color", "animation", "duration", "text-radius", "name", "delay", "min-duration", "fade"];
  private ctrl: SkeletonController | null = null;

  get loading() {
    return this.hasAttribute("loading");
  }
  set loading(v: boolean) {
    this.toggleAttribute("loading", !!v);
  }

  private options(): SkeletonOptions {
    const a = (n: string) => this.getAttribute(n) ?? undefined;
    const d = a("duration");
    const num = (n: string) => (this.hasAttribute(n) ? Number(this.getAttribute(n)) : undefined);
    return {
      name: a("name"),
      delay: num("delay"),
      minDuration: num("min-duration"),
      fade: num("fade"),
      baseColor: a("base-color"),
      highlightColor: a("highlight-color"),
      animation: a("animation") as SkeletonOptions["animation"],
      duration: d ? Number(d) : undefined,
      textRadius: a("text-radius"),
    };
  }

  connectedCallback() {
    // Custom elements default to inline; make them a block unless styled otherwise.
    if (getComputedStyle(this).display === "inline") this.style.display = "block";
    this.ctrl = createSkeleton(this, this.options(), this.loading);
  }
  disconnectedCallback() {
    this.ctrl?.destroy();
    this.ctrl = null;
  }
  attributeChangedCallback(name: string) {
    if (!this.ctrl) return;
    if (name === "loading") this.ctrl.setLoading(this.loading);
    else this.ctrl.setOptions(this.options());
  }
  /** Force a re-measure. */
  update() {
    this.ctrl?.update();
  }
}

export function defineAutoSkeleton(tag = "auto-skeleton") {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, tag === "auto-skeleton" ? AutoSkeletonElement : class extends AutoSkeletonElement {});
  }
}

defineAutoSkeleton();

export { registerLayouts, exportLayouts, clearLayouts };

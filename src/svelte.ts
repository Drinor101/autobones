import { createSkeleton, type SkeletonOptions } from "./core";

export type SkeletonActionParams = boolean | (SkeletonOptions & { loading: boolean });

function parse(p: SkeletonActionParams) {
  if (typeof p === "boolean") return { loading: p, options: {} as SkeletonOptions };
  const { loading, ...options } = p;
  return { loading, options };
}

/**
 * Svelte action (works in Svelte 3, 4 and 5).
 *
 *   <div use:skeleton={loading}> <UserCard user={user ?? placeholder} /> </div>
 *   <div use:skeleton={{ loading, animation: "pulse" }}> ... </div>
 */
export function skeleton(node: HTMLElement, params: SkeletonActionParams = true) {
  const { loading, options } = parse(params);
  const ctrl = createSkeleton(node, options, loading);
  return {
    update(next: SkeletonActionParams) {
      const p = parse(next);
      ctrl.setOptions(p.options);
      ctrl.setLoading(p.loading);
    },
    destroy() {
      ctrl.destroy();
    },
  };
}

export { clearLayouts, registerLayouts, exportLayouts } from "./core";
export type { SkeletonOptions, LayoutsFile } from "./core";

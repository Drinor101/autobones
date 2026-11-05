import { createElement, forwardRef, useCallback, useEffect, useLayoutEffect, useRef, type ReactNode, type ElementType, type HTMLAttributes, type RefObject } from "react";
import { createSkeleton, type SkeletonController, type SkeletonOptions } from "./core";

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface SkeletonProps extends SkeletonOptions, Omit<HTMLAttributes<HTMLElement>, "children"> {
  loading: boolean;
  children?: ReactNode;
  /** Wrapper element. Default: "div" */
  as?: ElementType;
}

/**
 * Wraps its children and shows a skeleton of them while `loading` is true.
 * Extra props (className, id, style, …) go to the wrapper element, and `ref` gives you that element.
 */
export const Skeleton = forwardRef<HTMLElement, SkeletonProps>(function Skeleton(
  {
    loading,
    children,
    as = "div",
    baseColor,
    highlightColor,
    animation,
    duration,
    textRadius,
    textHeightRatio,
    observe,
    boneSelector,
    injectStyles,
    name,
    persist,
    delay,
    minDuration,
    fade,
    ...rest
  },
  forwarded,
) {
  const node = useRef<HTMLElement | null>(null);
  useController(node, loading, {
    baseColor, highlightColor, animation, duration, textRadius, textHeightRatio, observe, boneSelector, injectStyles,
    name, persist, delay, minDuration, fade,
  });
  // One callback ref feeds both our own controller and the ref the caller passed in.
  const setRef = useCallback(
    (el: HTMLElement | null) => {
      node.current = el;
      if (typeof forwarded === "function") forwarded(el);
      else if (forwarded) forwarded.current = el;
    },
    [forwarded],
  );
  return createElement(as, { ...rest, ref: setRef }, children);
});
Skeleton.displayName = "Skeleton";

/** Hook version: attach to any element you already render. Options update live, like <Skeleton>. */
export function useSkeleton<T extends HTMLElement>(loading: boolean, options: SkeletonOptions = {}) {
  const ref = useRef<T>(null);
  useController(ref, loading, options);
  return ref;
}

/** Every option, in a fixed order, so the effect below can depend on each value (callers usually pass a fresh object each render). */
const OPTION_KEYS = [
  "baseColor", "highlightColor", "animation", "duration", "textRadius", "textHeightRatio", "observe", "boneSelector",
  "injectStyles", "name", "persist", "delay", "minDuration", "fade",
] as const satisfies readonly (keyof SkeletonOptions)[];

/** Creates the controller on mount and keeps its options and loading state in sync with props. */
function useController(ref: RefObject<HTMLElement | null>, loading: boolean, options: SkeletonOptions) {
  const ctrl = useRef<SkeletonController | null>(null);

  useIsoLayoutEffect(() => {
    ctrl.current = createSkeleton(ref.current!, options, loading);
    return () => {
      ctrl.current?.destroy();
      ctrl.current = null;
    };
  }, []);

  useIsoLayoutEffect(() => {
    ctrl.current?.setOptions(options);
  }, OPTION_KEYS.map((k) => options[k]));

  useIsoLayoutEffect(() => {
    ctrl.current?.setLoading(loading);
  }, [loading]);
}

export { clearLayouts, registerLayouts, exportLayouts } from "./core";
export type { SkeletonOptions, LayoutsFile } from "./core";

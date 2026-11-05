import { useCallback, useEffect, useRef, useState } from "react";
import { ARTICLES, type Article } from "./data";

/** Pretends to call an API: a different article each time, after `latency` ms. */
export function useFakeApi(latency: number, startLoaded = false) {
  const [state, setState] = useState<{ item: Article | null; loading: boolean }>(
    startLoaded ? { item: ARTICLES[0], loading: false } : { item: null, loading: true },
  );
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latencyRef = useRef(latency);
  latencyRef.current = latency;

  const reload = useCallback(() => {
    const id = ++request.current;
    clearTimeout(timer.current);
    setState({ item: null, loading: true });
    timer.current = setTimeout(() => {
      if (request.current === id) setState({ item: ARTICLES[id % ARTICLES.length], loading: false });
    }, latencyRef.current);
  }, []);

  useEffect(() => {
    if (!startLoaded) reload();
    return () => {
      request.current++; // ignore a response that arrives after unmount (or after StrictMode's re-run)
      clearTimeout(timer.current);
    };
  }, []);

  return { ...state, reload };
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export type Theme = "light" | "dark";

/** Reads the theme set by the script in index.html, and lets the visitor flip and remember it. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light",
  );
  const toggle = useCallback(() => {
    // Read the live value instead of using a state updater: updaters must be pure, and this one has side effects.
    const next: Theme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
    setTheme(next);
  }, []);
  return { theme, toggle };
}

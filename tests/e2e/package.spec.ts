// Checks on the built package itself, run in plain Node (no browser). They run once, not once per browser.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

test.skip(({ browserName }) => browserName !== "chromium", "Node-only checks run once");

const require = createRequire(join(process.cwd(), "package.json"));
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

const esm = async () => ({
  core: await import("../../dist/index.js"),
  react: await import("../../dist/react.js"),
  vue: await import("../../dist/vue.js"),
  svelte: await import("../../dist/svelte.js"),
  element: await import("../../dist/element.js"),
});
const cjs = () => ({
  core: require("./dist/index.cjs"),
  react: require("./dist/react.cjs"),
  vue: require("./dist/vue.cjs"),
  svelte: require("./dist/svelte.cjs"),
  element: require("./dist/element.cjs"),
});

test("every entry point loads in plain Node, as ESM and as CommonJS", async () => {
  const e = await esm();
  const c = cjs();
  for (const lib of [e, c]) {
    expect(typeof lib.core.createSkeleton).toBe("function");
    expect(typeof lib.core.measureBones).toBe("function");
    expect(lib.react.Skeleton).toBeTruthy();
    expect(typeof lib.react.useSkeleton).toBe("function");
    expect(lib.vue.Skeleton).toBeTruthy();
    expect(lib.vue.vSkeleton).toBeTruthy();
    expect(typeof lib.svelte.skeleton).toBe("function");
    expect(typeof lib.element.defineAutoSkeleton).toBe("function");
  }
});

test("the ESM and CommonJS builds share one layout store", async () => {
  const e = await esm();
  const c = cjs();
  e.core.registerLayouts({ version: 1, layouts: { "package-shared": [{ width: 300, height: 100, bones: [] }] } });
  expect(Object.keys(c.react.exportLayouts({ download: false }).layouts)).toContain("package-shared");
});

test("registerLayouts ignores a file from another version and says so", async () => {
  const { core } = await esm();
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => void warnings.push(args.join(" "));
  try {
    core.registerLayouts({ version: 2, layouts: { "package-future": [{ width: 1, height: 1, bones: [] }] } } as never);
  } finally {
    console.warn = original;
  }
  expect(warnings.join("\n")).toContain("Ignoring layouts file");
  expect(Object.keys(core.exportLayouts({ download: false }).layouts)).not.toContain("package-future");
});

test("exportLayouts returns the shipped layouts sorted by width, and clearLayouts leaves them alone", async () => {
  const { core } = await esm();
  const snap = (width: number) => ({ width, height: 10, bones: [] });
  core.registerLayouts({ version: 1, layouts: { "package-sorted": [snap(640), snap(320), snap(480)] } });
  const widths = () => core.exportLayouts({ download: false }).layouts["package-sorted"].map((s: { width: number }) => s.width);
  expect(widths()).toEqual([320, 480, 640]);
  core.clearLayouts();
  expect(widths()).toEqual([320, 480, 640]);
});

test("style.css is the same stylesheet the library injects", async () => {
  const { core } = await esm();
  expect(read("style.css").trim()).toBe(core.STYLES.trim());
  expect(read("style.css")).toContain(".ab-bone");
});

test('the React entry is a client module ("use client")', async () => {
  expect(read("dist/react.js").startsWith('"use client"')).toBe(true);
  expect(read("dist/react.cjs").startsWith('"use client"')).toBe(true);
});

test("server-side rendering works: no window, no warnings, content rendered normally", async () => {
  const React = require("react");
  const { renderToString } = require("react-dom/server");
  const problems: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => void problems.push(args.join(" "));
  try {
    for (const lib of [(await esm()).react, cjs().react]) {
      const html = renderToString(
        React.createElement(lib.Skeleton, { loading: true, id: "s", name: "ssr" }, React.createElement("p", null, "Hello server")),
      );
      expect(html).toBe('<div id="s"><p>Hello server</p></div>');
      const Hooked = () => React.createElement("div", { ref: lib.useSkeleton(true, { animation: "pulse" }) }, "hook");
      expect(renderToString(React.createElement(Hooked))).toBe("<div>hook</div>");
    }
  } finally {
    console.error = originalError;
  }
  expect(problems).toEqual([]);
});

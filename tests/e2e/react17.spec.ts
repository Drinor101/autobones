import { expect, test, type Page } from "@playwright/test";
import { openFixture, summary } from "./helpers";

// The package says it supports React >=17, so the same built library runs here against React 17 itself
// (installed in tests/react17, using React 17's own render API).
const rt = {
  mount: (page: Page, props: Record<string, unknown> = {}) => page.evaluate((p) => (window as any).rt.mount(p), props),
  update: (page: Page, props: Record<string, unknown>) => page.evaluate((p) => (window as any).rt.update(p), props),
  unmount: (page: Page) => page.evaluate(() => (window as any).rt.unmount()),
  refs: (page: Page) => page.evaluate(() => (window as any).rt.refs()),
};

test.describe("React 17", () => {
  let errors: string[];

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openFixture(page, "react17.html");
  });

  test.afterEach(() => {
    expect(errors, "no uncaught errors").toEqual([]);
  });

  test("the fixture really is running React 17", async ({ page }) => {
    expect(await page.evaluate(() => (window as any).rt.version)).toMatch(/^17\./);
  });

  test("<Skeleton> and useSkeleton show bones while loading and clear when loading ends", async ({ page }) => {
    await rt.mount(page, { loading: true });
    for (const sel of ["#comp", "#cb", "#hook"]) {
      await expect.poll(async () => (await summary(page, sel)).total, { timeout: 4000, message: sel }).toBeGreaterThan(0);
      expect(await summary(page, sel), sel).toMatchObject({ loadingClass: true, busy: "true", inert: true, overlays: 1 });
    }
    await rt.update(page, { loading: false });
    for (const sel of ["#comp", "#cb", "#hook"]) {
      await expect.poll(async () => (await summary(page, sel)).overlays, { timeout: 4000, message: sel }).toBe(0);
      expect(await summary(page, sel), sel).toMatchObject({ loadingClass: false, busy: null, inert: false });
    }
  });

  test("changing an option while loading updates both the component and the hook", async ({ page }) => {
    await rt.mount(page, { loading: true, animation: "shimmer" });
    await expect.poll(async () => (await summary(page, "#hook")).animation, { timeout: 4000 }).toBe("shimmer");
    await rt.update(page, { animation: "pulse" });
    await expect.poll(async () => (await summary(page, "#comp")).animation, { timeout: 3000 }).toBe("pulse");
    await expect.poll(async () => (await summary(page, "#hook")).animation, { timeout: 3000 }).toBe("pulse");
  });

  test("forwards object refs and callback refs, and supports as=", async ({ page }) => {
    await rt.mount(page, { loading: false, as: "section" });
    await expect.poll(() => rt.refs(page), { timeout: 3000 }).toMatchObject({ object: true, callback: true });
    expect(await page.evaluate(() => document.getElementById("comp")!.tagName)).toBe("SECTION");
  });

  test("unmounting clears the refs and cleans up without errors", async ({ page }) => {
    await rt.mount(page, { loading: true });
    await expect.poll(async () => (await summary(page, "#comp")).total, { timeout: 4000 }).toBeGreaterThan(0);
    await rt.unmount(page);
    expect(await rt.refs(page)).toMatchObject({ objectCleared: true, callbackCleared: true });
    expect(await page.evaluate(() => document.getElementById("root")!.innerHTML)).toBe("");
    await page.waitForTimeout(400); // pending timers must not throw after unmount
  });
});

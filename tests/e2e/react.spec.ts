import { expect, test, type Page } from "@playwright/test";
import { openFixture, summary } from "./helpers";

const rt = {
  mount: (page: Page, props: Record<string, unknown> = {}) => page.evaluate((p) => (window as any).rt.mount(p), props),
  update: (page: Page, props: Record<string, unknown>) => page.evaluate((p) => (window as any).rt.update(p), props),
  unmount: (page: Page) => page.evaluate(() => (window as any).rt.unmount()),
  refs: (page: Page) => page.evaluate(() => (window as any).rt.refs()),
};

// The same tests run on React 18 (the repo's own) and on React 19 (tests/react19). React 17 has its own file.
for (const [version, fixture] of [["18", "react.html"], ["19", "react19.html"]] as const) {
test.describe(`React ${version}`, () => {
  let errors: string[];

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openFixture(page, fixture);
  });

  test.afterEach(() => {
    expect(errors, "no uncaught errors").toEqual([]);
  });

  test(`the fixture really is running React ${version}`, async ({ page }) => {
    expect(await page.evaluate(() => (window as any).rt.version)).toMatch(new RegExp(`^${version}\\.`));
  });

  test("<Skeleton> and useSkeleton show bones while loading and clear when loading ends", async ({ page }) => {
    await rt.mount(page, { loading: true });
    for (const sel of ["#comp", "#cb", "#hook"]) {
      await expect.poll(async () => (await summary(page, sel)).total, { timeout: 4000, message: sel }).toBeGreaterThan(0);
      expect(await summary(page, sel)).toMatchObject({ loadingClass: true, busy: "true", inert: true });
    }
    await rt.update(page, { loading: false });
    for (const sel of ["#comp", "#cb", "#hook"]) {
      await expect.poll(async () => (await summary(page, sel)).overlays, { timeout: 4000, message: sel }).toBe(0);
      expect(await summary(page, sel)).toMatchObject({ loadingClass: false, busy: null, inert: false });
    }
  });

  test("StrictMode's double effect run leaves exactly one overlay", async ({ page }) => {
    await rt.mount(page, { loading: true });
    await expect.poll(async () => (await summary(page, "#comp")).total, { timeout: 4000 }).toBeGreaterThan(0);
    for (const sel of ["#comp", "#cb", "#hook"]) {
      expect((await summary(page, sel)).overlays, sel).toBe(1);
    }
  });

  test("toggling loading many times does not pile up overlays", async ({ page }) => {
    await rt.mount(page, { loading: true });
    for (let i = 0; i < 6; i++) {
      await rt.update(page, { loading: i % 2 === 1 });
      await page.waitForTimeout(60);
    }
    await rt.update(page, { loading: true });
    await expect.poll(async () => (await summary(page, "#comp")).total, { timeout: 4000 }).toBeGreaterThan(0);
    for (const sel of ["#comp", "#cb", "#hook"]) {
      expect((await summary(page, sel)).overlays, sel).toBe(1);
    }
  });

  test("changing an option while loading updates both the component and the hook", async ({ page }) => {
    await rt.mount(page, { loading: true, animation: "shimmer" });
    await expect.poll(async () => (await summary(page, "#hook")).animation, { timeout: 4000 }).toBe("shimmer");
    await rt.update(page, { animation: "pulse" });
    await expect.poll(async () => (await summary(page, "#comp")).animation, { timeout: 3000 }).toBe("pulse");
    // This is the one useSkeleton used to ignore.
    await expect.poll(async () => (await summary(page, "#hook")).animation, { timeout: 3000 }).toBe("pulse");
    await rt.update(page, { animation: "none" });
    await expect.poll(async () => (await summary(page, "#hook")).animation, { timeout: 3000 }).toBe("none");
  });

  test("forwards object refs and callback refs, and supports as=", async ({ page }) => {
    await rt.mount(page, { loading: false, as: "section" });
    await expect.poll(() => rt.refs(page), { timeout: 3000 }).toMatchObject({ object: true, callback: true });
    expect(await page.evaluate(() => document.getElementById("comp")!.tagName)).toBe("SECTION");
    expect(await page.evaluate(() => document.getElementById("cb")!.tagName)).toBe("DIV");
  });

  test("keeps the wrapper's own props", async ({ page }) => {
    await rt.mount(page, { loading: false });
    await expect.poll(async () => (await summary(page, "#comp")).rootClass, { timeout: 3000 }).toBe(true);
    expect(await page.evaluate(() => document.getElementById("comp") !== null && document.getElementById("cb") !== null)).toBe(true);
  });

  test("unmounting clears the refs and cleans up without errors", async ({ page }) => {
    await rt.mount(page, { loading: true });
    await expect.poll(async () => (await summary(page, "#comp")).total, { timeout: 4000 }).toBeGreaterThan(0);
    await rt.unmount(page);
    expect(await rt.refs(page)).toMatchObject({ objectCleared: true, callbackCleared: true });
    expect(await page.evaluate(() => document.getElementById("root")!.innerHTML)).toBe("");
    await page.waitForTimeout(400); // pending timers (capture, fade) must not throw after unmount
  });
});
}

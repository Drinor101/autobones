import { expect, test, type Page } from "@playwright/test";
import { openFixture, summary } from "./helpers";

const vt = (page: Page, code: string, arg?: unknown) => page.evaluate(new Function("a", `const vt = window.vt; ${code}`) as (a: unknown) => unknown, arg);

test.describe("Vue adapter", () => {
  let errors: string[];

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openFixture(page, "vue.html");
    await vt(page, "vt.mount()");
  });

  test.afterEach(() => {
    expect(errors, "no uncaught errors").toEqual([]);
  });

  const all = ["#v-comp", "#v-bool", "#v-obj"];

  test("<Skeleton> and v-skeleton (boolean and options forms) show bones while loading", async ({ page }) => {
    for (const sel of all) {
      await expect.poll(async () => (await summary(page, sel)).total, { timeout: 4000, message: sel }).toBeGreaterThan(0);
      expect(await summary(page, sel), sel).toMatchObject({ loadingClass: true, busy: "true", inert: true, overlays: 1 });
    }
  });

  test("they clear when loading ends, and come back when it starts again", async ({ page }) => {
    await vt(page, "vt.loading.value = false");
    for (const sel of all) {
      await expect.poll(async () => (await summary(page, sel)).overlays, { timeout: 4000, message: sel }).toBe(0);
      expect(await summary(page, sel), sel).toMatchObject({ loadingClass: false, busy: null, inert: false });
    }
    await vt(page, "vt.loading.value = true");
    for (const sel of all) {
      await expect.poll(async () => (await summary(page, sel)).total, { timeout: 4000, message: sel }).toBeGreaterThan(0);
      expect((await summary(page, sel)).overlays, sel).toBe(1);
    }
  });

  test("changing an option while loading updates the component and the options directive", async ({ page }) => {
    await expect.poll(async () => (await summary(page, "#v-comp")).total, { timeout: 4000 }).toBeGreaterThan(0);
    await vt(page, 'vt.animation.value = "pulse"');
    await expect.poll(async () => (await summary(page, "#v-comp")).animation, { timeout: 3000 }).toBe("pulse");
    await expect.poll(async () => (await summary(page, "#v-obj")).animation, { timeout: 3000 }).toBe("pulse");
    // The boolean form has no options to change.
    expect((await summary(page, "#v-bool")).animation).toBe("shimmer");
  });

  test("unmounting cleans up without errors", async ({ page }) => {
    await expect.poll(async () => (await summary(page, "#v-comp")).total, { timeout: 4000 }).toBeGreaterThan(0);
    await vt(page, "vt.unmount()");
    expect(await page.evaluate(() => document.getElementById("root")!.innerHTML)).toBe("");
    await page.waitForTimeout(400);
  });
});

test.describe("Svelte action", () => {
  let errors: string[];

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openFixture(page, "vue.html");
  });

  test.afterEach(() => {
    expect(errors, "no uncaught errors").toEqual([]);
  });

  test("works through the create, update and destroy lifecycle", async ({ page }) => {
    // Svelte calls the action with the node and its parameter, then update() when the parameter changes.
    await vt(page, "vt.svelteCreate(a)", { loading: true, animation: "shimmer", fade: 0 });
    expect(await summary(page, "#svelte-node")).toMatchObject({ overlays: 1, loadingClass: true, busy: "true", inert: true });
    expect((await summary(page, "#svelte-node")).total).toBeGreaterThan(0);

    await vt(page, "vt.svelteUpdate(a)", { loading: false, animation: "shimmer", fade: 0 });
    await expect.poll(async () => (await summary(page, "#svelte-node")).overlays, { timeout: 3000 }).toBe(0);

    await vt(page, "vt.svelteUpdate(a)", { loading: true, animation: "pulse", fade: 0 });
    await expect.poll(async () => (await summary(page, "#svelte-node")).animation, { timeout: 3000 }).toBe("pulse");
    expect((await summary(page, "#svelte-node")).overlays).toBe(1);

    await vt(page, "vt.svelteDestroy()");
    expect(await summary(page, "#svelte-node")).toMatchObject({ overlays: 0, rootClass: false, loadingClass: false, busy: null, inert: false });
  });

  test("a plain boolean parameter works too", async ({ page }) => {
    await vt(page, "vt.svelteCreate(a)", true);
    expect((await summary(page, "#svelte-node")).total).toBeGreaterThan(0);
    await vt(page, "vt.svelteUpdate(a)", false);
    await expect.poll(async () => (await summary(page, "#svelte-node")).overlays, { timeout: 3000 }).toBe(0);
  });
});

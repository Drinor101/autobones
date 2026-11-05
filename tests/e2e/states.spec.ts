import { expect, test } from "@playwright/test";
import { box, call, cardHtml, mount, openFixture, start, summary } from "./helpers";

// These tests are about time: delays, minimum durations and fades. Each one runs its whole sequence
// inside the page, so the waits and the library's own timers share one clock. Waiting from outside the
// browser would let a slow machine eat the margins and make the tests flaky.
type Probe = (selector: string) => Record<string, unknown>;

test.describe("loading states", () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page);
    await mount(page, box(cardHtml()));
  });

  test("delay: the content is hidden at once, but bones appear only after the delay", async ({ page }) => {
    const r = await page.evaluate(async () => {
      const w = window as any;
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const el = document.getElementById("box")!;
      w.ab.createSkeleton(el, { delay: 800 });
      await sleep(300);
      const early = (w.probe as Probe)("#box");
      const hidden = getComputedStyle(document.querySelector(".card")!).visibility;
      await sleep(1200);
      return { early, hidden, late: (w.probe as Probe)("#box") };
    });
    expect(r.early).toMatchObject({ overlays: 0, loadingClass: true, busy: "true", inert: true });
    expect(r.hidden).toBe("hidden");
    expect(r.late).toMatchObject({ overlays: 1, total: 10 });
  });

  test("delay: a load that finishes before the delay never shows a skeleton", async ({ page }) => {
    const r = await page.evaluate(async () => {
      const w = window as any;
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const el = document.getElementById("box")!;
      let overlaysAdded = 0;
      new MutationObserver((records) => {
        for (const rec of records) rec.addedNodes.forEach((n) => (n as HTMLElement).classList?.contains("ab-overlay") && overlaysAdded++);
      }).observe(el, { childList: true });
      const controller = w.ab.createSkeleton(el, { delay: 800 });
      await sleep(150);
      controller.setLoading(false); // the data arrived before the delay ran out
      await sleep(1200); // well past the original delay
      return { overlaysAdded, after: (w.probe as Probe)("#box") };
    });
    expect(r.overlaysAdded).toBe(0);
    expect(r.after).toMatchObject({ overlays: 0, loadingClass: false, busy: null, inert: false });
  });

  test("minDuration: bones stay at least that long once shown", async ({ page }) => {
    const r = await page.evaluate(async () => {
      const w = window as any;
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const controller = w.ab.createSkeleton(document.getElementById("box")!, { minDuration: 1000, fade: 0 });
      await sleep(100);
      controller.setLoading(false); // the data arrived early
      const flag = controller.loading;
      await sleep(300);
      const stillShown = (w.probe as Probe)("#box");
      await sleep(1200);
      return { flag, stillShown, done: (w.probe as Probe)("#box") };
    });
    expect(r.flag).toBe(false);
    expect(r.stillShown).toMatchObject({ overlays: 1, total: 10 });
    expect(r.done).toMatchObject({ overlays: 0, loadingClass: false, busy: null, inert: false });
  });

  test("restarting loading during minDuration stays loading", async ({ page }) => {
    const r = await page.evaluate(async () => {
      const w = window as any;
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const controller = w.ab.createSkeleton(document.getElementById("box")!, { minDuration: 900, fade: 0 });
      await sleep(100);
      controller.setLoading(false);
      await sleep(200);
      controller.setLoading(true); // loading again, before the minimum ran out
      await sleep(1200); // past the first deadline: it must NOT have stopped
      const during = { loading: controller.loading, probe: (w.probe as Probe)("#box") };
      controller.setLoading(false); // the minimum has passed, so it stops right away
      await sleep(100);
      return { during, after: (w.probe as Probe)("#box") };
    });
    expect(r.during.loading).toBe(true);
    expect(r.during.probe).toMatchObject({ overlays: 1, total: 10, loadingClass: true });
    expect(r.after).toMatchObject({ overlays: 0, loadingClass: false });
  });

  test("fade: the content shows through while the bones cross-fade out, then the overlay is removed", async ({ page }) => {
    const r = await page.evaluate(async () => {
      const w = window as any;
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const controller = w.ab.createSkeleton(document.getElementById("box")!, { fade: 800 });
      await sleep(100);
      controller.setLoading(false);
      await sleep(150);
      const during = {
        probe: (w.probe as Probe)("#box"),
        content: getComputedStyle(document.querySelector(".card")!).visibility,
        opacity: (document.querySelector("#box > .ab-overlay") as HTMLElement).style.opacity,
      };
      await sleep(1300);
      return { during, after: (w.probe as Probe)("#box") };
    });
    expect(r.during.probe).toMatchObject({ fading: true, overlays: 1, loadingClass: false, busy: null, inert: false });
    expect(r.during.content).toBe("visible");
    expect(r.during.opacity).toBe("0");
    expect(r.after).toMatchObject({ overlays: 0, fading: false });
  });

  test("fade is skipped for people who prefer reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await start(page, "#box", { fade: 800 });
    await call(page, "#box", "setLoading", false);
    expect(await summary(page)).toMatchObject({ overlays: 0, fading: false });
  });

  test("starting and stopping many times leaves nothing behind", async ({ page }) => {
    const r = await page.evaluate(async () => {
      const w = window as any;
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const controller = w.ab.createSkeleton(document.getElementById("box")!, { fade: 0 });
      for (let i = 0; i < 6; i++) {
        controller.setLoading(i % 2 === 1);
        await sleep(30);
      }
      controller.setLoading(false);
      await sleep(300);
      const settled = (w.probe as Probe)("#box");
      controller.setLoading(true); // and it still works afterwards
      return { settled, again: (w.probe as Probe)("#box") };
    });
    expect(r.settled).toMatchObject({ overlays: 0, loadingClass: false, busy: null, inert: false, minHeight: "" });
    expect(r.again).toMatchObject({ overlays: 1 });
  });
});

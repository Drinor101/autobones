import { expect, test, type Page } from "@playwright/test";
import { bones, box, call, cardHtml, mount, openFixture, start, summary } from "./helpers";

const LONG_BODY =
  "This is a much longer paragraph of body text. It wraps onto several lines when the card is narrow, and onto fewer lines when the card is wide enough to hold it.";

const stored = (page: Page, name: string) => page.evaluate((n) => localStorage.getItem("autobones:" + n), name);
const layouts = (page: Page) => page.evaluate(() => (window as any).ab.exportLayouts({ download: false }));

/** Renders the card for real, lets the library remember it, and waits until that has happened. */
async function remember(page: Page, name: string, width = 320, options: Record<string, unknown> = {}) {
  await mount(page, box(cardHtml(), width));
  await start(page, "#box", { name, fade: 0, ...options }, false);
  await expect.poll(async () => (await layouts(page)).layouts[name]?.length ?? 0, { timeout: 4000 }).toBeGreaterThan(0);
}

/** The component renders nothing while loading: the container is empty. */
const emptyTheBox = (page: Page) =>
  page.evaluate(() => {
    document.getElementById("box")!.innerHTML = "";
  });

test.describe("layout memory", () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page);
  });

  test("remembers the real layout, then draws it when there is nothing to measure", async ({ page }) => {
    await remember(page, "card");
    const realHeight = await page.evaluate(() => document.getElementById("box")!.getBoundingClientRect().height);
    await emptyTheBox(page);
    await call(page, "#box", "setLoading", true);
    const s = await summary(page);
    expect(s).toMatchObject({ text: 4, media: 4, box: 1, surface: 1, total: 10 });
    // The height is reserved, so the page does not jump when the content arrives.
    expect(parseFloat(s.minHeight)).toBeCloseTo(realHeight, 0);
    await call(page, "#box", "setLoading", false);
    await expect.poll(async () => (await summary(page)).minHeight, { timeout: 3000 }).toBe("");
  });

  test("scales the remembered bones to a new width", async ({ page }) => {
    await remember(page, "scaled");
    await emptyTheBox(page);
    await page.evaluate(() => {
      document.getElementById("box")!.style.width = "160px";
    });
    await call(page, "#box", "setLoading", true);
    const surface = (await bones(page)).find((b) => b.kind === "surface")!;
    expect(surface.w).toBeCloseTo(160, 0);
  });

  test("survives a page reload", async ({ page }) => {
    await remember(page, "reload");
    await page.reload();
    await page.waitForFunction(() => (window as any).ready === true);
    await mount(page, box("")); // a brand-new page view that renders nothing while loading
    await start(page, "#box", { name: "reload", fade: 0 });
    expect(await summary(page)).toMatchObject({ total: 10 });
  });

  test("never stores your text, only geometry and colors", async ({ page }) => {
    await remember(page, "private");
    const raw = (await stored(page, "private"))!;
    expect(raw).toBeTruthy();
    for (const text of ["Ada Park", "A card title", "Short body text", "Like", "Share", "4 min read"]) {
      expect(raw).not.toContain(text);
    }
    expect(JSON.parse(raw).bones).toHaveLength(10);
  });

  test("persist: false keeps it in memory but out of localStorage", async ({ page }) => {
    await remember(page, "volatile", 320, { persist: false });
    expect(await stored(page, "volatile")).toBeNull();
    await emptyTheBox(page);
    await call(page, "#box", "setLoading", true);
    expect((await summary(page)).total).toBe(10);
  });

  test("clearLayouts(name) forgets it", async ({ page }) => {
    await remember(page, "forgotten");
    expect(await stored(page, "forgotten")).not.toBeNull();
    // Stop the first controller before clearing. While it is alive and its content is on screen, its
    // second capture (one second after it was created) would legitimately record the card again.
    await call(page, "#box", "destroy");
    await page.evaluate(() => (window as any).ab.clearLayouts("forgotten"));
    expect(await stored(page, "forgotten")).toBeNull();
    await emptyTheBox(page);
    await start(page, "#box", { name: "forgotten", fade: 0 });
    expect((await summary(page)).total).toBe(0);
  });

  test("live content always wins over a remembered or shipped layout", async ({ page }) => {
    await page.evaluate(() =>
      (window as any).ab.registerLayouts({
        version: 1,
        layouts: { wins: [{ width: 320, height: 50, bones: [{ x: 0, y: 0, width: 10, height: 10, radius: "4px", kind: "text" }] }] },
      }),
    );
    await mount(page, box(cardHtml()));
    await start(page, "#box", { name: "wins", fade: 0 });
    expect((await summary(page)).total).toBe(10); // measured from the real content, not the 1-bone shipped layout
  });
});

test.describe("shipped layouts", () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page);
  });

  test("record at three widths, export, then a first-time visitor gets the right skeleton for each width", async ({ page }) => {
    // 1. In development: render the real card and resize through the breakpoints.
    await mount(page, box(cardHtml({ body: LONG_BODY }), 320));
    await page.evaluate(() => {
      (document.querySelector(".card") as HTMLElement).style.maxWidth = "none";
    });
    await start(page, "#box", { name: "ship", fade: 0 }, false);
    for (const width of [320, 480, 640]) {
      await page.evaluate((w) => {
        document.getElementById("box")!.style.width = w + "px";
      }, width);
      await page.waitForTimeout(1000); // the idle re-capture waits 400 ms after a resize
    }

    // 2. Export.
    const file = (await layouts(page)) as { version: number; layouts: Record<string, { width: number; height: number; bones: unknown[] }[]> };
    expect(file.version).toBe(1);
    const snaps = file.layouts.ship;
    expect(snaps.map((s) => Math.round(s.width))).toEqual([320, 480, 640]);
    expect(snaps[0].height).toBeGreaterThan(snaps[2].height); // narrower means more wrapped lines, so taller

    // 3. A brand-new visitor: nothing remembered, only the shipped file.
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => (window as any).ready === true);
    await page.evaluate((f) => (window as any).ab.registerLayouts(f), file);

    for (const [width, expected] of [
      [330, snaps[0]],
      [470, snaps[1]],
      [700, snaps[2]],
    ] as const) {
      await mount(page, box("", width));
      await start(page, "#box", { name: "ship", fade: 0 });
      const s = await summary(page);
      expect(s.total, `bones at ${width}px`).toBe(expected.bones.length);
      expect(parseFloat(s.minHeight), `height at ${width}px`).toBeCloseTo(expected.height, 0);
      await call(page, "#box", "destroy");
    }
  });

  test("exportLayouts() downloads autobones.layouts.json", async ({ page }) => {
    await remember(page, "download");
    const [download] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => (window as any).ab.exportLayouts())]);
    expect(download.suggestedFilename()).toBe("autobones.layouts.json");
    const fs = await import("node:fs/promises");
    const json = JSON.parse(await fs.readFile((await download.path())!, "utf8"));
    expect(json.version).toBe(1);
    expect(Object.keys(json.layouts)).toContain("download");
  });

  test("a layouts file from another version is ignored with a warning", async ({ page }) => {
    const warnings: string[] = [];
    page.on("console", (msg) => msg.type() === "warning" && warnings.push(msg.text()));
    await page.evaluate(() => (window as any).ab.registerLayouts({ version: 2, layouts: { future: [{ width: 1, height: 1, bones: [] }] } }));
    expect(warnings.join("\n")).toContain("Ignoring layouts file");
    expect(Object.keys((await layouts(page)).layouts)).not.toContain("future");
  });

  test("registerLayouts also accepts the file as a JSON string", async ({ page }) => {
    await page.evaluate(() =>
      (window as any).ab.registerLayouts(JSON.stringify({ version: 1, layouts: { fromString: [{ width: 100, height: 20, bones: [] }] } })),
    );
    expect(Object.keys((await layouts(page)).layouts)).toContain("fromString");
  });
});

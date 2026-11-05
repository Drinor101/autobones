import { expect, test, type Page } from "@playwright/test";
import { box, cardHtml, mount, openFixture, start, summary } from "./helpers";

type Scheme = "light" | "dark";

// The fixture card is white with a #c8cbe0 border in light mode, and #1a1d24 with a #2a2d34 border in dark mode.
const LIGHT_CARD = { background: "rgb(255, 255, 255)", border: "rgb(200, 203, 224)" };
const DARK_CARD = { background: "rgb(26, 29, 36)", border: "rgb(42, 45, 52)" };
// The library's own bone colors (--ab-base).
const LIGHT_BONE = "rgb(229, 231, 235)";
const DARK_BONE = "rgb(42, 45, 52)";

const snapshot = (page: Page, name: string) =>
  page.evaluate((n) => JSON.parse(localStorage.getItem("autobones:" + n) ?? "null"), name);

/** Renders the real card in one theme and waits until the library has remembered it. */
async function recordIn(page: Page, scheme: Scheme, name = "themed") {
  await page.emulateMedia({ colorScheme: scheme });
  await mount(page, box(cardHtml()));
  await start(page, "#box", { name, fade: 0 }, false);
  await expect.poll(() => snapshot(page, name), { timeout: 4000 }).not.toBeNull();
  await page.evaluate(() => (window as any).sk["#box"].destroy()); // stop it, so nothing records again
}

/** Shows the skeleton with nothing rendered, as the page looks while it waits for data. */
async function showFromMemory(page: Page, name = "themed") {
  await mount(page, box(""));
  await start(page, "#box", { name, fade: 0 });
  expect((await summary(page)).total).toBe(10);
}

const surface = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector("#box > .ab-overlay > [data-kind=surface]") as HTMLElement;
    const cs = getComputedStyle(el);
    return { background: cs.backgroundColor, border: cs.borderTopColor, shadow: cs.boxShadow };
  });

test.describe("a layout recorded in one theme, shown in another", () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page);
  });

  test("remembers which tone the page had, and keeps a theme-neutral twin of each surface", async ({ page }) => {
    await recordIn(page, "light");
    const light = await snapshot(page, "themed");
    expect(light.tone).toBe("light");
    expect(light.bones.find((b: { kind: string }) => b.kind === "surface").plain).toContain("var(--ab-base)");

    await recordIn(page, "dark", "themed-dark");
    expect((await snapshot(page, "themed-dark")).tone).toBe("dark");
  });

  test("same tone: draws the exact colors it recorded", async ({ page }) => {
    await recordIn(page, "light");
    await showFromMemory(page);
    expect(await surface(page)).toMatchObject({ background: LIGHT_CARD.background, border: LIGHT_CARD.border });

    await recordIn(page, "dark", "themed-dark");
    await showFromMemory(page, "themed-dark");
    expect(await surface(page)).toMatchObject({ background: DARK_CARD.background, border: DARK_CARD.border });
  });

  test("recorded in light, shown in dark: a neutral outline in the bone color, not a white card", async ({ page }) => {
    await recordIn(page, "light");
    await page.emulateMedia({ colorScheme: "dark" });
    await showFromMemory(page);
    const s = await surface(page);
    expect(s.background).toBe("rgba(0, 0, 0, 0)"); // transparent: the dark page shows through
    expect(s.border).toBe(DARK_BONE);
    expect(s.shadow).toBe("none");
  });

  test("recorded in dark, shown in light: a neutral outline in the bone color, not a dark card", async ({ page }) => {
    await recordIn(page, "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await showFromMemory(page);
    const s = await surface(page);
    expect(s.background).toBe("rgba(0, 0, 0, 0)");
    expect(s.border).toBe(LIGHT_BONE);
  });

  test("the bones themselves, and the card's shape, are unaffected", async ({ page }) => {
    await recordIn(page, "light");
    await page.emulateMedia({ colorScheme: "dark" });
    await showFromMemory(page);
    expect(await summary(page)).toMatchObject({ text: 4, media: 4, box: 1, surface: 1 });
    const radius = await page.evaluate(() => getComputedStyle(document.querySelector("#box > .ab-overlay > [data-kind=surface]")!).borderTopLeftRadius);
    expect(radius).toBe("14px"); // the rounded corners survive
  });

  test("a shipped file from a different theme works the same way for a first-time visitor", async ({ page }) => {
    await recordIn(page, "light");
    const file = { version: 1, layouts: { themed: [await snapshot(page, "themed")] } };
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => (window as any).ready === true);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.evaluate((f) => (window as any).ab.registerLayouts(f), file);
    await showFromMemory(page);
    expect((await surface(page)).background).toBe("rgba(0, 0, 0, 0)");
  });

  test("a layouts file from before tones existed is drawn exactly as recorded", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.evaluate(() =>
      (window as any).ab.registerLayouts({
        version: 1,
        layouts: {
          legacy: [
            {
              width: 320,
              height: 60,
              bones: [{ x: 0, y: 0, width: 320, height: 60, radius: "8px", kind: "surface", style: "background:rgb(255, 0, 0);border:1px solid rgb(0, 0, 255)" }],
            },
          ],
        },
      }),
    );
    await mount(page, box(""));
    await start(page, "#box", { name: "legacy", fade: 0 });
    expect((await surface(page)).background).toBe("rgb(255, 0, 0)");
  });

  test("a tone change with an old surface that has no neutral twin still gets a sensible outline", async ({ page }) => {
    await page.evaluate(() =>
      (window as any).ab.registerLayouts({
        version: 1,
        layouts: {
          halfold: [
            {
              width: 320,
              height: 60,
              tone: "dark",
              bones: [{ x: 0, y: 0, width: 320, height: 60, radius: "8px", kind: "surface", style: "background:rgb(10, 10, 10);border:1px solid rgb(40, 40, 40)" }],
            },
          ],
        },
      }),
    );
    await page.emulateMedia({ colorScheme: "light" });
    await mount(page, box(""));
    await start(page, "#box", { name: "halfold", fade: 0 });
    const s = await surface(page);
    expect(s.background).toBe("rgba(0, 0, 0, 0)");
    expect(s.border).toBe(LIGHT_BONE);
  });
});

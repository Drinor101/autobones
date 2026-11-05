import { expect, test } from "@playwright/test";
import { bones, box, cardHtml, call, mount, openFixture, px, rectOf, start, summary } from "./helpers";

test.describe("measuring and drawing", () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page);
  });

  test("draws a bone for every text line, image, button and dot, and keeps the card surface", async ({ page }) => {
    await mount(page, box(cardHtml()));
    await start(page, "#box");
    const s = await summary(page);
    expect(s).toMatchObject({ text: 4, media: 4, box: 1, surface: 1, total: 10, overlays: 1 });
  });

  test("hides the content and marks the container busy, with bones hidden from screen readers", async ({ page }) => {
    await mount(page, box(cardHtml()));
    await start(page, "#box");
    const s = await summary(page);
    expect(s).toMatchObject({ rootClass: true, loadingClass: true, busy: "true", inert: true, overlayHidden: "true" });
    expect(await page.evaluate(() => getComputedStyle(document.querySelector(".card")!).visibility)).toBe("hidden");
  });

  test("bones sit exactly on the real buttons and images", async ({ page }) => {
    await mount(page, box(cardHtml()));
    const real = [...(await rectOf(page, ".cover")), ...(await rectOf(page, ".actions button"))];
    expect(real).toHaveLength(3);
    await start(page, "#box");
    const media = (await bones(page)).filter((b) => b.kind === "media");
    for (const r of real) {
      const match = media.find((b) => Math.abs(b.x - r.x) < 1.5 && Math.abs(b.y - r.y) < 1.5 && Math.abs(b.w - r.w) < 1.5 && Math.abs(b.h - r.h) < 1.5);
      expect(match, `no bone for the element at ${JSON.stringify(r)}`).toBeTruthy();
    }
  });

  test("makes one text bone per rendered line", async ({ page }) => {
    await mount(page, box(`<p style="white-space:pre-line;margin:0">first line\nsecond line\nthird line</p>`));
    await start(page, "#box");
    const s = await summary(page);
    expect(s).toMatchObject({ text: 3, total: 3 });
  });

  test("merges text on the same line, like '<b>1,204</b> followers'", async ({ page }) => {
    await mount(page, box(`<p style="margin:0"><b>1,204</b> followers</p>`));
    await start(page, "#box");
    expect((await summary(page)).text).toBe(1);
  });

  test("an empty container with nothing remembered draws no bones", async ({ page }) => {
    await mount(page, box(""));
    await start(page, "#box", { name: "never-seen-before" });
    const s = await summary(page);
    expect(s.total).toBe(0);
  });

  test("data-bone makes a solid bone and data-bone-ignore skips an element", async ({ page }) => {
    await mount(
      page,
      box(`<div data-bone style="width:100px;height:50px"><span>inside</span></div><div data-bone-ignore>ignored text</div><p style="margin:0">kept</p>`),
    );
    await start(page, "#box");
    const list = await bones(page);
    const solid = list.filter((b) => b.kind === "media");
    expect(solid).toHaveLength(1);
    expect(Math.round(solid[0].w)).toBe(100);
    expect(Math.round(solid[0].h)).toBe(50);
    expect(list.filter((b) => b.kind === "text")).toHaveLength(1);
  });

  test("a bone in the corner of a rounded, overflow:hidden card is rounded like the card", async ({ page }) => {
    await mount(page, box(cardHtml()));
    await start(page, "#box");
    const cover = (await bones(page)).find((b) => b.kind === "media" && b.h === 120);
    expect(cover, "cover bone").toBeTruthy();
    const [tl, tr, br, bl] = cover!.corners.map(px);
    // The card has a 14px radius and a 1px border, so its clip radius is 13px.
    expect(tl).toBe(13);
    expect(tr).toBe(13);
    // The bottom corners of the cover are not in a corner of the card.
    expect(br).toBeLessThan(13);
    expect(bl).toBeLessThan(13);
  });

  test("an image inside a circular frame becomes a circle", async ({ page }) => {
    await mount(page, box(cardHtml()));
    await start(page, "#box");
    const avatar = (await bones(page)).find((b) => b.kind === "media" && Math.round(b.w) === 40 && Math.round(b.h) === 40);
    expect(avatar, "avatar bone").toBeTruthy();
    expect(avatar!.corners.map(px)).toEqual([20, 20, 20, 20]);
  });

  test("an empty colored element with a round shape keeps it", async ({ page }) => {
    await mount(page, box(cardHtml()));
    await start(page, "#box");
    const dot = (await bones(page)).find((b) => b.kind === "box");
    expect(dot, "dot bone").toBeTruthy();
    expect(Math.round(dot!.w)).toBe(12);
    // A fully round box keeps a 50% radius, which computes to half its width.
    expect(dot!.corners.every((c) => c === "50%" || px(c) === 6)).toBe(true);
  });

  test("follows the layout: bones change when the container is resized", async ({ page }) => {
    await mount(page, box(cardHtml()));
    await start(page, "#box");
    const widthOfCard = async () => (await bones(page)).find((b) => b.kind === "surface")!.w;
    expect(await widthOfCard()).toBeGreaterThan(300);
    await page.evaluate(() => {
      document.getElementById("box")!.style.width = "200px";
    });
    await expect.poll(widthOfCard, { timeout: 3000 }).toBeLessThan(210);
  });

  test("follows the content: a new element gets bones", async ({ page }) => {
    await mount(page, box(`<p style="margin:0">one</p>`));
    await start(page, "#box");
    expect((await summary(page)).text).toBe(1);
    await page.evaluate(() => {
      const p = document.createElement("p");
      p.textContent = "two";
      document.getElementById("box")!.appendChild(p);
    });
    await expect.poll(async () => (await summary(page)).text, { timeout: 3000 }).toBe(2);
  });

  test("the bone count stays stable (no re-measuring loop)", async ({ page }) => {
    await mount(page, box(cardHtml()));
    await start(page, "#box");
    const counts: number[] = [];
    for (let i = 0; i < 6; i++) {
      counts.push((await summary(page)).total);
      await page.waitForTimeout(250);
    }
    expect(new Set(counts)).toEqual(new Set([10]));
    // And the DOM is quiet: nothing is being rewritten.
    const mutations = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let n = 0;
          const observer = new MutationObserver((records) => (n += records.length));
          observer.observe(document.getElementById("box")!, { childList: true, subtree: true, attributes: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(n);
          }, 1000);
        }),
    );
    expect(mutations).toBeLessThanOrEqual(2);
  });

  test("setOptions changes the animation while loading", async ({ page }) => {
    await mount(page, box(cardHtml()));
    await start(page, "#box", { animation: "shimmer" });
    expect((await summary(page)).animation).toBe("shimmer");
    await call(page, "#box", "setOptions", { animation: "pulse" });
    expect((await summary(page)).animation).toBe("pulse");
  });

  test("destroy() leaves the element exactly as it was", async ({ page }) => {
    await mount(page, box(cardHtml()));
    await start(page, "#box");
    await call(page, "#box", "destroy");
    const s = await summary(page);
    expect(s).toMatchObject({ overlays: 0, rootClass: false, loadingClass: false, busy: null, inert: false, animation: null });
  });
});

test.describe("looks", () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page);
    await mount(page, box(cardHtml()));
  });

  const boneStyle = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const bone = document.querySelector("#box .ab-bone")!;
      const cs = getComputedStyle(bone);
      return { animationName: cs.animationName, backgroundColor: cs.backgroundColor, base: getComputedStyle(document.getElementById("box")!).getPropertyValue("--ab-base").trim() };
    });

  test("shimmer by default, pulse and none on request", async ({ page }) => {
    await start(page, "#box");
    expect((await boneStyle(page)).animationName).toBe("ab-shimmer");
    await call(page, "#box", "setOptions", { animation: "pulse" });
    expect((await boneStyle(page)).animationName).toBe("ab-pulse");
    await call(page, "#box", "setOptions", { animation: "none" });
    expect((await boneStyle(page)).animationName).toBe("none");
  });

  test("uses the dark theme colors in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await start(page, "#box");
    const light = (await boneStyle(page)).base;
    await page.emulateMedia({ colorScheme: "dark" });
    const dark = (await boneStyle(page)).base;
    expect(light).toBe("#e5e7eb");
    expect(dark).toBe("#2a2d34");
  });

  test("turns the animation off for people who prefer reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await start(page, "#box");
    expect((await boneStyle(page)).animationName).toBe("none");
  });

  test("baseColor changes the bone color", async ({ page }) => {
    await start(page, "#box", { baseColor: "rgb(10, 20, 30)", animation: "none" });
    expect((await boneStyle(page)).backgroundColor).toBe("rgb(10, 20, 30)");
  });
});

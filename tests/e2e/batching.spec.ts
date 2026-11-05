import { expect, test } from "@playwright/test";
import { box, cardHtml, mount, openFixture, start, summary } from "./helpers";

// A page with a list of cards, each wrapped in its own skeleton, is the common case. Redrawing them one at
// a time makes each measurement pay for the previous skeleton's changes, which gets slow with hundreds of cards
// (a resize froze a 500-card page for over two seconds). These tests check the structure that prevents that,
// rather than timing it, because timings vary too much between machines to make a reliable test.

const list = (count: number) =>
  `<div id="list" style="width:360px">${Array.from({ length: count }, () => `<div class="item">${cardHtml()}</div>`).join("")}</div>`;

test.describe("many skeletons on one page", () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page);
  });

  test("a resize redraws them together: every overlay comes off, then everything is measured, then they go back", async ({ page }) => {
    await mount(page, list(40));
    const sequence = await page.evaluate(async () => {
      const w = window as any;
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      document.querySelectorAll(".item").forEach((el) => w.ab.createSkeleton(el, { fade: 0 }));
      await sleep(150); // let the observers' first callbacks pass

      // D = an overlay taken off, R = a measurement, A = an overlay put back.
      const log: string[] = [];
      const isOverlay = (n: any) => !!n?.classList?.contains("ab-overlay");
      const remove = Element.prototype.remove;
      const append = Node.prototype.appendChild;
      const measure = Element.prototype.getBoundingClientRect;
      Element.prototype.remove = function (this: Element) {
        if (isOverlay(this)) log.push("D");
        return remove.call(this);
      };
      Node.prototype.appendChild = function <T extends Node>(this: Node, node: T): T {
        if (isOverlay(node)) log.push("A");
        return append.call(this, node) as T;
      };
      Element.prototype.getBoundingClientRect = function (this: Element) {
        log.push("R");
        return measure.call(this);
      };
      try {
        (document.getElementById("list") as HTMLElement).style.width = "300px";
        await sleep(500);
      } finally {
        Element.prototype.remove = remove;
        Node.prototype.appendChild = append;
        Element.prototype.getBoundingClientRect = measure;
      }
      return log.join("");
    });
    // Squash runs of the same letter. One batched redraw is "DRA". One redraw per skeleton would be "DRA" 40 times.
    const squashed = sequence.replace(/(.)\1+/g, "$1");
    expect(squashed).toMatch(/^(DRA)+$/);
    expect(squashed.length / 3, "number of separate redraw passes").toBeLessThanOrEqual(3);
    expect(sequence.split("A").length - 1, "all 40 were redrawn").toBeGreaterThanOrEqual(40);
  });

  test("bones that did not change are not rebuilt", async ({ page }) => {
    await mount(page, box(cardHtml()));
    await start(page, "#box");
    await page.evaluate(() => {
      document.querySelectorAll("#box > .ab-overlay > *").forEach((el, i) => ((el as any).__tag = i));
    });
    const survivors = () =>
      page.evaluate(() => Array.from(document.querySelectorAll("#box > .ab-overlay > *")).filter((el, i) => (el as any).__tag === i).length);
    const total = (await summary(page)).total;
    expect(total).toBe(10);
    expect(await survivors()).toBe(10);

    // Something changes that does not move anything: the bones must be left exactly as they are.
    await page.evaluate(() => document.querySelector(".name")!.setAttribute("class", "name highlighted"));
    await page.evaluate(() => (window as any).sk["#box"].update());
    await page.waitForTimeout(300);
    expect(await survivors()).toBe(10);

    // Something moves: now they are redrawn.
    await page.evaluate(() => {
      document.getElementById("box")!.style.width = "200px";
    });
    await expect.poll(survivors, { timeout: 3000 }).toBe(0);
    expect((await summary(page)).total).toBe(10);
  });

  test("the overlay stays on the page, as the last child, through redraws", async ({ page }) => {
    await mount(page, box(cardHtml()));
    await start(page, "#box");
    await page.evaluate(() => {
      document.getElementById("box")!.style.width = "250px";
    });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.getElementById("box")!.lastElementChild!.classList.contains("ab-overlay"))).toBe(true);
    expect((await summary(page)).overlays).toBe(1);
  });

  test("one skeleton that cannot be measured does not leave the others undrawn", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
    await mount(page, list(3));
    const ids = await page.evaluate(async () => {
      const w = window as any;
      const items = Array.from(document.querySelectorAll<HTMLElement>(".item"));
      items.forEach((el, i) => {
        el.id = "item" + i;
        w.sk["#item" + i] = w.ab.createSkeleton(el, { fade: 0 });
      });
      await new Promise((resolve) => setTimeout(resolve, 150));
      // An invalid selector makes the next measurement throw for this one skeleton only.
      w.sk["#item0"].setOptions({ boneSelector: "[" });
      (document.getElementById("list") as HTMLElement).style.width = "280px";
      await new Promise((resolve) => setTimeout(resolve, 500));
      return items.map((el) => {
        const surface = el.querySelector(":scope > .ab-overlay > [data-kind=surface]") as HTMLElement | null;
        return { id: el.id, overlayAttached: !!el.querySelector(":scope > .ab-overlay"), surfaceWidth: surface ? parseFloat(surface.style.width) : null };
      });
    });
    // The two healthy ones were redrawn at the new width. The broken one kept its old bones, still attached.
    expect(ids[1].surfaceWidth).toBeLessThanOrEqual(280);
    expect(ids[2].surfaceWidth).toBeLessThanOrEqual(280);
    expect(ids[0].overlayAttached).toBe(true);
    expect(ids[0].surfaceWidth).toBeGreaterThan(300);
    expect(errors.length, "the failure is reported").toBeGreaterThan(0);
  });
});

import { expect, test, type Page } from "@playwright/test";

/* The hero's caption bands are paced in scroll distance. Two checks keep that honest:
   1. The flick test: real wheel flicks of 120, 240 and 360px. No beat may be skipped at 360px,
      and each beat must stay fully readable for its agreed number of normal (120px) flicks.
   2. The worst-frame legibility audit: hide the glyphs, photograph what sits behind them several
      times while the gold moves, and require 3.5:1 contrast against the lightest pixel found.   */

test.use({ viewport: { width: 1440, height: 900 } });

const beats = ["headline", "grain", "light", "notes", "begin"] as const;
type Beat = (typeof beats)[number];
// Agreed with Saad for a ~2,000px hero (design package, decision A): line one about five flicks, the rest three or more.
const minimumRun: Record<Beat, number> = { headline: 3, grain: 5, light: 3, notes: 3, begin: 3 };

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("#entrance")).toHaveAttribute("data-scroll-end", /\d/);
  await page.waitForTimeout(900);
}

/** How fully each beat can be read right now: the least visible glyph group, times every ancestor's opacity, if on screen. */
const read = (page: Page) => page.locator("#entrance").evaluate((hero) => {
  const header = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
  const shown = (element: Element | null) => {
    if (!element) return 0;
    const box = element.getBoundingClientRect();
    if (box.top < header || box.bottom > innerHeight) return 0;
    let opacity = 1;
    for (let node: Element | null = element; node && node !== hero.parentElement; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    return opacity;
  };
  const least = (selector: string) => Math.min(...Array.from(hero.querySelectorAll(selector), shown));
  return {
    headline: shown(hero.querySelector(".assembly__copy")),
    grain: least("[data-caption='story'] > .assembly__line:first-child .assembly__char"),
    light: shown(hero.querySelector(".assembly__sharp")),
    notes: least(".assembly__notes li"),
    begin: least(".assembly__band--begin .assembly__word"),
  } satisfies Record<Beat, number>;
});

/** Wait until the smooth scroll has come to rest, then a beat more for the scene to catch up. */
async function settle(page: Page) {
  let last = -1;
  for (let i = 0; i < 30; i += 1) {
    const now = await page.evaluate(() => scrollY);
    if (now === last) break;
    last = now;
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(450);
}

for (const step of [120, 240, 360]) {
  test(`hero captions survive ${step}px flicks`, async ({ page }, testInfo) => {
    test.setTimeout(150_000);
    await ready(page);
    const end = await page.locator("#entrance").evaluate((element) => Number((element as HTMLElement).dataset.scrollEnd));
    await page.mouse.move(720, 450);
    const log: { y: number; beats: Record<Beat, number> }[] = [];
    // Run past the end of the pin: the last line stays on screen while the frame scrolls away.
    while (true) {
      const y = await page.evaluate(() => scrollY);
      log.push({ y, beats: await read(page) });
      if (y > end + 700) break;
      await page.mouse.wheel(0, step);
      await settle(page);
    }
    const runs = Object.fromEntries(beats.map((beat) => {
      let best = 0, current = 0;
      for (const sample of log) { current = sample.beats[beat] >= .98 ? current + 1 : 0; best = Math.max(best, current); }
      return [beat, best];
    })) as Record<Beat, number>;
    console.log(`flick ${step}px: ${JSON.stringify(runs)}`);
    await testInfo.attach(`flick-${step}`, { body: JSON.stringify({ runs, log }, null, 2), contentType: "application/json" });
    for (const beat of beats) {
      expect(runs[beat], `${beat} must be fully readable at least once at ${step}px`).toBeGreaterThanOrEqual(1);
      if (step === 120) expect(runs[beat], `${beat} readable run at 120px`).toBeGreaterThanOrEqual(minimumRun[beat]);
    }
  });
}

test("every hero caption keeps 3.5:1 against its lightest background pixel", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await ready(page);
  const range = await page.locator("#entrance").evaluate((element) => [Number((element as HTMLElement).dataset.scrollStart), Number((element as HTMLElement).dataset.scrollEnd)]);
  await page.addStyleTag({ content: ".assembly__copy h1, .assembly__intro, .assembly__line, .assembly__notes strong, .assembly__notes span { visibility: hidden !important; }" });
  // Text colour per zone: the darkest colour each glyph can take (the headline's gradient ends in #dcc08a).
  const zones: { beat: string; at: number; selector: string; text: [number, number, number] }[] = [
    { beat: "headline", at: .02, selector: ".assembly__copy h1", text: [220, 192, 138] },
    { beat: "intro", at: .02, selector: ".assembly__intro", text: [185, 178, 167] },
    { beat: "grain", at: .28, selector: "[data-caption='story'] > .assembly__line:first-child", text: [246, 241, 232] },
    { beat: "grain and light", at: .5, selector: "[data-caption='story']", text: [246, 241, 232] },
    { beat: "note titles", at: .76, selector: ".assembly__notes strong", text: [232, 213, 166] },
    { beat: "note text", at: .76, selector: ".assembly__notes span", text: [185, 178, 167] },
    { beat: "begin", at: .97, selector: ".assembly__band--begin .assembly__line", text: [246, 241, 232] },
  ];
  const luminance = ([r, g, b]: number[]) => { const c = [r, g, b].map((v) => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const report: { beat: string; ratio: number; lightest: number[] }[] = [];
  for (const zone of zones) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), range[0] + (range[1] - range[0]) * zone.at);
    await page.waitForTimeout(1200);
    // The text zone is each line of glyphs (not the whole element box), skipping screen-reader copies.
    const boxes = await page.locator("#entrance").locator(zone.selector).evaluateAll((elements) => {
      const lines = new Map<string, { x: number; y: number; right: number; bottom: number }>();
      for (const element of elements) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim() || node.parentElement?.closest(".sr-only")) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of Array.from(range.getClientRects())) {
            if (rect.width < 2 || rect.height < 2) continue;
            const key = `${Math.round(rect.top)}`;
            const line = lines.get(key);
            if (line) { line.x = Math.min(line.x, rect.left); line.right = Math.max(line.right, rect.right); line.bottom = Math.max(line.bottom, rect.bottom); }
            else lines.set(key, { x: rect.left, y: rect.top, right: rect.right, bottom: rect.bottom });
          }
        }
      }
      return Array.from(lines.values(), (line) => ({ x: Math.max(0, line.x), y: Math.max(0, line.y), width: line.right - line.x, height: line.bottom - line.y }));
    });
    expect(boxes.length, `${zone.beat} has text to audit`).toBeGreaterThan(0);
    let lightest = [0, 0, 0], worst = 0;
    for (let frame = 0; frame < 6; frame += 1) {
      for (const box of boxes) {
        const png = await page.screenshot({ clip: box });
        const pixel = await page.evaluate(async (data) => {
          const image = new Image();
          image.src = `data:image/png;base64,${data}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          const { data: rgba } = context.getImageData(0, 0, canvas.width, canvas.height);
          let best = [0, 0, 0], light = -1;
          for (let i = 0; i < rgba.length; i += 4) { const value = rgba[i] * .2126 + rgba[i + 1] * .7152 + rgba[i + 2] * .0722; if (value > light) { light = value; best = [rgba[i], rgba[i + 1], rgba[i + 2]]; } }
          return best;
        }, png.toString("base64"));
        const value = luminance(pixel);
        if (value > worst) { worst = value; lightest = pixel; }
      }
      await page.waitForTimeout(300);
    }
    report.push({ beat: zone.beat, ratio: Number(((luminance(zone.text) + .05) / (worst + .05)).toFixed(2)), lightest });
  }
  console.log(report.map((entry) => `${entry.beat} ${entry.ratio}:1`).join(" | "));
  await testInfo.attach("hero-legibility", { body: JSON.stringify(report, null, 2), contentType: "application/json" });
  for (const entry of report) expect(entry.ratio, `${entry.beat}: lightest background ${entry.lightest.join(",")}`).toBeGreaterThanOrEqual(3.5);
});

test("captions follow the reduced-motion setting in both directions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.locator("#entrance");
  await expect(page.locator("main")).toHaveAttribute("data-motion-state", "reduced");
  await expect(hero.locator(".assembly__bands")).toBeHidden();
  await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(hero).toHaveAttribute("data-scrub", "desktop");
  await expect(hero).toHaveAttribute("data-scroll-end", /\d/);
  await hero.evaluate((element) => { const { scrollStart, scrollEnd } = (element as HTMLElement).dataset; window.scrollTo({ top: Number(scrollStart) + (Number(scrollEnd) - Number(scrollStart)) * .45, behavior: "instant" }); });
  await expect(hero.locator("[data-caption='story']")).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(hero).not.toHaveAttribute("data-scrub", /./);
  await expect(hero.locator(".assembly__bands")).toBeHidden();
});

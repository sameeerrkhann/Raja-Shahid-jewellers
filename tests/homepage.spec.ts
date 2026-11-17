import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

const scenes = ["entrance", "craft", "bridal", "vault", "auria", "gold"];
const screenshotFolder = "artifacts/phase03/final";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator(".cinematic-home")).toHaveAttribute("data-motion-state", /desktop|mobile|reduced|fallback/);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-entrance-line]").first()).toHaveCSS("opacity", "1");
}

async function scene(page: Page, id: string) {
  await page.locator(`#${id}`).evaluate((element) => {
    const start = (element as HTMLElement).dataset.scrollStart;
    const header = document.querySelector(".site-header")!.getBoundingClientRect().height;
    window.scrollTo({ top: start ? Number(start) + 1 : element.getBoundingClientRect().top + scrollY - header, behavior: "instant" });
  });
  await page.waitForTimeout(700); // allow bounded scrub/reveal to settle before a screenshot
}

test("homepage has six honest connected scenes and proper metadata", async ({ page, request }) => {
  await ready(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle("Raja Shahid Jewellers — Beyond the Moment");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Beyond the moment.");
  await expect(page.locator("[data-scene]")).toHaveCount(7);
  await expect(page.getByText("Illustrative rate preview · Not live")).toBeVisible();
  await expect(page.getByText(/Hand-authored illustration → reference photograph/)).toBeVisible();
  expect((await request.get("/admin")).status()).toBe(404);
  expect((await request.get("/designs")).status()).toBe(200);
  expect((await request.get("/ai-atelier")).status()).toBe(404);
  expect((await request.get("/")).headers()["x-robots-tag"]).toContain("noindex");
  const invalid = await page.locator('a[href^="#"], a[href^="/#"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")!.split("#")[1]).filter((id) => !document.getElementById(id)));
  expect(invalid).toEqual([]);
});

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`homepage layout and photographs at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await ready(page);
    await mkdir(screenshotFolder, { recursive: true });
    // Decode every responsive source explicitly, including gallery images initially offscreen.
    for (const image of await page.locator("main img").all()) await image.evaluate(async (element: HTMLImageElement) => { element.loading = "eager"; await element.decode(); });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `${screenshotFolder}/hero-${width}.png` });
    for (const id of scenes.slice(1)) {
      await scene(page, id);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(page.locator(`#${id} h2`)).toBeVisible();
      expect(await page.locator(".site-header").evaluate((element) => Math.abs(element.getBoundingClientRect().top) < 2)).toBe(true);
      if (width === 390 || width === 1440) await page.screenshot({ path: `${screenshotFolder}/${id}-${width}.png` });
    }
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await page.screenshot({ path: `${screenshotFolder}/footer-${width}.png` });
    await expect(page.getByRole("link", { name: "Font notices" })).toBeVisible();
    if (width < 1024) await expect(page.locator(".pin-spacer")).toHaveCount(0);
  });
}

test("four bounded pins (showcase, worn story, craft, vault) and horizontal gallery controls", async ({ page }) => {
  await ready(page);
  await expect(page.locator("main")).toHaveAttribute("data-motion-state", "desktop");
  await expect(page.locator(".pin-spacer")).toHaveCount(4);
  await expect(page.locator("#vault")).toHaveAttribute("data-scroll-start", /\d/);
  const travel = await page.locator("[data-pin-travel]").evaluateAll((elements) => elements.reduce((total, element) => total + Number((element as HTMLElement).dataset.pinTravel), 0));
  expect(travel).toBeLessThanOrEqual(1802);
  await scene(page, "vault");
  const x = () => page.locator("[data-vault-track]").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  const before = await x();
  await page.getByRole("button", { name: "Next collection", exact: true }).click();
  await expect.poll(x).toBeLessThan(before - 100);
  await page.screenshot({ path: `${screenshotFolder}/vault-horizontal-1440.png` });
  await page.getByRole("button", { name: "Previous collection", exact: true }).click();
  await expect.poll(x).toBeGreaterThan(before - 20);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("offscreen category focus remains visible and opens an honest study", async ({ page }) => {
  await ready(page);
  await expect(page.locator("#vault")).toHaveAttribute("data-scroll-start", /\d/);
  const last = page.locator(".vault-card__button").last();
  await last.focus();
  await expect.poll(() => last.evaluate((element) => { const r = element.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })).toBe(true);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Men’s Jewellery — a direction to explore" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/clearly labelled synthetic samples/)).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Browse Men’s Jewellery sample designs" })).toHaveAttribute("href", "/designs?category=mens");
  await page.keyboard.press("Escape");
  await expect(last).toBeFocused();
});

test("mobile navigation and native horizontal gallery", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("navigation", { name: "Homepage chapters" }).getByRole("link", { name: "Category directions" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page).toHaveURL(/#vault$/);
  const viewport = page.locator("[data-vault-viewport]");
  await page.getByRole("button", { name: "Next collection", exact: true }).click();
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100);
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
});

test("future AURIA and enquiry CTAs explain availability without submissions", async ({ page }) => {
  const methods: string[] = [];
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { methods.push(request.method()); if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) external.push(request.url()); });
  await ready(page);
  for (const [label, title] of [["Design with AURIA", "AURIA, coming into focus"], ["Plan a private visit", "A visit, thoughtfully planned"], ["A jewellery enquiry", "Begin with a conversation"]]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("dialog", { name: title })).toBeVisible();
    await page.keyboard.press("Escape");
  }
  expect(methods.every((method) => method === "GET")).toBe(true);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("OS and site reduced-motion preferences remove pins and retain all categories", async ({ page }) => {
  await ready(page);
  await expect(page.locator(".pin-spacer")).toHaveCount(4);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("main")).toHaveAttribute("data-motion-state", "reduced");
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await expect(page.locator("[data-vault-track]")).toHaveCSS("transform", "none");
  await expect(page.locator(".vault-card")).toHaveCount(6);
  await page.getByRole("checkbox", { name: "Reduce motion", exact: true }).check();
  await page.getByRole("checkbox", { name: "Reduce motion", exact: true }).uncheck();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".pin-spacer")).toHaveCount(4);
  await page.getByRole("checkbox", { name: "Reduce motion", exact: true }).check();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
});

test("resize and short landscape clean up pins without duplicates", async ({ page }) => {
  await ready(page);
  await expect(page.locator(".pin-spacer")).toHaveCount(4);
  for (const [width, height] of [[390, 844], [1024, 600], [1440, 1000]]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator(".pin-spacer")).toHaveCount(width === 1440 ? 4 : 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test("client navigation removes homepage motion and restores it on return", async ({ page }) => {
  await ready(page);
  await expect(page.locator(".pin-spacer")).toHaveCount(4);
  await page.evaluate(() => { document.documentElement.dataset.routeSentinel = "same-document"; });
  await page.getByRole("link", { name: "Design preview", exact: true }).click();
  await expect(page).toHaveURL(/\/design-preview$/);
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-route-sentinel", "same-document");
  await page.getByRole("link", { name: "Raja Shahid JEWELLERS", exact: true }).click();
  await expect(page).toHaveURL(/\/#top$/);
  await expect(page.locator(".pin-spacer")).toHaveCount(4);
  await expect(page.locator("html")).not.toHaveAttribute("data-reduce-motion");
});

test("no-JavaScript story and native links remain readable", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3100/");
    await expect(page.locator("[data-scene]")).toHaveCount(7);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    await page.getByRole("link", { name: "Enter the Design Vault" }).click();
    await expect(page).toHaveURL(/#vault$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `${screenshotFolder}/no-js-mobile.png`, fullPage: true });
  } finally { await context.close(); }
});

test("missing hero media becomes an honest designed fallback", async ({ page }) => {
  // The showcase's lead design is the hero media; its failure must disable pins and show a designed fallback.
  await page.route("**/images/catalogue/design-001*.webp", (route) => route.fulfill({ status: 404, body: "Test image unavailable" }));
  await ready(page);
  await expect(page.locator("main")).toHaveAttribute("data-motion-state", "fallback");
  await expect(page.locator(".home-hero [data-media-failed]")).toBeVisible();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Enter the Design Vault" })).toBeVisible();
  await page.screenshot({ path: `${screenshotFolder}/missing-media.png` });
});

for (const width of [390, 1440]) {
  test(`homepage accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await ready(page);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
    await page.getByRole("button", { name: "Design with AURIA", exact: true }).click();
    const dialogResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(dialogResults.violations).toEqual([]);
  });
}

test("scrubbed entrance and labelled sketch/reference reveal change with scroll", async ({ page }) => {
  await ready(page);
  const scale = () => page.locator("[data-hero-visual]").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
  const before = await scale();
  await page.evaluate(() => window.scrollTo({ top: 450, behavior: "instant" }));
  await expect.poll(scale).toBeGreaterThan(before + .005);
  await page.screenshot({ path: `${screenshotFolder}/entrance-transition-1440.png` });
  const geometry = await page.locator("#auria").evaluate((element) => { const r = element.getBoundingClientRect(); const top = r.top + scrollY; return { start: top - innerHeight * .7, end: top + r.height / 2 - innerHeight * .4 }; });
  const masks: string[] = [];
  for (const [label, progress] of [["sketch", 0], ["midpoint", .5], ["reference", 1]] as const) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), geometry.start + (geometry.end - geometry.start) * progress);
    await page.waitForTimeout(700);
    masks.push(await page.locator("[data-concept-photo]").evaluate((element) => getComputedStyle(element).clipPath));
    await page.screenshot({ path: `${screenshotFolder}/auria-${label}-1440.png` });
  }
  expect(new Set(masks).size).toBe(3);
  await expect(page.getByText(/not AI output, CAD or a manufacturing guarantee/)).toBeVisible();
});

test("cold local home transfer and animation profiling evidence", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const metrics = { cls: 0, lcp: 0, longTasks: [] as { start: number; duration: number }[] };
    (window as typeof window & { homePerformance: typeof metrics }).homePerformance = metrics;
    new PerformanceObserver((list) => { for (const item of list.getEntries()) { const shift = item as PerformanceEntry & { hadRecentInput: boolean; value: number }; if (!shift.hadRecentInput) metrics.cls += shift.value; } }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => { metrics.lcp = list.getEntries().at(-1)?.startTime ?? 0; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => { metrics.longTasks.push(...list.getEntries().map(({ startTime, duration }) => ({ start: startTime, duration }))); }).observe({ type: "longtask", buffered: true });
  });
  await ready(page);
  await page.waitForTimeout(1000);
  const initial = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const metrics = (window as typeof window & { homePerformance: { cls: number; lcp: number; longTasks: { start: number; duration: number }[] } }).homePerformance;
    return { ...metrics, transferBytes: nav.transferSize + resources.reduce((sum, item) => sum + item.transferSize, 0), scriptBytes: resources.filter((item) => new URL(item.name).pathname.endsWith(".js")).reduce((sum, item) => sum + item.transferSize, 0), userAgent: navigator.userAgent, animationStart: performance.now() };
  });
  for (const id of scenes.slice(1)) await scene(page, id);
  const after = await page.evaluate(() => (window as typeof window & { homePerformance: { cls: number; lcp: number; longTasks: { start: number; duration: number }[] } }).homePerformance);
  await testInfo.attach("home-local-performance", { body: JSON.stringify({ environment: "1440x1000 headless Edge, loopback production server, no CPU/network throttle; lab only, not p75 or INP evidence", initial, after, animationWindowLongTasks: after.longTasks.filter((item) => item.start >= initial.animationStart) }, null, 2), contentType: "application/json" });
  expect(initial.transferBytes).toBeLessThanOrEqual(1_500_000);
  expect(initial.scriptBytes).toBeLessThanOrEqual(250_000);
  expect(initial.cls).toBeLessThanOrEqual(.1);
});

test("showcase orbit turns, describes each sample design and opens a zoomable closer look", async ({ page }) => {
  await ready(page);
  const title = page.locator(".showcase__title");
  await expect(title).toHaveText("Mehr Crescent Collar");
  await expect(page.locator(".showcase__description")).toBeVisible();
  await page.locator("#entrance").getByRole("button", { name: "Next design", exact: true }).click();
  await expect(title).toHaveText("Gulzar Medallion Haar");
  await expect(page.locator("#entrance")).toHaveAttribute("data-pinned", "true");
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /Look closer/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Gulzar Medallion Haar" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/not real stock or a manufacturing promise/)).toBeVisible();
  const zoom = dialog.getByRole("button", { name: "Zoom in to look closer" });
  await zoom.click();
  await expect(dialog.getByRole("button", { name: "Zoom out" })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Next design", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Noor Lattice Choker" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("mobile showcase turns by swipe without pins and keeps product copy readable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  const title = page.locator(".showcase__title");
  await expect(title).toHaveText("Mehr Crescent Collar");
  const stage = await page.locator(".showcase__stage").boundingBox();
  await page.mouse.move(stage!.x + stage!.width * .75, stage!.y + stage!.height * .45);
  await page.mouse.down();
  await page.mouse.move(stage!.x + stage!.width * .25, stage!.y + stage!.height * .45, { steps: 8 });
  await page.mouse.up();
  await expect(title).not.toHaveText("Mehr Crescent Collar");
  await expect(page.locator(".showcase__description")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

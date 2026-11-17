import { expect, test, type APIResponse, type Page } from "@playwright/test";
import type { CatalogueResult } from "../src/types/catalogue";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

const screenshots = "artifacts/phase04/final";
const cards = (page: Page) => page.locator(".design-card");
const summary = (page: Page) => page.locator(".catalogue-result-summary [role=status]");
async function ready(page: Page, path = "/designs") {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(summary(page)).not.toHaveText("Updating the selection…");
  await page.evaluate(() => document.fonts.ready);
}

test("public catalogue APIs expose only 11 published samples and safe projections", async ({ request }) => {
  const response = await request.get("/api/designs");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.data.totalMatching).toBe(11);
  expect(body.data.items).toHaveLength(11);
  expect(body.data.datasetOrigin).toBe("SAMPLE");
  expect(body.meta.requestId).toMatch(/^[a-f0-9-]{36}$/);
  for (const item of body.data.items) { expect(item.dataOrigin).toBe("SAMPLE"); expect(item.thumbnail.dataOrigin).toBe("AI_GENERATED"); expect(item).not.toHaveProperty("physicalStock"); expect(item).not.toHaveProperty("quantityAvailable"); }
  const detail = await (await request.get(`/api/designs/${body.data.items[0].id}`)).json();
  expect(detail.data.manufacturingTime).toBeNull();
  expect(detail.data.weightRange).toBeNull();
  expect(detail.data.variants[0].indicativePrice).toBeNull();
  expect((await request.get("/api/designs/10000000-0000-4000-8000-000000000012")).status()).toBe(404);
  expect((await request.get("/api/designs/not-a-uuid")).status()).toBe(404);
  expect((await request.post("/api/designs", { data: {} })).status()).toBe(405);
});

test("cursor pagination is bounded, stable and query-bound", async ({ request }) => {
  let cursor: string | null = null;
  const ids: string[] = [];
  let second: { previousCursor: string | null } | null = null;
  let firstCursor = "";
  for (let page = 1; page <= 3; page++) {
    const response: APIResponse = await request.get(`/api/designs?limit=4${cursor ? `&cursor=${cursor}` : ""}`);
    expect(response.status()).toBe(200);
    const { data }: { data: CatalogueResult } = await response.json();
    expect(data.pageNumber).toBe(page);
    expect(data.items.length).toBeLessThanOrEqual(4);
    ids.push(...data.items.map((item: { id: string }) => item.id));
    cursor = data.nextCursor;
    if (page === 1) firstCursor = cursor!;
    if (page === 2) second = data;
  }
  expect(cursor).toBeNull();
  expect(second!.previousCursor).toBeNull();
  expect(new Set(ids).size).toBe(11);
  expect((await request.get(`/api/designs?limit=4&category=rings&cursor=${firstCursor}`)).status()).toBe(400);
  expect((await request.get(`/api/designs?limit=3&cursor=${firstCursor}`)).status()).toBe(400);
  expect((await request.get("/api/designs?cursor=bm90LWpzb24")).status()).toBe(400);
});

test("API filters combine correctly for a specific purity and availability", async ({ request }) => {
  const base = "/api/designs?q=RSJ-D005&category=rings&subcategory=floral-rings&collection=everyday-poetry&style=floral&occasion=gifting";
  const stock18 = await (await request.get(`${base}&karat=18&status=IN_STOCK`)).json();
  expect(stock18.data.items).toHaveLength(1);
  const stock22 = await (await request.get(`${base}&karat=22&status=IN_STOCK`)).json();
  expect(stock22.data.items).toHaveLength(0);
  const craft22 = await (await request.get(`${base}&karat=22&status=MADE_TO_ORDER`)).json();
  expect(craft22.data.items[0].displayStatus).toBe("MADE_TO_ORDER");
  expect(craft22.data.items[0].purityOptions).toEqual([22]);
  const custom = await (await request.get("/api/designs?status=CUSTOM_DESIGN")).json();
  expect(custom.data.items).toHaveLength(2);
  expect((await (await request.get("/api/designs?status=UNAVAILABLE")).json()).data.items).toEqual([]);
});

test("unsupported filters are rejected rather than fabricate price or weight data", async ({ request }) => {
  for (const search of ["budget=100", "weight=2", "limit=49", "sort=price", "q=a&q=b", "category=bridal&subcategory=floral-rings", "karat=24"]) {
    const response = await request.get(`/api/designs?${search}`);
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(body.error.retryable).toBe(false);
    expect(JSON.stringify(body)).not.toContain("stack");
  }
});

test("taxonomy and collection APIs are consistent, bounded and published", async ({ request }) => {
  const taxonomy = await (await request.get("/api/categories")).json();
  expect(taxonomy.data.items.filter((item: { parentId: string | null }) => !item.parentId)).toHaveLength(6);
  const first = await (await request.get("/api/collections?limit=2")).json();
  expect(first.data.items).toHaveLength(2);
  const second = await (await request.get(`/api/collections?limit=2&cursor=${first.data.nextCursor}`)).json();
  expect(second.data.items).toHaveLength(2);
  expect(second.data.nextCursor).toBeNull();
  expect((await request.get("/api/collections/the-bridal-edit")).status()).toBe(200);
  expect((await request.get("/api/collections/missing")).status()).toBe(404);
  expect((await request.get("/collections/missing")).status()).toBe(404);
  expect((await request.get("/admin")).status()).toBe(404);
  expect((await request.get("/designs/petal-seal-ring")).status()).toBe(404); // Phase 05 remains unimplemented.
});

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`catalogue responsive images and screenshots at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await ready(page);
    await expect(cards(page)).toHaveCount(11);
    for (const image of await page.locator("main img").all()) await image.evaluate(async (element: HTMLImageElement) => { element.loading = "eager"; await element.decode(); });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await mkdir(screenshots, { recursive: true });
    await page.screenshot({ path: `${screenshots}/vault-hero-${width}.png` });
    await page.locator("#design-results").evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - document.querySelector(".site-header")!.getBoundingClientRect().height - 16, behavior: "instant" }));
    await page.screenshot({ path: `${screenshots}/vault-grid-${width}.png` });
    await page.screenshot({ path: `${screenshots}/vault-full-${width}.png`, fullPage: true });
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await page.screenshot({ path: `${screenshots}/vault-footer-${width}.png` });
    await expect(page.getByRole("link", { name: "Font notices" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test("search works by design ID, name and keywords with shareable URL", async ({ page }) => {
  await ready(page);
  const search = page.getByRole("search", { name: "Search designs" }).getByRole("searchbox");
  await search.fill("rsj-d005");
  await expect(summary(page)).toHaveText("1 sample design found");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText("Petal Seal Ring");
  await expect(page).toHaveURL(/q=rsj-d005/);
  await page.reload();
  await expect(cards(page)).toHaveCount(1);
  await expect(search).toHaveValue("rsj-d005");
  await search.fill("fold satin");
  await search.press("Enter");
  await expect(cards(page).first()).toContainText("Dune Fold Ring");
  await expect(summary(page)).toHaveText("1 sample design found");
});

test("desktop filters intersect, chips remove dependencies, clear-all resets", async ({ page }) => {
  await ready(page);
  const sidebar = page.locator(".catalogue-sidebar");
  await sidebar.getByLabel("Category", { exact: true }).selectOption("rings");
  await sidebar.getByLabel("Subcategory", { exact: true }).selectOption("floral-rings");
  await sidebar.getByLabel("Jewellery style").selectOption("floral");
  await sidebar.getByLabel("Occasion").selectOption("gifting");
  await sidebar.getByLabel("Sample purity option").selectOption("18");
  await sidebar.getByLabel("Sample availability").selectOption("IN_STOCK");
  await sidebar.getByRole("button", { name: "Apply filters" }).click();
  await expect(summary(page)).toHaveText("1 sample design found");
  await expect(cards(page).first()).toHaveAttribute("data-design-id", "RSJ-D005");
  await expect(page).toHaveURL(/subcategory=floral-rings/);
  await page.getByRole("button", { name: "Remove category filter: Rings", exact: true }).click();
  expect(new URL(page.url()).searchParams.has("subcategory")).toBe(false);
  await page.locator(".catalogue-active-filters").getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(summary(page)).toHaveText("11 sample designs found");
  await expect(page).toHaveURL(/\/designs$/);
});

test("Back/Forward restores filters and sorting; cursor navigation stays bounded", async ({ page }) => {
  await ready(page, "/designs?limit=4");
  await expect(cards(page)).toHaveCount(4);
  const first = await cards(page).first().getAttribute("data-design-id");
  await page.getByRole("link", { name: "Next designs" }).click();
  await expect(page).toHaveURL(/cursor=/);
  await expect(page.getByRole("navigation", { name: "Design pages" })).toContainText("Page 2");
  expect(await cards(page).first().getAttribute("data-design-id")).not.toBe(first);
  await page.getByLabel("Sort by", { exact: true }).selectOption("newest");
  await expect(cards(page).first()).toHaveAttribute("data-design-id", "RSJ-D011");
  expect(new URL(page.url()).searchParams.has("cursor")).toBe(false);
  await page.goBack();
  await expect(page.getByLabel("Sort by", { exact: true })).toHaveValue("featured");
  await expect(page.getByRole("navigation", { name: "Design pages" })).toContainText("Page 2");
  await page.goBack();
  await expect(cards(page).first()).toHaveAttribute("data-design-id", first!);
  await page.goForward();
  await expect(page.getByRole("navigation", { name: "Design pages" })).toContainText("Page 2");
  await page.getByRole("link", { name: "Previous designs" }).click();
  await expect(page.getByRole("navigation", { name: "Design pages" })).toContainText("Page 1");
});

test("empty search and unpopulated categories explain the actual sample limitation", async ({ page }) => {
  await ready(page, "/designs?q=no-such-design");
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /A different detail/ })).toBeVisible();
  await page.locator(".catalogue-message").getByRole("button", { name: "Clear all filters" }).click();
  await expect(cards(page)).toHaveCount(11);
  await page.getByRole("navigation", { name: "Browse categories" }).getByRole("link", { name: /Necklaces/ }).click();
  await expect(page.getByText(/No image-backed samples are published/)).toBeVisible();
  await expect(summary(page)).toHaveText("0 sample designs found");
  await page.screenshot({ path: `${screenshots}/empty-category-1440.png` });
});

test("mobile filter drawer combines facets and restores focus/scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  const trigger = page.locator(".catalogue-filter-trigger");
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Refine your selection", exact: true });
  await expect(drawer).toBeVisible();
  for (let index = 0; index < 14; index++) {
    await page.keyboard.press("Tab");
    expect(await drawer.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await drawer.getByLabel("Category", { exact: true }).selectOption("rings");
  await drawer.getByLabel("Jewellery style").selectOption("minimal");
  await page.screenshot({ path: `${screenshots}/mobile-filters-390.png` });
  await drawer.getByRole("button", { name: "Apply filters" }).click();
  await expect(drawer).not.toBeVisible();
  await expect(summary(page)).toHaveText("2 sample designs found");
  await expect(trigger).toContainText("(2)");
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await trigger.click();
  await drawer.getByRole("button", { name: "Clear all filters" }).click();
  await expect(summary(page)).toHaveText("11 sample designs found");
  await expect(drawer).not.toBeVisible();
});

test("collection index and collection-scoped browsing preserve context", async ({ page }) => {
  await page.goto("/collections");
  await expect(page.locator(".vault-collection-card")).toHaveCount(4);
  await page.screenshot({ path: `${screenshots}/collections-1440.png`, fullPage: true });
  await page.locator('.vault-collection-card[href="/collections/the-bridal-edit"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Bridal Edit");
  await expect(summary(page)).toHaveText("5 sample designs found");
  await page.screenshot({ path: `${screenshots}/bridal-collection-1440.png` });
  await page.getByRole("navigation", { name: "Browse categories" }).getByRole("link", { name: /Bangles/ }).click();
  await expect(summary(page)).toHaveText("1 sample design found");
  await expect(cards(page).first()).toHaveAttribute("data-design-id", "RSJ-D011");
  await page.locator(".catalogue-active-filters").getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(page).toHaveURL(/\/collections\/the-bridal-edit$/);
  await expect(summary(page)).toHaveText("5 sample designs found");
});

test("design preview displays sample variant differences without a fake enquiry flow", async ({ page }) => {
  const methods: string[] = [];
  page.on("request", (request) => methods.push(request.method()));
  await ready(page, "/designs?q=RSJ-D005");
  const opener = page.locator(".design-card__image");
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Petal Seal Ring", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/18K — In Stock; 22K — Available to Craft/)).toBeVisible();
  await expect(dialog.getByText(/No physical stock, purity, weight or manufacturing feasibility/)).toBeVisible();
  await expect(dialog.getByText("No lead time configured")).toBeVisible();
  await expect(dialog.locator("form, input, select")).toHaveCount(0);
  await page.screenshot({ path: `${screenshots}/design-preview-1440.png` });
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  expect(methods.every((method) => method === "GET")).toBe(true);
});

test("mobile navigation and real public search reach implemented destinations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("navigation", { name: "Homepage chapters" }).getByRole("link", { name: "Design Vault", exact: true }).click();
  await expect(page).toHaveURL(/\/designs$/);
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await page.getByRole("button", { name: "Search jewellery designs" }).click();
  const dialog = page.getByRole("dialog", { name: "A closer look", exact: true });
  await dialog.getByRole("searchbox").fill("RSJ-D010");
  await dialog.getByRole("button", { name: "Search the Design Vault" }).click();
  await expect(summary(page)).toHaveText("1 sample design found");
  await expect(cards(page).first()).toContainText("Tidal Cuff");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("navigation", { name: "Catalogue navigation" }).getByRole("link", { name: "Collections", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Different moods.");
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("pending filter request shows a real skeleton, not a fabricated delay", async ({ page }) => {
  await ready(page);
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/designs?*", async (route) => { await gate; await route.continue(); });
  await page.getByRole("searchbox", { name: "Search designs", exact: true }).fill("petal");
  await expect(page.getByRole("status", { name: "Loading designs", exact: true })).toBeVisible();
  await expect(page.locator("#design-results")).toHaveAttribute("aria-busy", "true");
  await page.screenshot({ path: `${screenshots}/loading-1440.png` });
  release();
  await expect(summary(page)).toHaveText("1 sample design found");
  await expect(page.getByRole("status", { name: "Loading designs", exact: true })).toHaveCount(0);
});

test("API failure retains URL selection and a working retry", async ({ page }) => {
  await ready(page);
  let fail = true;
  await page.route("**/api/designs?*", (route) => fail ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "The selection is temporarily unavailable.", retryable: true } }) }) : route.continue());
  await page.getByRole("searchbox", { name: "Search designs", exact: true }).fill("petal");
  await expect(page.getByRole("alert")).toContainText("The selection is temporarily unavailable.");
  await expect(page).toHaveURL(/q=petal/);
  await page.screenshot({ path: `${screenshots}/error-1440.png` });
  fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(summary(page)).toHaveText("1 sample design found");
  await expect(cards(page).first()).toContainText("Petal Seal Ring");
});

test("late search responses cannot overwrite the latest selection", async ({ page }) => {
  await ready(page);
  await page.route("**/api/designs?*", async (route) => {
    const response = await route.fetch();
    if (new URL(route.request().url()).searchParams.get("q") === "petal") await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({ response }).catch(() => {}); // Older aborted browser request is intentionally discarded.
  });
  const input = page.getByRole("searchbox", { name: "Search designs", exact: true });
  const requested = page.waitForRequest((request) => request.url().includes("/api/designs?") && new URL(request.url()).searchParams.get("q") === "petal");
  await input.fill("petal");
  await requested;
  await input.fill("dune");
  await expect(cards(page).first()).toContainText("Dune Fold Ring");
  await page.waitForTimeout(1500);
  await expect(cards(page).first()).toContainText("Dune Fold Ring");
  await expect(summary(page)).toHaveText("1 sample design found");
});

test("failed concept imagery has a designed fallback and retained information", async ({ page }) => {
  await page.route("**/images/catalogue/design-005*.webp", (route) => route.fulfill({ status: 404, body: "Intentional image failure" }));
  await ready(page, "/designs?q=RSJ-D005");
  await expect(page.locator('.design-card [data-image-failed="true"]')).toBeVisible();
  await expect(cards(page).first()).toContainText("Petal Seal Ring");
  await expect(cards(page).first()).toContainText("Concept image unavailable.");
  await page.screenshot({ path: `${screenshots}/missing-concept-1440.png` });
});

test("invalid deep link is recoverable, never a silent filter reset", async ({ page }) => {
  await ready(page, "/designs?budget=100");
  await expect(page.getByRole("alert")).toContainText("Unsupported filter");
  await page.getByRole("button", { name: "Reset selection", exact: true }).click();
  await expect(summary(page)).toHaveText("11 sample designs found");
});

for (const width of [390, 1440]) {
  test(`catalogue accessibility, preview and reduced motion at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page);
    const scan = async () => expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
    await scan();
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    await expect(cards(page).first()).toHaveCSS("animation-name", "none");
    await page.locator(".design-card__image").first().hover();
    await expect(page.locator(".design-card__image img").first()).toHaveCSS("transform", "none");
    await page.locator(".design-card__image").first().click();
    await expect(page.getByRole("dialog", { name: "Mehr Crescent Collar" })).toBeVisible();
    await scan();
    await page.keyboard.press("Escape");
    if (width === 390) {
      await page.locator(".catalogue-filter-trigger").click();
      await scan();
      await page.keyboard.press("Escape");
    }
  });
}

test("no-JavaScript catalogue has visible cards and functional native filtering", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3100/designs");
    await expect(cards(page).first()).toBeVisible();
    await page.getByRole("navigation", { name: "Browse categories" }).getByRole("link", { name: /^Rings/ }).click();
    await expect(cards(page)).toHaveCount(5);
    const sidebar = page.locator(".catalogue-sidebar");
    await expect(sidebar).toBeVisible();
    await sidebar.getByLabel("Jewellery style").selectOption("floral");
    await sidebar.getByRole("button", { name: "Apply filters" }).click();
    await expect(cards(page)).toHaveCount(1);
    await page.locator(".design-card__image").click();
    await expect(page).toHaveURL(/q=RSJ-D005/);
    await expect(cards(page).first()).toContainText("Petal Seal Ring");
    await page.screenshot({ path: `${screenshots}/no-js-390.png` });
  } finally { await context.close(); }
});

test("ordinary catalogue journey has no browser errors or external/mutation requests", async ({ page }, testInfo) => {
  const errors: string[] = [], external: string[] = [], methods: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { methods.push(request.method()); if (!/^(127\.0\.0\.1|localhost)$/.test(new URL(request.url()).hostname)) external.push(request.url()); });
  await ready(page);
  await page.getByRole("navigation", { name: "Browse categories" }).getByRole("link", { name: /^Rings/ }).click();
  await expect(summary(page)).toHaveText("5 sample designs found");
  await page.locator(".design-card__image").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  expect(methods.every((method) => method === "GET")).toBe(true);
  await testInfo.attach("catalogue-journey-evidence", { body: JSON.stringify({ errors, external, methods }), contentType: "application/json" });
});

test("unexpected render fault reaches the real route boundary and retry recovers", async ({ page }) => {
  await ready(page);
  let corrupt = true;
  await page.route("**/api/designs?*", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (corrupt && body.data.items[0]) body.data.items[0].thumbnail = null;
    await route.fulfill({ response, json: body });
  });
  await page.getByRole("searchbox", { name: "Search designs", exact: true }).fill("petal");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("An interruption.");
  await expect(page.getByRole("alert")).not.toContainText("TypeError");
  await page.screenshot({ path: `${screenshots}/route-error-1440.png` });
  corrupt = false;
  await page.getByRole("button", { name: "Try this page again", exact: true }).click();
  await expect(summary(page)).toHaveText("1 sample design found");
});

test("catalogue local cold-browser transfer and web-vital evidence", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const metrics = { cls: 0, lcp: 0 };
    (window as typeof window & { catalogueMetrics: typeof metrics }).catalogueMetrics = metrics;
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) { const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }; if (!shift.hadRecentInput) metrics.cls += shift.value; } }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => { metrics.lcp = list.getEntries().at(-1)?.startTime ?? 0; }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await ready(page);
  await page.waitForTimeout(1200);
  const metrics = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return { ...(window as typeof window & { catalogueMetrics: { cls: number; lcp: number } }).catalogueMetrics, transferBytes: nav.transferSize + resources.reduce((sum, entry) => sum + entry.transferSize, 0), scriptBytes: resources.filter((entry) => new URL(entry.name).pathname.endsWith(".js")).reduce((sum, entry) => sum + entry.transferSize, 0), domCards: document.querySelectorAll(".design-card").length, environment: "1440x1000 fresh headless Edge context, local production; no CPU/network throttle, not field/p75 evidence" };
  });
  await testInfo.attach("catalogue-local-performance", { body: JSON.stringify(metrics, null, 2), contentType: "application/json" });
  expect(metrics.domCards).toBeLessThanOrEqual(12);
  expect(metrics.transferBytes).toBeLessThanOrEqual(1_500_000);
  expect(metrics.scriptBytes).toBeLessThanOrEqual(250_000);
  expect(metrics.cls).toBeLessThanOrEqual(.1);
});

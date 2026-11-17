import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("internal preview remains available alongside the homepage", async ({ page, request }) => {
  const response = await page.goto("/design-preview");
  await expect(page).toHaveURL(/\/design-preview$/);
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("An expression.");
  await expect(page.getByText("Visual study · No messages can be sent")).toBeVisible();
  expect((await request.get("/admin")).status()).toBe(404);
  expect((await request.get("/designs")).status()).toBe(200);
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`responsive layout and image decoding at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/design-preview");
    await page.evaluate(() => document.fonts.ready);
    for (const image of await page.locator("main img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    const broken = await page.locator('a[href^="#"], a[href^="/design-preview#"]').evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")!.split("#")[1]).filter((id) => !document.getElementById(id)));
    expect(broken).toEqual([]);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath(`viewport-${width}.png`) });
    await page.screenshot({ path: testInfo.outputPath(`preview-${width}.png`), fullPage: true });
  });
}

test("mobile menu Escape and focus restoration", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-preview");
  const trigger = page.getByRole("button", { name: "Open menu" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "The visual atelier" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link")).toHaveCount(4);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("local search filters reference studies", async ({ page }) => {
  await page.goto("/design-preview");
  await page.getByRole("button", { name: "Search reference studies" }).click();
  const dialog = page.getByRole("dialog", { name: "A closer look" });
  const input = dialog.getByRole("searchbox");
  await expect(input).toBeFocused();
  await input.fill("pendant");
  await expect(dialog.getByRole("status")).toHaveText("1 study found");
  await dialog.getByRole("link", { name: /A little extraordinary/ }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/#pendant-study$/);
});

test("reference dialog shows provenance and restores focus", async ({ page }) => {
  await page.goto("/design-preview");
  const opener = page.getByRole("button", { name: "Editorial reference — View study: An ode to ornament", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "An ode to ornament" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Not a catalogue entry or an item offered for sale.")).toBeVisible();
  await expect(dialog.getByRole("link", { name: /photographer/ })).toHaveAttribute("href", /unsplash.com/);
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});

test("reduced-motion preference preserves visible content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design-preview");
  await page.getByRole("button", { name: /Replay typography reveal/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Reduced motion:" })).toBeVisible();
  await expect(page.getByText("Quiet confidence.", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Reduce preview motion" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
});

test("AURIA describes a concept without invoking a service", async ({ page }) => {
  await page.goto("/design-preview");
  await page.getByRole("button", { name: "The idea behind AURIA" }).click();
  const dialog = page.getByRole("dialog", { name: "AURIA, thoughtfully imagined" });
  await expect(dialog.getByText(/No microphone, upload or paid AI call starts here/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("baseline accessibility scan", async ({ page }) => {
  await page.goto("/design-preview");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("mobile menu and search accessibility", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-preview");
  await page.getByRole("button", { name: "Open menu" }).click();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Search reference studies" }).click();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.querySelector("dialog[open]")?.contains(document.activeElement))).toBe(true);
  }
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await page.evaluate(() => document.querySelector("dialog[open]")?.contains(document.activeElement))).toBe(true);
  }
});

test("replay completes and a changed OS preference stops motion", async ({ page }) => {
  await page.goto("/design-preview");
  const replay = page.getByRole("button", { name: "Replay typography reveal" });
  await replay.click();
  await expect(page.getByRole("status").filter({ hasText: "Reveal complete." })).toBeVisible();
  await replay.click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("status").filter({ hasText: "Reduced motion:" })).toBeVisible();
  await expect(page.locator("[data-reveal-line]").first()).toHaveCSS("opacity", "1");
});

test("preview has no browser errors or external service requests", async ({ page }, testInfo) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) external.push(request.url()); });
  await page.goto("/design-preview");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "The idea behind AURIA" }).click();
  await expect(page.getByRole("dialog", { name: "AURIA, thoughtfully imagined" })).toBeVisible();
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  const metrics = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return { scope: "Phase 02 desktop preview cold browser context, local production server; not Phase 03 home or field metrics", viewport: window.innerWidth, transferBytes: navigation.transferSize + resources.reduce((sum, resource) => sum + resource.transferSize, 0), scriptTransferBytes: resources.filter((resource) => new URL(resource.name).pathname.endsWith(".js")).reduce((sum, resource) => sum + resource.transferSize, 0), resources: resources.map(({ name, transferSize, initiatorType }) => ({ path: new URL(name).pathname, transferSize, initiatorType })) };
  });
  await testInfo.attach("preview-local-transfer", { body: JSON.stringify(metrics, null, 2), contentType: "application/json" });
});

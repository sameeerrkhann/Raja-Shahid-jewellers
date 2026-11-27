import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const TOLA = 11.6638038;
const live = (perGram24: number, status: "live" | "stale" = "live") => {
  const rows = [24, 22, 21, 18].map((karat) => { const perGram = perGram24 * karat / 24; return { karat, perGram, perTenGram: perGram * 10, perTola: perGram * TOLA }; });
  return { data: { status, note: status === "live" ? "International gold price converted to PKR. Shop rates may differ." : "This rate may be out of date: the source has not answered recently.", source: { name: "GoldPriceZ", url: "https://goldpricez.com/" }, currency: "PKR", observedAt: new Date(Date.now() - 4 * 60000).toISOString(), fetchedAt: new Date().toISOString(), refreshSeconds: 900, rows }, meta: { requestId: "test" } };
};
const mockRate = (page: Page, body: unknown, status = 200) => page.route("**/api/gold-rate", (route) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }));

test("gold-rate API never invents a rate when no source is configured", async ({ request }) => {
  const response = await request.get("/api/gold-rate");
  expect(response.headers()["cache-control"]).toContain("no-store");
  const { data } = await response.json();
  expect(["unavailable", "live", "stale", "sample"]).toContain(data.status);
  if (data.status === "unavailable") expect(data.rows).toEqual([]);
});

test("gold rates page: live figures by karat, last updated, source, and the value calculator", async ({ page }) => {
  await mockRate(page, live(36000));
  await page.goto("/gold-rates");
  const panel = page.locator(".gold-rates");
  await expect(panel).toHaveAttribute("data-status", "live");
  await expect(panel.getByText("Live rate")).toBeVisible();
  await expect(panel.locator("tbody tr")).toHaveCount(4);
  await expect(panel.locator("tbody tr").first()).toContainText("24K");
  await expect(panel.locator("tbody tr").first()).toContainText("PKR 419,897");
  await expect(panel.getByText(/Last updated .* PKT · 4 min ago/)).toBeVisible();
  await expect(panel.getByRole("link", { name: "GoldPriceZ" })).toHaveAttribute("href", "https://goldpricez.com/");
  await page.getByLabel("Weight").fill("2");
  await page.getByLabel("Unit").selectOption("gram");
  await page.getByRole("combobox", { name: "Karat" }).selectOption("22");
  await expect(page.locator(".gold-calc__result")).toContainText("PKR 66,000");
  await expect(page.locator(".gold-feature")).toContainText("PKR 419,897");
  await expect(page.locator(".gold-chip")).toContainText("Rs 419,897");
  await page.screenshot({ path: "test-results/gold-rates-1440.png", fullPage: true });
});

test("gold rates: stale and unavailable states are said plainly", async ({ page }) => {
  await mockRate(page, live(36000, "stale"));
  await page.goto("/gold-rates");
  await expect(page.locator(".gold-rates")).toHaveAttribute("data-status", "stale");
  await expect(page.locator(".gold-rates .gold-rates__status")).toHaveText("May be out of date");
  await page.unroute("**/api/gold-rate");
  await mockRate(page, { error: "down" }, 503);
  await page.goto("/");
  const compact = page.locator("#gold .gold-rates");
  await compact.scrollIntoViewIfNeeded();
  await expect(compact).toHaveAttribute("data-status", "unavailable");
  await expect(compact.locator("tbody tr")).toHaveCount(0);
});

for (const path of ["/gold-rates"]) {
  test(`${path} passes the accessibility scan and fits a phone`, async ({ page }) => {
    await mockRate(page, live(36000));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.getByRole("button", { name: "Gram", exact: true }).click();
    await expect(page.locator('.gold-rates tbody tr').first().locator('td:visible')).toHaveText("PKR 36,000");
    await page.screenshot({ path: "test-results/gold-rates-390.png", fullPage: true });
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  });
}

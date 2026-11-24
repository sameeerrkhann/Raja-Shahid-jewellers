import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const assetPath = "/models/auria/grab3d-gold-ring-study.glb";
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

function stage(page: Page) { return page.getByRole("complementary", { name: "Selected design and quotation" }); }

async function ask(page: Page, message: string) {
  await page.getByLabel("Message AURIA").fill(message);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("button", { name: "Use live chat", exact: true })).toBeEnabled();
}

type Orbit = { theta: number; phi: number; radius: number };
function orbit(viewer: Locator) {
  return viewer.evaluate(element => (element as HTMLElement & { getCameraOrbit(): Orbit }).getCameraOrbit());
}

test("the licensed ring GLB has a bounded self-contained mesh and materials", () => {
  const bytes = readFileSync("public" + assetPath);
  expect(bytes.subarray(0, 4).toString()).toBe("glTF");
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  expect(bytes.length).toBeLessThanOrEqual(375_000);
  const data = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
  expect(data.extensionsRequired ?? []).toEqual([]);
  expect(data.meshes[0].primitives).toHaveLength(1);
  expect(data.materials[0].pbrMetallicRoughness).toBeTruthy();
  expect(data.images).toHaveLength(3);
  expect([...data.images, ...data.buffers].every(value => !value.uri)).toBe(true);
});

test("desktop 3D lazily loads real geometry, respects reduced motion, and supports keyboard controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const assetCalls: string[] = [];
  const outbound: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === assetPath) assetCalls.push(url.pathname);
    if ((url.protocol === "https:" || url.protocol === "http:") && url.hostname !== "127.0.0.1") outbound.push(url.hostname);
  });
  await page.goto("/ai-atelier");
  const visual = stage(page);
  await visual.getByRole("button", { name: /Inspect image of/ }).click();
  await expect(page.getByRole("region", { name: "Jewellery photo" })).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => customElements.get("model-viewer") !== undefined)).toBe(false);
  expect(assetCalls).toEqual([]);

  const opener = visual.getByRole("button", { name: "Open 3D study", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "3D jewellery study" });
  await expect(dialog.getByText("3D model ready", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(dialog.getByText(/Independent ring demonstration/)).toBeVisible();
  const viewer = dialog.locator("model-viewer");
  expect(await viewer.evaluate(element => (element as HTMLElement & { getDimensions(): { x: number } }).getDimensions().x)).toBeGreaterThan(0.01);
  expect(assetCalls).toEqual([assetPath]);
  expect(outbound).toEqual([]);
  const start = await orbit(viewer);
  await dialog.getByRole("button", { name: "Turn right" }).press("Enter");
  await expect.poll(async () => (await orbit(viewer)).theta).toBeGreaterThan(start.theta + .25);
  await dialog.getByRole("button", { name: "Zoom in", exact: true }).press("Enter");
  await expect.poll(async () => (await orbit(viewer)).radius).toBeLessThan(start.radius * .98);
  await dialog.getByRole("button", { name: "Reset view", exact: true }).press("Enter");
  await expect.poll(async () => (await orbit(viewer)).theta).toBeCloseTo(start.theta, 1);
  await expect(dialog.locator(".atelier-study__canvas")).toHaveCSS("animation-name", "none");
  await page.keyboard.press("Escape");
  await expect(page.locator("model-viewer")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test.describe("narrow touch layout", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("touch drag orbits a genuine model and leaves the conversation composer available", async ({ page, context }) => {
    await page.goto("/ai-atelier");
    await expect(page.getByLabel("Message AURIA")).toBeInViewport();
    await page.getByRole("button", { name: "Design & draft", exact: true }).click();
    await stage(page).getByRole("button", { name: "Open 3D study", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "3D jewellery study" });
    await expect(dialog.getByText("3D model ready", { exact: true })).toBeVisible({ timeout: 30_000 });
    const viewer = dialog.locator("model-viewer");
    const box = (await viewer.boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const previous = await orbit(viewer);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 7; step++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + step * 10, y: y + step }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(async () => Math.abs((await orbit(viewer)).theta - previous.theta)).toBeGreaterThan(.16);
    const radius = (await orbit(viewer)).radius;
    const fingers = (offset: number) => [{ x: x - offset, y, id: 1 }, { x: x + offset, y, id: 2 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: fingers(28) });
    for (let step = 1; step <= 6; step++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: fingers(28 + step * 8) });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(async () => (await orbit(viewer)).radius).toBeLessThan(radius * .98);
    await dialog.getByRole("button", { name: "Back to catalogue photos" }).click();
    await page.getByRole("button", { name: "Conversation", exact: true }).click();
    await expect(page.getByLabel("Message AURIA")).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });
});

test("Data Saver holds back the engine and the photo path survives an asset failure", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true }));
  let attempts = 0;
  await page.route(url => url.pathname === assetPath, async route => {
    if (++attempts === 1) await route.fulfill({ status: 404, body: "Study unavailable" });
    else await route.continue();
  });
  await page.goto("/ai-atelier");
  const visual = stage(page);
  await visual.getByRole("button", { name: "Open 3D study", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "3D jewellery study" });
  await expect(dialog.getByRole("status")).toContainText("Data Saver is on");
  expect(await page.evaluate(() => customElements.get("model-viewer") !== undefined)).toBe(false);
  expect(attempts).toBe(0);
  await dialog.getByRole("button", { name: "Load 3D anyway" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Catalogue photos are still available", { timeout: 30_000 });
  expect(attempts).toBe(1);
  await dialog.getByRole("button", { name: "Retry 3D study" }).click();
  await expect(dialog.getByText("3D model ready", { exact: true })).toBeVisible({ timeout: 30_000 });
  expect(attempts).toBe(2);
  await dialog.getByRole("button", { name: "Back to catalogue photos" }).click();
  await visual.getByRole("button", { name: /Inspect image of/ }).click();
  await expect(page.getByRole("region", { name: "Jewellery photo" })).toBeVisible();
});

test("new recommendations focus the photo stage, preserve quotes, and can be compared and revisited", async ({ page }) => {
  await page.goto("/ai-atelier");
  await page.getByRole("button", { name: "Use catalogue demo", exact: true }).click();
  await ask(page, "Show me 22K gold rings.");
  const visual = stage(page);
  const title = visual.locator(".atelier-stage__details h2");
  await expect(title).toHaveText("Petal Seal Ring");
  await visual.getByRole("button", { name: "Compare designs" }).click();
  const comparison = page.getByRole("dialog", { name: "Compare recommended designs" });
  await expect(comparison.getByRole("heading", { name: "Jali Arch Ring" })).toBeVisible();
  const jali = comparison.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Jali Arch Ring" }) });
  await expect(jali.getByText("22K", { exact: true })).toBeVisible();
  await comparison.getByRole("button", { name: "Select Jali Arch Ring" }).click();
  await expect(title).toHaveText("Jali Arch Ring");
  await ask(page, "Show me necklaces.");
  await expect(title).toHaveText("Mehr Crescent Collar");
  await expect(visual.getByText("Quotation selection Jali Arch Ring")).toBeVisible();
  const history = visual.getByLabel("Recommendation history");
  await history.selectOption({ index: 1 });
  await expect(title).toHaveText("Petal Seal Ring");
  await page.reload();
  await expect(title).toHaveText("Mehr Crescent Collar");
  await expect(history.locator("option")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Use live chat", exact: true })).toBeEnabled();
});

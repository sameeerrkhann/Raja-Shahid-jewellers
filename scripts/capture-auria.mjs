// Read-only QA of the existing fictional live-test conversation. Never invokes the provider.
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const state = JSON.parse(readFileSync(".auria-data/live-test-session.json", "utf8"));
const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
mkdirSync("artifacts/ai01/live", { recursive: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    await context.addCookies([{ name: "rsj-auria-session", value: state.cookie.split("=")[1], url: "http://127.0.0.1:3102", httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage(); const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/ai/chat", (route) => route.abort());
    await page.goto("http://127.0.0.1:3102/ai-atelier?conversation=" + state.conversationId);
    await page.getByText("Restoring your atelier…").waitFor({ state: "hidden" });
    await page.locator(".auria-message").first().waitFor();
    await page.locator(".auria-transcript").evaluate((e) => { e.scrollTop = e.scrollHeight; });
    await page.screenshot({ path: `artifacts/ai01/live/conversation-${width}.png`, fullPage: true });
    const composer = await page.getByLabel("Message AURIA").boundingBox();
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    if (width < 901) await page.getByRole("button", { name: "Design & draft", exact: true }).click();
    await page.getByText("Demo enquiry saved", { exact: true }).waitFor();
    await page.screenshot({ path: `artifacts/ai01/live/receipt-${width}.png`, fullPage: true });
    console.log(JSON.stringify({ width, restoredMessages: await page.locator(".auria-message").count(), noOverflow, composerWidth: composer?.width, errors }));
    if (!noOverflow || !composer || composer.width < 150 || errors.length) process.exitCode = 1;
    await context.close();
  }
} finally { await browser.close(); }

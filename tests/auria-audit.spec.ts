import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { orchestrate } from "../src/lib/auria/orchestrate";
import { providerError, isTransientProviderFailure } from "../src/lib/auria/provider-policy";

async function catalogue(page: Page) {
  await page.goto("/ai-atelier");
  await page.getByRole("button", { name: "Use catalogue demo", exact: true }).click();
}

async function send(page: Page, text: string) {
  await page.getByLabel("Message AURIA").fill(text);
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/ai/chat"));
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
  await expect(page.getByRole("button", { name: "Use live chat", exact: true })).toBeEnabled();
  return events;
}

test("provider classification distinguishes invalid keys, quota, unknown model, service and timeouts", () => {
  expect(providerError({ status: 400, message: JSON.stringify({ error: { details: [{ reason: "API_KEY_INVALID" }] } }) }).code).toBe("PROVIDER_ACCESS");
  expect(providerError({ status: 400, message: "request details" }).code).toBe("PROVIDER_REQUEST");
  expect(providerError({ status: 404 }).code).toBe("MODEL_UNAVAILABLE");
  expect(providerError({ status: 429 }).code).toBe("PROVIDER_RATE_LIMIT");
  expect(providerError({ status: 500 }).code).toBe("PROVIDER_BUSY");
  expect(providerError({ status: 504 }).code).toBe("TIMEOUT");
  expect(isTransientProviderFailure({ status: 429 })).toBe(false);
  expect(isTransientProviderFailure({ status: 403 })).toBe(false);
  expect(isTransientProviderFailure({ status: 503 })).toBe(true);
});

test("transient retry is accounted once and cannot replay a partially streamed message", async () => {
  const signal = new AbortController().signal;
  let attempts = 0;
  const usage: string[] = [];
  const context = {
    system: "", history: [], signal,
    execute: () => ({ data: null }),
    beforeCall: () => String(++attempts),
    usage: (_id: string, _value: unknown, state: string) => usage.push(state),
    retry: async (error: unknown) => isTransientProviderFailure(error),
  };
  const events = [];
  for await (const event of orchestrate({ ...context, provider: { async *stream() {
    if (attempts === 1) throw { status: 503 };
    yield { text: "Catalogue-grounded answer" };
  } } })) events.push(event);
  expect(attempts).toBe(2);
  expect(usage).toEqual(["FAILED", "COMPLETE"]);
  expect(events).toEqual([{ type: "delta", text: "Catalogue-grounded answer" }]);

  const consume = async () => {
    for await (const event of orchestrate({ ...context, provider: { async *stream() {
      yield { text: "Partial" };
      throw Object.assign(new Error("Disconnected"), { status: 503 });
    } } })) void event;
  };
  await expect(consume()).rejects.toThrow("Disconnected");
  expect(attempts).toBe(3);
});

test("catalogue works without model calls, keeps its mode and follows enough replies to overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 560 });
  const bootstraps: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith("/api/ai/session")) bootstraps.push(request.method()); });
  await catalogue(page);
  expect(bootstraps).toEqual(["POST"]);
  const older = await send(page, "Do you have 21K gold earrings under PKR 300,000?");
  expect(older.map((event) => event.type)).toEqual(["delta", "done"]);
  expect(older[0].text).toContain("no 21K");
  expect(older[0].text).not.toMatch(/never imply|before claiming|offer the supported purities/i);
  const necklaces = await send(page, "Show me necklaces.");
  expect(necklaces.find((event) => event.type === "cards").cards.map((card: { designCode: string }) => card.designCode)).toEqual(["RSJ-D001", "RSJ-D002", "RSJ-D003", "RSJ-D004"]);
  const filtered = await send(page, "Show me 22K gold rings.");
  expect(filtered.find((event) => event.type === "cards").cards).toContainEqual(expect.objectContaining({ designCode: "RSJ-D005", displayStatus: "IN_STOCK" }));
  await send(page, "Tell me about RSJ-D005.");
  await send(page, "Show me bridal jewellery.");
  const transcript = page.getByLabel("Messages", { exact: true });
  await expect.poll(() => transcript.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(4);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Use live chat", exact: true })).toBeEnabled();
  await expect.poll(() => transcript.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(4);
  const data = await (await page.request.get("/api/ai/conversations")).json();
  expect(data.data.usage).toEqual([]);
  await page.screenshot({ path: "artifacts/auria-audit/catalogue-after.png" });
});

test("a zero-delta provider failure keeps its actual error and retry by the composer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 560 });
  await catalogue(page);
  await send(page, "Show me 22K gold rings.");
  const now = new Date().toISOString();
  await page.route("**/api/ai/chat", async (route) => {
    const id = route.request().postDataJSON().conversationId;
    const { data } = await (await page.request.get("/api/ai/conversations/" + id)).json();
    const failure = { message: "Gemini is temporarily unavailable.", retryable: true };
    data.messages.push({ id: "failed", role: "assistant", text: "", createdAt: now, state: "FAILED", cards: [], errorCode: "PROVIDER_BUSY", failure });
    const events = [{ type: "error", code: "PROVIDER_BUSY", ...failure }, { type: "done", conversation: data }];
    await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: events.map((event) => JSON.stringify(event)).join("\n") + "\n" });
  });
  const events = await send(page, "Hello");
  expect(events.map((event) => event.type)).toEqual(["error", "done"]);
  await expect(page.getByRole("article", { name: "AURIA response" }).last()).toContainText("Gemini is temporarily unavailable.");
  await expect(page.getByText("Partial response", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Retry response", exact: true })).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.screenshot({ path: "artifacts/auria-audit/failure-after.png" });
});

test("catalogue follow-ups, Urdu results and budget carry through to the design draft", async ({ page }) => {
  await catalogue(page);
  await send(page, "Show me 22K gold rings.");
  const comparison = await send(page, "Which one is cheaper? Compare them.");
  const compareDone = comparison.at(-1).conversation.messages.at(-1);
  expect(compareDone.cards.map((card: { designCode: string }) => card.designCode)).toEqual(["RSJ-D005", "RSJ-D007"]);
  expect(compareDone.text).toContain("cannot tell which costs less");
  const first = await send(page, "What was the first ring you showed me?");
  expect(first.at(-1).conversation.messages.at(-1).text).toMatch(/Petal Seal Ring[\s\S]+18K, 22K/);
  await expect(page.getByRole("complementary", { name: "Selected design and quotation" }).getByRole("heading", { name: "Petal Seal Ring" })).toBeVisible();
  const urdu = await send(page, "دلہن کے زیورات دکھائیں");
  expect(urdu.at(-1).conversation.messages.at(-1).text).toMatch(/[\u0600-\u06ff]/u);
  expect(urdu.at(-1).conversation.messages.at(-1).cards).toHaveLength(4);
  await expect(page.locator('.auria-message-text[lang="ur"]').last()).toBeVisible();
  const budget = await send(page, "Show me rings under PKR 300,000.");
  expect(budget.at(-1).conversation.messages.at(-1).text).toContain("quote-only");
  await page.getByRole("article", { name: "AURIA response" }).last().getByRole("button", { name: /RSJ-D005/ }).click();
  const field = page.getByLabel("Your budget in PKR (optional)");
  await expect(field).toHaveValue("300000");
  await field.fill("250000");
  await send(page, "Show me rings under PKR 400,000.");
  await expect(field).toHaveValue("250000");
  await page.screenshot({ path: "artifacts/auria-audit/grounded-budget.png" });
});

test("honest business replies lead to a consented fictional callback with owned status", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 680 });
  await catalogue(page);
  for (const prompt of [
    "Today's 22K gold rate per tola", "Shop address and opening hours", "WhatsApp phone contact",
    "Book a showroom appointment", "Hallmarking and certification", "Delivery outside Islamabad",
    "Old-gold exchange and buyback", "Talk to a human salesperson", "Care tips and payment methods",
  ]) {
    const result = await send(page, prompt);
    expect(result.map((event) => event.type)).toEqual(["delta", "done"]);
    expect(result[0].text).toContain("Contact & visits");
  }
  await page.getByRole("button", { name: "Design & draft", exact: true }).click();
  await page.locator(".auria-contact summary").click();
  await page.getByLabel("Request type").selectOption("APPOINTMENT");
  await page.getByLabel("Fictional request details").fill("Request from an isolated browser test.");
  await page.getByRole("button", { name: "Save contact draft", exact: true }).click();
  const confirm = page.getByRole("button", { name: "Confirm contact request" });
  await expect(confirm).toBeDisabled();
  await page.getByRole("checkbox", { name: "I approve saving this fictional contact request." }).check();
  await confirm.click();
  await expect(page.getByText("Demo contact request saved")).toBeVisible();
  const reference = (await page.locator(".auria-contact-reference").textContent())!;
  expect(reference).toMatch(/^DEMO-C-[A-F0-9]{20}$/);
  await page.getByLabel("Enquiry reference", { exact: true }).fill(reference.toLowerCase());
  await page.getByRole("button", { name: "Check recorded status" }).click();
  await expect(page.getByRole("region", { name: "Find your enquiry" }).getByText("Showroom visit request")).toBeVisible();
  await page.screenshot({ path: "artifacts/auria-audit/callback-status.png" });
});

test("atelier stays in the viewport, opens history and supports wheel image zoom", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [[390, 560], [390, 844], [1366, 768], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/ai-atelier");
    await expect(page.getByLabel("Message AURIA")).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "Use catalogue demo", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => ({ y: scrollY, pageCanScroll: document.documentElement.scrollHeight > innerHeight, horizontalOverflow: document.documentElement.scrollWidth > innerWidth }))).toEqual({ y: 0, pageCanScroll: false, horizontalOverflow: false });
    await page.screenshot({ path: `artifacts/auria-audit/atelier-${width}x${height}.png`, animations: "disabled" });
  }
  const toggle = page.getByRole("button", { name: "Conversation history", exact: true });
  await toggle.click();
  await expect(page.getByRole("complementary", { name: "Conversation history" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await page.getByRole("button", { name: /Inspect image of/ }).click();
  const viewport = page.getByRole("region", { name: "Jewellery photo" });
  await viewport.hover();
  await page.mouse.wheel(0, -180);
  await expect(page.getByRole("button", { name: "Reset zoom" })).toBeVisible();
  await page.getByRole("button", { name: "Reset zoom" }).click();
  await expect(viewport).toHaveAttribute("data-zoom", "false");
});

test("a thread remains browsable after twelve card-heavy catalogue turns", async ({ page }) => {
  test.setTimeout(120_000);
  const longTasks: number[] = [];
  await page.exposeFunction("recordAuriaLongTask", (duration: number) => longTasks.push(duration));
  await page.addInitScript(() => {
    if (!PerformanceObserver.supportedEntryTypes.includes("longtask")) return;
    const recorder = window as typeof window & { recordAuriaLongTask: (value: number) => void };
    new PerformanceObserver((list) => {
      for (const task of list.getEntries()) recorder.recordAuriaLongTask(task.duration);
    }).observe({ type: "longtask", buffered: true });
  });
  await catalogue(page);
  for (let turn = 0; turn < 12; turn++) await send(page, "Show me 22K jewellery.");
  await expect(page.getByRole("article", { name: "AURIA response" })).toHaveCount(12);
  const transcript = page.getByLabel("Messages", { exact: true });
  await expect.poll(() => transcript.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(4);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await writeFile("artifacts/auria-audit/long-thread.json", JSON.stringify({ turns: 12, tasks: longTasks.length, longestTaskMs: Math.max(0, ...longTasks) }));
});

import { test, expect, type APIRequestContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { sampleDesigns } from "../src/data/demo/catalogue";
import type { Conversation } from "../src/types/auria";
const origin = "http://127.0.0.1:3100";
async function bootstrap(request: APIRequestContext) { const response = await request.post("/api/ai/session", { headers: { Origin: origin }, data: {} }); expect(response.ok()).toBe(true); return (await response.json()).data.csrfToken as string; }
function headers(csrf: string) { return { Origin: origin, "X-CSRF-Token": csrf }; }
async function create(request: APIRequestContext, csrf: string) { const response = await request.post("/api/ai/conversations", { headers: headers(csrf), data: { language: "auto" } }); expect(response.status()).toBe(201); return (await response.json()).data as Conversation; }
test("persistent sessions, selection and demo quote require ownership, CSRF and explicit approval", async ({ request, playwright }) => {
  const csrf = await bootstrap(request); const c = await create(request, csrf); const design = sampleDesigns[0];
  const foreign = await playwright.request.newContext({ baseURL: origin }); const foreignCsrf = await bootstrap(foreign);
  expect((await foreign.get(`/api/ai/conversations/${c.id}`)).status()).toBe(404);
  expect((await foreign.post(`/api/ai/conversations/${c.id}/draft`, { headers: headers(foreignCsrf), data: { designId: design.id } })).status()).toBe(404);
  expect((await request.post(`/api/ai/conversations/${c.id}/selection`, { headers: { Origin: origin }, data: { selectedDesignId: design.id, expectedVersion: 0 } })).status()).toBe(403);
  expect((await request.post(`/api/ai/conversations/${c.id}/selection`, { headers: { ...headers(csrf), Origin: "https://evil.example" }, data: { selectedDesignId: design.id, expectedVersion: 0 } })).status()).toBe(403);
  const selection = await request.post(`/api/ai/conversations/${c.id}/selection`, { headers: headers(csrf), data: { selectedDesignId: design.id, expectedVersion: 0 } }); expect(selection.status()).toBe(200);
  expect((await request.post(`/api/ai/conversations/${c.id}/selection`, { headers: headers(csrf), data: { selectedDesignId: design.id, expectedVersion: 0 } })).status()).toBe(409);
  const saved = await request.post(`/api/ai/conversations/${c.id}/draft`, { headers: headers(csrf), data: { designId: design.id, variantId: design.variants[0].id, requestedChanges: "Fictional demo floral detail", budgetPKR: 100000 } }); expect(saved.status()).toBe(200); const draft = (await saved.json()).data;
  expect(draft.status).toBe("DRAFT"); expect(draft.reference).toBeNull();
  expect((await request.get(`/api/ai/conversations/${c.id}`)).headers()["cache-control"]).toContain("no-store");
  expect((await (await request.get(`/api/ai/conversations/${c.id}`)).json()).data.draft.id).toBe(draft.id);
  expect((await request.post(`/api/ai/conversations/${c.id}/submit`, { headers: headers(csrf), data: { expectedVersion: draft.version, processingAccepted: false, fictionalDataConfirmed: true } })).status()).toBe(422);
  const submission = { expectedVersion: draft.version, processingAccepted: true, fictionalDataConfirmed: true };
  const first = (await (await request.post(`/api/ai/conversations/${c.id}/submit`, { headers: headers(csrf), data: submission })).json()).data;
  const second = (await (await request.post(`/api/ai/conversations/${c.id}/submit`, { headers: headers(csrf), data: submission })).json()).data;
  expect(first.status).toBe("SUBMITTED"); expect(first.reference).toBe(second.reference); expect(first.customer.email).toBe("demo@example.invalid"); expect(first.notificationStatus).toBe("NOT_CONFIGURED");
  expect((await request.post(`/api/ai/conversations/${c.id}/draft`, { headers: headers(csrf), data: { designId: design.id } })).status()).toBe(409);
  await foreign.dispose();
});
test("local catalogue stream saves grounded context for a draft without recording provider calls", async ({ request }) => {
  const csrf = await bootstrap(request);
  const conversation = await create(request, csrf);
  const url = `/api/ai/conversations/${conversation.id}`;
  const result = await request.post("/api/ai/chat", { headers: headers(csrf), data: { conversationId: conversation.id, expectedVersion: conversation.version, requestId: randomUUID(), message: "Show me rings.", mode: "catalogue" } });
  expect(result.ok()).toBe(true);
  expect(await result.text()).toContain('"type":"delta"');
  const saved = (await (await request.get(url)).json()).data as Conversation;
  expect(saved.messages.at(-1)).toMatchObject({ source: "CATALOGUE_DEMO", state: "COMPLETE" });
  expect(saved.recentDesignIds.length).toBeGreaterThan(1);
  const reply = await request.post("/api/ai/chat", { headers: headers(csrf), data: { conversationId: saved.id, expectedVersion: saved.version, requestId: randomUUID(), message: "Tell me more about the second ring.", mode: "catalogue" } });
  expect(reply.ok()).toBe(true);
  await reply.text();
  const followed = (await (await request.get(url)).json()).data as Conversation;
  expect(followed.messages.at(-1)?.cards[0]?.id).toBe(saved.recentDesignIds[1]);
  const drafted = await request.post(url + "/draft", { headers: headers(csrf), data: { displayedPosition: 1 } });
  expect(drafted.status()).toBe(200);
  expect((await drafted.json()).data.designId).toBe(saved.recentDesignIds[1]);
  const listing = await request.get("/api/ai/conversations");
  expect((await listing.json()).data.usage).toEqual([]);
});
test("disabled provider returns honest unavailable state without fake assistant message", async ({ request }) => {
  const csrf = await bootstrap(request); const c = await create(request, csrf);
  const r = await request.post("/api/ai/chat", { headers: headers(csrf), data: { conversationId: c.id, expectedVersion: c.version, requestId: randomUUID(), message: "Show me traditional 22K rings" } });
  expect(r.status()).toBe(503); expect((await r.json()).error.code).toBe("CHAT_UNAVAILABLE");
  const stored = (await (await request.get(`/api/ai/conversations/${c.id}`)).json()).data; expect(stored.messages).toEqual([]);
});
test("request and tool-facing draft validation reject spoofed fields, foreign variants and oversize bodies", async ({ request }) => {
  const csrf = await bootstrap(request); const c = await create(request, csrf);
  expect((await request.post(`/api/ai/conversations/${c.id}/draft`, { headers: headers(csrf), data: { designId: sampleDesigns[0].id, variantId: sampleDesigns[1].variants[0].id } })).status()).toBe(422);
  expect((await request.post(`/api/ai/conversations/${c.id}/draft`, { headers: headers(csrf), data: { designId: sampleDesigns[0].id, owner: "someone-else" } })).status()).toBe(422);
  expect((await request.post("/api/ai/chat", { headers: headers(csrf), data: { conversationId: c.id, message: "a".repeat(20000) } })).status()).toBe(413);
  expect((await request.post("/api/ai/does-not-exist", { headers: headers(csrf), data: {} })).status()).toBe(404);
});
for (const width of [320, 390, 768, 1440]) test(`workspace responsive, accessible and persistent draft at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/ai-atelier");
  await expect(page.getByLabel("Message AURIA")).toBeVisible(); await expect(page.getByText("Restoring your atelier…")).toBeHidden();
  await expect(page.getByRole("button", { name: /^Send/ })).toBeDisabled();
  if (width <= 900) await page.getByRole("button", { name: "Design & draft", exact: true }).click();
  await page.locator(".auria-discovery button").first().click(); await expect(page.getByLabel("Requested changes")).toBeVisible();
  await page.getByLabel("Requested changes").fill("A fictional test detail"); await page.getByRole("button", { name: "Save demo draft", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review saved draft" })).toBeVisible(); await expect(page.getByRole("button", { name: "Confirm demo enquiry" })).toBeDisabled();
  await page.reload(); await expect(page.getByText("Restoring your atelier…")).toBeHidden();
  if (width <= 900) await page.getByRole("button", { name: "Design & draft", exact: true }).click();
  await expect(page.getByLabel("Requested changes")).toHaveValue("A fictional test detail");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator(".auria-selection img")).toHaveCount(1); await expect.poll(() => page.locator(".auria-selection img").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze(); expect(scan.violations).toEqual([]);
  await page.screenshot({ path: `artifacts/ai01/selection-${width}.png`, fullPage: true });
  if (width <= 900) await page.getByRole("button", { name: "Conversation", exact: true }).click();
  const composer = await page.getByLabel("Message AURIA").boundingBox();
  const disclosure = await page.locator(".auria-disclosure").boundingBox();
  expect(composer!.width).toBeGreaterThan(150);
  expect(disclosure!.y).toBeGreaterThanOrEqual(composer!.y + composer!.height);
  await page.screenshot({ path: `artifacts/ai01/workspace-${width}.png`, fullPage: true });
  const chatScan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze(); expect(chatScan.violations).toEqual([]);
});
test("browser consumes streamed event protocol and escapes hostile Markdown; fixtures are test-only", async ({ page }) => {
  await page.route("**/api/ai/session", async (route) => { const response = await route.fetch(); const body = await response.json(); body.data.capability.available = true; body.data.capability.reason = "Test fixture only"; await route.fulfill({ response, json: body }); });
  await page.route("**/api/ai/chat", async (route) => {
    const input = route.request().postDataJSON(); const result = await page.request.get(`/api/ai/conversations/${input.conversationId}`); const c = (await result.json()).data as Conversation;
    c.messages = [{ id: randomUUID(), role: "user", text: input.message, state: "COMPLETE", createdAt: new Date().toISOString(), cards: [] }, { id: randomUUID(), role: "assistant", text: "**Test fixture** <img src=x onerror=alert(1)>\n\nیہ صرف ٹیسٹ ہے\n\n| Feature | A | B |\n| --- | --- | --- |\n| Karat | 22K | <b>18K</b> |", state: "COMPLETE", createdAt: new Date().toISOString(), cards: [] }];
    await route.fulfill({ contentType: "application/x-ndjson", body: [{ type: "delta", text: "**Test fixture** " }, { type: "delta", text: "<img src=x onerror=alert(1)>" }, { type: "done", conversation: c }].map((e) => JSON.stringify(e)).join("\n") + "\n" });
  });
  await page.goto("/ai-atelier"); await expect(page.getByText("Restoring your atelier…")).toBeHidden(); await page.getByLabel("Message AURIA").fill("Test protocol"); await page.getByRole("button", { name: /^Send/ }).click();
  await expect(page.locator(".auria-message-text strong")).toHaveText("Test fixture"); await expect(page.locator(".auria-message-text img")).toHaveCount(0); await expect(page.locator(".auria-message-text[lang=ur]")).toBeVisible();
  const table = page.getByRole("region", { name: "Comparison" });
  await expect(table.getByRole("columnheader")).toHaveText(["Feature", "A", "B"]); await expect(table.getByRole("rowheader")).toHaveText("Karat"); await expect(table.locator("td").last()).toHaveText("<b>18K</b>"); await expect(table.locator("b")).toHaveCount(0);
});
test("history and new conversation are functional and do not start model calls", async ({ page }) => {
  let calls = 0; page.on("request", (r) => { if (r.url().endsWith("/api/ai/chat")) calls++; });
  await page.goto("/ai-atelier"); await expect(page.getByText("Restoring your atelier…")).toBeHidden();
  await page.getByRole("button", { name: "＋ New conversation" }).click(); await expect(page.locator(".auria-history-list button")).toHaveCount(1);
  await page.getByRole("button", { name: "＋ New conversation" }).click(); await expect(page.locator(".auria-history-list button")).toHaveCount(2);
  await page.getByRole("button", { name: "Conversation history", exact: true }).click();
  await page.locator(".auria-history-list button").last().click(); await page.reload(); await expect(page.locator(".auria-history-list button")).toHaveCount(2); expect(calls).toBe(0);
});

test("streamed quota error offers explicit retry without automatic provider requests", async ({ page }) => {
  await page.route("**/api/ai/session", async (route) => { const response = await route.fetch(); const body = await response.json(); body.data.capability.available = true; await route.fulfill({ response, json: body }); });
  await page.route("**/api/ai/conversations", async (route) => { const response = await route.fetch(); const body = await response.json(); if (route.request().method() === "GET") body.data.capability.available = true; await route.fulfill({ response, json: body }); });
  let calls = 0;
  await page.route("**/api/ai/chat", async (route) => {
    calls++; const input = route.request().postDataJSON(); const c = (await (await page.request.get(`/api/ai/conversations/${input.conversationId}`)).json()).data as Conversation;
    c.messages = [{ id: randomUUID(), role: "assistant", text: calls === 1 ? "" : "Test-only retry completed.", state: calls === 1 ? "FAILED" : "COMPLETE", createdAt: new Date().toISOString(), cards: [] }];
    const events = calls === 1 ? [{ type: "error", code: "PROVIDER_RATE_LIMIT", message: "Free quota unavailable; no paid fallback used.", retryable: true }, { type: "done", conversation: c }] : [{ type: "delta", text: "Test-only retry completed." }, { type: "done", conversation: c }];
    await route.fulfill({ contentType: "application/x-ndjson", body: events.map((e) => JSON.stringify(e)).join("\n") + "\n" });
  });
  await page.goto("/ai-atelier"); await expect(page.getByRole("button", { name: "＋ New conversation" })).toBeEnabled();
  await page.getByLabel("Message AURIA").fill("Test-only quota case"); await page.getByRole("button", { name: /^Send/ }).click();
  await expect(page.getByRole("button", { name: "Retry response" })).toBeEnabled(); expect(calls).toBe(1);
  await page.getByRole("button", { name: "Retry response" }).click(); await expect(page.getByText("Test-only retry completed.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "＋ New conversation" })).toBeEnabled();
  expect(calls).toBe(2);
});

import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type { ChatEvent, Conversation, QuoteDraft } from "../src/types/auria";

async function ask(page: Page, text: string) {
  await page.getByLabel("Message AURIA").fill(text);
  const output = page.waitForResponse((r) => r.url().endsWith("/api/ai/chat"));
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const response = await output;
  expect(response.ok()).toBe(true);
  const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line) as ChatEvent);
  const terminal = events.at(-1);
  expect(terminal?.type).toBe("done");
  await expect(page.getByLabel("Message AURIA")).toBeEnabled();
  if (terminal?.type !== "done") throw Error("Missing terminal reply");
  return terminal.conversation;
}

test("one concierge carries a grounded mobile conversation into an explicitly confirmed quotation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ai-atelier");
  await expect(page.getByLabel("Message AURIA")).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("button", { name: /Use catalogue demo|Use live chat/ })).toHaveCount(0);
  const search = await ask(page, "Show me 22K gold rings.");
  expect(search.messages.at(-1)?.source).toBe("CATALOGUE_DEMO");
  await expect(page.getByText("Catalogue assistance", { exact: true })).toBeVisible();
  const comparison = await ask(page, "Compare the second ring and first ring. Which is lighter?");
  expect(comparison.messages.at(-1)?.cards.map((card) => card.designCode)).toEqual(["RSJ-D007", "RSJ-D005"]);
  expect(comparison.messages.at(-1)?.text).toContain("weights");
  await ask(page, "My budget is PKR 2.5 lakh.");
  const draft = await ask(page, "Prepare a quote for RSJ-D007 in 22K.");
  expect(draft.draft).toMatchObject({ status: "DRAFT", budgetPKR: 250000, source: { designCode: "RSJ-D007" } });
  expect(draft.draft?.source.variants.find((v) => v.id === draft.draft?.variantId)?.karat).toBe(22);
  await page.getByRole("button", { name: "Review quotation", exact: true }).click();
  const confirm = page.getByRole("button", { name: "Confirm demo enquiry" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel(/I approve saving this fictional demo enquiry/).check();
  await confirm.click();
  await expect(page.getByText("Demo enquiry saved", { exact: true })).toBeVisible();
  await page.getByText("Enquiry brief for the jeweller", { exact: true }).click();
  await expect(page.getByText("Review specifications, pricing and feasibility with the jeweller.")).toBeVisible();
  const reference = (await page.locator(".auria-reference").textContent())!.trim();
  await page.screenshot({ path: "artifacts/auria-phase-4/unified-enquiry-mobile.png" });
  await page.reload();
  await expect(page.getByRole("article", { name: "Your message" })).toHaveCount(4);
  const status = await page.request.get("/api/ai/enquiries/" + reference);
  expect((await status.json()).data).toMatchObject({ status: "SUBMITTED", recordType: "QUOTATION_ENQUIRY" });
});

test("legacy mode records retain identity and draft data in the unified route", async ({ request, baseURL }) => {
  const session = await request.post("/api/ai/session", { headers: { Origin: baseURL! }, data: {} });
  const headers = { Origin: baseURL!, "X-CSRF-Token": (await session.json()).data.csrfToken };
  const created = await request.post("/api/ai/conversations", { headers, data: { language: "auto", mode: "live" } });
  const legacy = (await created.json()).data as Conversation;
  const saved = await request.post("/api/ai/conversations/" + legacy.id + "/draft", { headers, data: { designId: "RSJ-D007", goldPurity: 22 } });
  expect(saved.ok()).toBe(true);
  const quote = (await saved.json()).data as QuoteDraft;
  const input = { requestId: randomUUID(), conversationId: legacy.id, expectedVersion: legacy.version, message: "Doosri wali dikhao." };
  const output = await request.post("/api/ai/chat", { headers, data: input });
  expect(output.ok()).toBe(true);
  const lines = (await output.text()).trim().split("\n");
  const terminal = JSON.parse(lines.at(-1)!);
  expect(terminal.conversation).toMatchObject({ id: legacy.id, mode: "live", draft: { id: quote.id, version: quote.version } });
  expect(terminal.conversation.messages).toHaveLength(2);
  expect(terminal.conversation.messages[1]).toMatchObject({ source: "CATALOGUE_DEMO", assistance: { retryable: false } });
  const replay = await request.post("/api/ai/chat", { headers, data: input });
  expect(JSON.parse((await replay.text()).trim()).conversation.messages).toHaveLength(2);
  const forged = await request.post("/api/ai/chat", { headers, data: { ...input, expectedVersion: terminal.conversation.version, requestId: randomUUID(), retryOf: randomUUID() } });
  expect(forged.status()).toBe(409);
  const history = await request.get("/api/ai/conversations");
  expect((await history.json()).data.usage).toEqual([]);
});

test("contact intent exposes the owned showroom visit draft without sending a message", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/ai-atelier");
  await ask(page, "Can I book a showroom visit?");
  const action = page.getByRole("button", { name: "Contact & visits", exact: true });
  await expect(action).toBeVisible();
  await action.click();
  await expect(page.locator("#auria-contact")).toHaveAttribute("open", "");
  await expect(page.getByLabel("Request type")).toBeVisible();
  await page.getByLabel("Request type").selectOption("APPOINTMENT");
  await page.getByRole("button", { name: "Save contact draft" }).click();
  await expect(page.getByRole("button", { name: "Confirm contact request" })).toBeDisabled();
  await expect(page.getByText("Review your fictional details", { exact: false })).toBeVisible();
});

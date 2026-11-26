import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { configuredGroq, groqModel, parseRetryAfter, providerOrder } from "../src/lib/auria/provider-policy";
import type { ChatEvent } from "../src/types/auria";

test("Groq is fail-closed and configured hosted providers are prioritized ahead of opt-in local inference", () => {
  const free = { AI_CHAT_ENABLED: "true", GROQ_API_KEY: "fixture", GROQ_FREE_TIER_CONFIRMED: "true" };
  expect(configuredGroq(free)).toMatchObject({ available: true, provider: "groq", model: groqModel });
  expect(configuredGroq({ ...free, GROQ_FREE_TIER_CONFIRMED: "false" }).available).toBe(false);
  expect(configuredGroq({ ...free, GROQ_CHAT_MODEL: "unapproved-model" }).available).toBe(false);
  expect(configuredGroq({ ...free, GROQ_API_KEY: " " }).available).toBe(false);
  expect(configuredGroq({ ...free, AI_CHAT_ENABLED: "false" }).available).toBe(false);
  expect(providerOrder({ ...free, GEMINI_API_KEY: "fixture", GEMINI_FREE_TIER_CONFIRMED: "true", AURIA_OLLAMA_ENABLED: "true",
    AURIA_PROVIDER_PRIORITY: "ollama,groq,groq,unknown,gemini" })).toEqual(["groq", "gemini", "ollama"]);
  expect(parseRetryAfter("120")).toBe(120_000);
  expect(parseRetryAfter("bad-value")).toBe(0);
  expect(parseRetryAfter("99999999")).toBe(86_400_000);
});

async function fixtureServer(scenario: "grounded" | "quota" | "partial", check: (origin: string) => Promise<void>) {
  const reserve = createServer();
  reserve.listen(0, "127.0.0.1");
  await once(reserve, "listening");
  const address = reserve.address();
  if (!address || typeof address === "string") throw Error("Could not allocate an isolated test port");
  await new Promise<void>((done) => reserve.close(() => done()));

  const origin = "http://127.0.0.1:" + address.port;
  const preload = resolve("tests/fixtures/auria-hosted-transport.cjs");
  const server = spawn(process.execPath, ["--require", preload, resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(address.port)], {
    windowsHide: true, stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      AI_CHAT_ENABLED: "true", AI_CHAT_MODEL: "gemini-3.1-flash-lite", AI_CHAT_PROVIDER: "gemini",
      GEMINI_API_KEY: "phase5-fixture-gemini", GEMINI_FREE_TIER_CONFIRMED: scenario === "partial" ? "false" : "true",
      GROQ_API_KEY: "phase5-fixture-groq", GROQ_FREE_TIER_CONFIRMED: "true", GROQ_CHAT_MODEL: groqModel,
      AURIA_OLLAMA_ENABLED: "false", AURIA_PROVIDER_PRIORITY: scenario === "quota" ? "groq,gemini" : "gemini,groq",
      AURIA_TEST_STORE: "true", AURIA_TEST_RUN_ID: randomUUID(), AURIA_TEST_PROVIDER_SCENARIO: scenario,
    },
  });
  let startupError = "";
  server.stderr.on("data", (chunk) => { startupError = (startupError + String(chunk)).slice(-1200); });
  try {
    await expect.poll(async () => {
      if (server.exitCode !== null) throw Error("The isolated provider fixture server exited before startup: " + startupError);
      return await fetch(origin + "/design-preview", { signal: AbortSignal.timeout(2000) }).then((response) => response.ok, () => false);
    }, { timeout: 35_000 }).toBe(true);
    await check(origin);
  } finally {
    if (server.exitCode === null) server.kill();
  }
}

async function readTurn(response: Awaited<ReturnType<Page["waitForResponse"]>>) {
  expect(response.ok()).toBe(true);
  const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line) as ChatEvent);
  const terminal = events.at(-1);
  if (terminal?.type !== "done") throw Error("The browser did not receive a complete AURIA envelope");
  return { events, conversation: terminal.conversation };
}

async function ask(page: Page, message: string, info: TestInfo) {
  await page.getByLabel("Message AURIA").fill(message);
  const pending = page.waitForResponse((r) => r.url().endsWith("/api/ai/chat") && r.request().method() === "POST");
  const start = performance.now();
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const result = await readTurn(await pending);
  await expect(page.getByLabel("Message AURIA")).toBeEnabled();
  await info.attach("fixture-turn-timing", {
    body: JSON.stringify({ elapsedMs: Math.round(performance.now() - start), source: result.conversation.messages.at(-1)?.source }),
    contentType: "application/json",
  });
  return result;
}

test("the real chat route uses streamed Groq tools after a simulated Gemini 503 and retains a Roman Urdu follow-up", async ({ page }, info) => {
  test.setTimeout(90_000);
  await fixtureServer("grounded", async (origin) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/ai-atelier");
    await expect(page.getByRole("button", { name: /Use catalogue demo|Use live chat/ })).toHaveCount(0);
    const first = await ask(page, "Show me 22K gold rings.", info);
    const reply = first.conversation.messages.at(-1);
    expect(reply).toMatchObject({ source: "GROQ", state: "COMPLETE" });
    expect(reply?.cards.map((d) => d.designCode)).toEqual(["RSJ-D005", "RSJ-D007"]);
    expect(first.events.filter((e) => e.type === "delta")).toHaveLength(2);
    await expect(page.getByText("Two sample 22K rings. RSJ-D005 and RSJ-D007.")).toBeVisible();
    await expect(page.getByText("Internal fixture reasoning")).toHaveCount(0);

    const second = await ask(page, "Doosri wali dikha do.", info);
    expect(second.conversation.id).toBe(first.conversation.id);
    expect(second.conversation.messages.at(-1)).toMatchObject({ source: "GROQ", state: "COMPLETE", text: "Doosri angoothi RSJ-D007 hai — نمونہ۔" });

    const account = await page.request.get(origin + "/api/ai/conversations");
    const { data } = await account.json();
    expect(data.usage.map((entry: { model: string; state: string }) => [entry.model, entry.state])).toEqual([
      ["gemini-3.1-flash-lite", "FAILED"], ...Array.from({ length: 4 }, () => [groqModel, "COMPLETE"]),
    ]);
    expect(data.usage[4]).toMatchObject({ inputTokens: 120, outputTokens: 19, totalTokens: 139 });
    expect(data.capability).toMatchObject({ provider: "groq", referenceAvailable: true, lastVerifiedAt: expect.any(String) });
    await page.reload();
    await expect(page.getByRole("article", { name: "Your message" })).toHaveCount(2);
    await expect(page.getByText("Doosri angoothi RSJ-D007 hai — نمونہ۔")).toBeVisible();
  });
});

test("simulated Groq 429 and Gemini 503 cool down into honestly labelled catalogue assistance", async ({ page }, info) => {
  test.setTimeout(90_000);
  await fixtureServer("quota", async (origin) => {
    await page.goto(origin + "/ai-atelier");
    for (const text of ["Show me 22K gold rings.", "Do you have 21K gold rings?"]) {
      const result = await ask(page, text, info);
      expect(result.conversation.messages.at(-1)).toMatchObject({ source: "CATALOGUE_DEMO", state: "COMPLETE" });
    }
    await expect(page.getByText("Catalogue assistance", { exact: true })).toHaveCount(2);
    const account = await page.request.get(origin + "/api/ai/conversations");
    const { data } = await account.json();
    expect(data.usage.map((entry: { model: string; state: string }) => [entry.model, entry.state])).toEqual([
      [groqModel, "FAILED"], ["gemini-3.1-flash-lite", "FAILED"],
    ]);
  });
});

test("a truncated hosted stream cannot silently switch providers after text and retry preserves the user message", async ({ page }, info) => {
  test.setTimeout(90_000);
  await fixtureServer("partial", async (origin) => {
    await page.goto(origin + "/ai-atelier");
    const first = await ask(page, "Hello", info);
    expect(first.conversation.messages.at(-1)).toMatchObject({ source: "GROQ", state: "FAILED", errorCode: "PROVIDER_INCOMPLETE" });
    expect(first.events.some((event) => event.type === "source" && event.source === "CATALOGUE_DEMO")).toBe(false);
    await expect(page.getByText("Fixture partial reply")).toBeVisible();

    const pending = page.waitForResponse((r) => r.url().endsWith("/api/ai/chat") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Retry response" }).click();
    const retry = await readTurn(await pending);
    expect(retry.conversation.id).toBe(first.conversation.id);
    expect(retry.conversation.messages).toHaveLength(2);
    expect(retry.conversation.messages[0].id).toBe(first.conversation.messages[0].id);
    expect(retry.conversation.messages[1]).toMatchObject({ id: first.conversation.messages[1].id, source: "CATALOGUE_DEMO", state: "COMPLETE" });
    await expect(page.getByText("Catalogue assistance", { exact: true })).toBeVisible();
  });
});

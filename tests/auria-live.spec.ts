import { expect, test } from "@playwright/test";
import { orchestrate } from "../src/lib/auria/orchestrate";
import { canUseLocalFallback } from "../src/lib/auria/provider-policy";
import { AuriaError } from "../src/lib/auria/validation";
import { rankVisualMatches, referenceJpegSize, visualObservation } from "../src/lib/auria/visual-reference";
import type { ProviderChunk } from "../src/types/auria";
import type { DesignCardData } from "../src/types/catalogue";

const visualSample = visualObservation.parse({
  type: "ring", tone: "yellow", stones: ["clear"], shapes: ["oval"], features: ["floral"],
});

test("live output must follow a successful tool result, and invalid tools cannot unlock it", async () => {
  const generate = async function* (fail: boolean) {
    let round = 0;
    yield* orchestrate({
      system: "", history: [], signal: new AbortController().signal,
      groundFirst: true, beforeCall: () => String(round), usage: () => undefined,
      execute: () => ({ data: fail ? { error: "INVALID_TOOL_ARGUMENTS" } : { designCode: "RSJ-D007" } }),
      provider: { async *stream(input): AsyncGenerator<ProviderChunk> {
        if (round++ === 0) {
          expect(input.requireTool).toBe(true);
          yield { text: "An unsupported price claim" };
          yield { calls: [{ name: "getProductDetails", args: { designId: "RSJ-D007" } }], continuation: {} };
          return;
        }
        expect(input.requireTool).toBe(fail);
        yield { text: "Retrieved design RSJ-D007." };
      } },
    });
  };
  const events = [];
  for await (const event of generate(false)) events.push(event);
  expect(events).toEqual([{ type: "delta", text: "Retrieved design RSJ-D007." }]);
  await expect(generate(true).next()).rejects.toMatchObject({ code: "GROUNDING_REQUIRED" });
});

test("local provider fallback is limited to upstream failures, and respects the application cap", () => {
  for (const status of [401, 403, 404, 429, 503, 504]) expect(canUseLocalFallback({ status })).toBe(true);
  expect(canUseLocalFallback({ status: 400, message: "Invalid request" })).toBe(false);
  expect(canUseLocalFallback(new AuriaError("RATE_LIMITED", "Application cap", 429))).toBe(false);
  expect(canUseLocalFallback(new AuriaError("GROUNDING_REQUIRED", "Missing verified facts", 502))).toBe(false);
});

test("vision schema rejects invented product facts and visual matching ranks actual candidate attributes", () => {
  expect(visualObservation.safeParse({ ...visualSample, karat: 22 }).success).toBe(false);
  const cards = [
    { id: "a", categorySlug: "rings", subcategorySlug: "bands", title: "Simple band", description: "Clean silhouette" },
    { id: "b", categorySlug: "earrings", subcategorySlug: "studs", title: "Floral oval earrings", description: "Floral" },
    { id: "c", categorySlug: "rings", subcategorySlug: "bands", title: "Oval blossom ring", description: "Floral mount" },
  ] as DesignCardData[];
  expect(rankVisualMatches(visualSample, cards).map((card) => card.id)).toEqual(["c", "a"]);
  expect(rankVisualMatches({ ...visualSample, type: "unclear" }, cards)).toEqual([]);
  const header = Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0, 8, 8, 0, 120, 1, 64, 0, 0xff, 0xd9]);
  expect(referenceJpegSize(header)).toEqual({ width: 320, height: 120 });
  expect(referenceJpegSize(header.slice(0, -1))).toBeNull();
});

test("vision requests require browser ownership, consent and an approved provider", async ({ request, baseURL }) => {
  const content = { "Content-Type": "image/jpeg", Origin: baseURL! };
  const anonymous = await request.post("/api/ai/reference", { headers: content, data: Buffer.from("sample") });
  expect(anonymous.status()).toBe(401);
  const session = await request.post("/api/ai/session", { headers: { Origin: baseURL! }, data: {} });
  expect(session.ok()).toBe(true);
  const csrf = (await session.json()).data.csrfToken;
  const headers = { ...content, "X-CSRF-Token": csrf };
  const withoutConsent = await request.post("/api/ai/reference", { headers, data: Buffer.from("sample") });
  expect((await withoutConsent.json()).error.code).toBe("REFERENCE_CONSENT");
  const unavailable = await request.post("/api/ai/reference", { headers: { ...headers, "X-Auria-Reference-Consent": "1" }, data: Buffer.from("sample") });
  expect(unavailable.status()).toBe(503);
  expect((await unavailable.json()).error.code).toBe("CHAT_UNAVAILABLE");
  const history = await request.get("/api/ai/conversations");
  expect((await history.json()).data.usage).toEqual([]);
});

test("photo sharing is opt-in, local matching survives upstream quota, and a selected observation persists", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/ai/session", async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    payload.data.capability.available = true;
    await route.fulfill({ response, json: payload });
  });
  let uploads = 0;
  await page.route("**/api/ai/reference", async (route) => {
    uploads++;
    const headers = route.request().headers();
    expect(headers["content-type"]).toBe("image/jpeg");
    expect(headers["x-auria-reference-consent"]).toBe("1");
    expect(route.request().postDataBuffer()?.length).toBeLessThan(1_048_576);
    if (uploads === 1) {
      await route.fulfill({ status: 429, json: { error: { message: "Gemini’s free quota is unavailable." } } });
      return;
    }
    const data = await (await page.request.get("/api/designs?q=RSJ-D007&limit=1")).json();
    await route.fulfill({ json: { data: { observation: visualSample, matches: data.data.items } } });
  });
  await page.goto("/ai-atelier");
  await page.getByRole("button", { name: "Add reference image" }).click();
  const dialog = page.getByRole("dialog", { name: "Jewellery reference" });
  await dialog.locator("input[type=file]").setInputFiles("public/images/catalogue/design-007-480.webp");
  await expect(dialog.getByRole("heading", { name: "Closest color matches" })).toBeVisible();
  expect(uploads).toBe(0);
  await dialog.getByRole("button", { name: "Analyze with Gemini" }).click();
  await expect(dialog.getByRole("alert")).toContainText("free quota");
  await expect(dialog.getByRole("heading", { name: "Closest color matches" })).toBeVisible();
  await dialog.getByRole("button", { name: "Analyze with Gemini" }).click();
  const vision = dialog.getByRole("region", { name: "Visual observations" });
  await expect(vision).toContainText("yellow metal appearance");
  await expect(vision).toContainText("A photo cannot verify purity");
  const image = vision.getByRole("img").first();
  await expect(image).toBeVisible();
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: "artifacts/auria-live/reference-mobile.png" });
  await vision.getByRole("button", { name: /RSJ-D007/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Include photo appearance note" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Design & draft", exact: true }).click();
  await page.getByRole("button", { name: "Include photo appearance note" }).click();
  await expect(page.getByLabel("Customer instructions")).toHaveValue(/Photo appearance reference: ring/);
});

test("opt-in Urdu pack and playback use local voices and can be interrupted", async ({ page }) => {
  await page.addInitScript(() => {
    let installed = false;
    class MockSpeech {
      processLocally = false;
      lang = "";
      onstart?: () => void;
      onresult?: (event: { results: { transcript: string }[][] }) => void;
      onend?: () => void;
      static async available(options: { langs: string[]; processLocally: boolean }) {
        if (options.langs[0] !== "ur-PK" || !options.processLocally) return "unavailable";
        return installed ? "available" : "downloadable";
      }
      static async install(options: { langs: string[]; processLocally: boolean }) {
        installed = options.langs[0] === "ur-PK" && options.processLocally;
        return installed;
      }
      start() {
        if (this.lang !== "ur-PK" || !this.processLocally) throw new Error("Unexpected dictation mode");
        this.onstart?.();
        this.onresult?.({ results: [[{ transcript: "سونے کی انگوٹھیاں دکھائیں" }]] });
        this.onend?.();
      }
      abort() {}
    }
    class MockUtterance {
      lang = "";
      voice?: { localService: boolean };
      onstart?: () => void;
      onend?: () => void;
    }
    Object.defineProperty(window, "SpeechRecognition", { value: MockSpeech });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: MockUtterance });
    Object.defineProperty(window, "speechSynthesis", { value: {
      getVoices: () => [{ localService: false, lang: "ur-PK" }, { localService: true, lang: "ur-PK" }],
      speak(utterance: MockUtterance) { if (utterance.lang !== "ur-PK" || !utterance.voice?.localService) throw Error("Expected local Urdu voice"); utterance.onstart?.(); },
      cancel() { document.documentElement.dataset.testPlaybackStopped = "true"; },
    } });
  });
  await page.goto("/ai-atelier");
  await page.getByRole("button", { name: "Use catalogue demo", exact: true }).click();
  await page.getByRole("button", { name: "Conversation history", exact: true }).click();
  await page.getByLabel("Dictation language").selectOption("ur-PK");
  await page.getByRole("button", { name: "Close history" }).click();
  await page.getByRole("button", { name: "Dictate", exact: true }).click();
  await page.getByRole("button", { name: "Install Urdu dictation pack" }).click();
  await expect(page.getByText("Language pack ready. Select Dictate to start.")).toBeVisible();
  await page.getByRole("button", { name: "Dictate", exact: true }).click();
  await expect(page.getByLabel("Message AURIA")).toHaveValue("سونے کی انگوٹھیاں دکھائیں");
  await expect(page.getByRole("article", { name: "Your message" })).toHaveCount(0);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("button", { name: "Read reply aloud" }).click();
  await expect(page.getByText("Reading aloud…")).toBeVisible();
  await page.getByRole("button", { name: "Stop voice" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-test-playback-stopped", "true");
  await expect(page.getByRole("button", { name: "Read reply aloud" })).toBeVisible();
});

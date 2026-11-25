import { expect, test } from "@playwright/test";
import { sampleDesigns, sampleStock } from "../src/data/demo/catalogue";
import { cardProjection } from "../src/lib/catalogue/domain";
import { providerHistory } from "../src/lib/auria/provider-history";
import { canUseLocalFallback, isTransientProviderFailure, providerError } from "../src/lib/auria/provider-policy";
import { rankVisualMatches, visualObservation } from "../src/lib/auria/visual-reference";
import type { ChatMessage } from "../src/types/auria";

test("visual evidence ranks published catalogue descriptions and distinguishes patterns from stones", () => {
  const cards = sampleDesigns.filter((d) => d.publicationState === "PUBLISHED").map((d) => cardProjection(d, sampleStock));
  const sample = { tone: "yellow", stones: ["clear"], shapes: ["arch"], settings: ["bezel"], patterns: ["openwork"], features: ["filigree"] };
  const ring = rankVisualMatches(visualObservation.parse({ ...sample, type: "ring" }), cards);
  expect(ring.matches[0]).toMatchObject({ designCode: "RSJ-D007", categorySlug: "rings" });
  expect(ring.reasons[ring.matches[0].id]).toContain("openwork pattern");
  expect(ring.reasons[ring.matches[0].id].join(" ")).not.toMatch(/stone|bezel|purity/i);
  for (const [type, category] of [["necklace", "bridal"], ["bangle", "bangles"], ["bridal-set", "bridal"]] as const) {
    const result = rankVisualMatches(visualObservation.parse({ ...sample, type }), cards);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches.every((card) => card.categorySlug === category)).toBe(true);
  }
  for (const type of ["earrings", "pendant", "other jewellery", "not jewellery", "unclear"]) {
    expect(rankVisualMatches(visualObservation.parse({ ...sample, type }), cards).matches).toHaveLength(0);
  }
  expect(visualObservation.safeParse({ ...sample, type: "ring", stock: true }).success).toBe(false);
});

test("provider context retains complete pairs and the new question while transport failures remain recoverable", () => {
  const message = (role: ChatMessage["role"], text: string, state: ChatMessage["state"] = "COMPLETE"): ChatMessage =>
    ({ role, text, state, id: text, cards: [], createdAt: "" });
  expect(providerHistory([
    message("user", "Show some rings"), message("assistant", "Here are two rings"),
    message("user", "Show details"), message("assistant", "Partial answer", "FAILED"),
    message("user", "Compare the second"), message("assistant", "", "STREAMING"),
  ])).toEqual([
    { role: "user", text: "Show some rings" }, { role: "assistant", text: "Here are two rings" },
    { role: "user", text: "Compare the second" },
  ]);
  const long = Array.from({ length: 9 }, () => [message("user", "a".repeat(4000)), message("assistant", "b".repeat(4000))]).flat();
  expect(providerHistory([...long, message("user", "c".repeat(4000))]).reduce((sum, entry) => sum + entry.text.length, 0)).toBeLessThanOrEqual(12_000);
  const reset = new TypeError("fetch failed", { cause: { code: "ECONNRESET" } });
  expect(providerError(reset).code).toBe("PROVIDER_NETWORK");
  expect(isTransientProviderFailure(reset)).toBe(true);
  expect(canUseLocalFallback(reset)).toBe(true);
  expect(isTransientProviderFailure({ status: 429 })).toBe(false);
  expect(isTransientProviderFailure(new TypeError("TLS", { cause: { code: "SELF_SIGNED_CERT_IN_CHAIN" } }))).toBe(false);
});

test("a local photo preview and category browse work while the hosted rate limit prevents duplicate uploads", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/ai/session", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.capability.available = true;
    await route.fulfill({ response, json: body });
  });
  let uploads = 0;
  const localFetches: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "fetch" && new URL(request.url()).pathname.startsWith("/images/catalogue/")) localFetches.push(request.url());
  });
  await page.route("**/api/ai/reference", async (route) => {
    uploads++;
    await route.fulfill({ status: 429, headers: { "Retry-After": "60" }, json: { error: { message: "Gemini’s free quota is unavailable." } } });
  });
  await page.goto("/ai-atelier");
  await page.getByRole("button", { name: "Add reference image" }).click();
  const dialog = page.getByRole("dialog", { name: "Jewellery reference" });
  await dialog.locator("input[type=file]").setInputFiles("public/images/catalogue/design-007-480.webp");
  await expect(dialog.getByRole("img", { name: "Your local reference preview" })).toBeVisible();
  const local = dialog.getByRole("region", { name: "Local catalogue matches" });
  await expect(local.getByRole("heading", { name: "Closest color matches" })).toBeVisible();
  expect(uploads).toBe(0);
  expect(localFetches).toEqual([]);
  await dialog.getByRole("button", { name: "Analyze with Gemini" }).click();
  await expect(dialog.getByRole("alert")).toContainText("free quota");
  await expect(dialog.getByRole("button", { name: "Analyze with Gemini" })).toBeDisabled();
  await local.getByLabel("Jewellery type").selectOption("bangles");
  await expect(local.getByRole("listitem")).toHaveCount(2);
  await expect(local.getByText("Tidal Cuff")).toBeVisible();
  expect(uploads).toBe(1);
  await page.screenshot({ path: "artifacts/auria-vision-voice/vision-mobile.png" });
});

test("mobile Urdu voice mode cancels stale transcripts and auto-plays one new completed reply", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const transcript = "سونے کی انگوٹھیاں دکھائیں";
    class MockRecognition {
      processLocally = false;
      lang = "";
      onstart?: () => void;
      onspeechstart?: () => void;
      onspeechend?: () => void;
      onresult?: (event: { results: { transcript: string }[][] }) => void;
      onend?: () => void;
      static async available(options: { langs: string[]; processLocally: boolean }) {
        return options.processLocally && options.langs[0] === "ur-PK" ? "available" : "unavailable";
      }
      start() { if (!this.processLocally || this.lang !== "ur-PK") throw Error("Expected local Urdu"); this.onstart?.(); this.onspeechstart?.(); }
      stop() { this.onspeechend?.(); this.onresult?.({ results: [[{ transcript }]] }); this.onend?.(); }
      abort() { this.onresult?.({ results: [[{ transcript: "Stale transcript" }]] }); this.onend?.(); }
    }
    class MockUtterance {
      lang = "";
      voice?: { localService: boolean };
      onstart?: () => void;
    }
    const bump = (key: string) => sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? 0) + 1));
    Object.defineProperty(window, "SpeechRecognition", { value: MockRecognition });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: MockUtterance });
    Object.defineProperty(window, "speechSynthesis", { value: {
      getVoices: () => [{ lang: "ur-PK", localService: true }, { lang: "en-US", localService: true }],
      speak(utterance: MockUtterance) {
        if (utterance.lang !== "ur-PK" || !utterance.voice?.localService) throw Error("Expected local Urdu playback");
        bump("speech-count"); utterance.onstart?.();
      },
      cancel() { bump("cancel-count"); },
    } });
  });
  await page.goto("/ai-atelier");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.getByLabel("Dictation language").selectOption("ur-PK");
  await page.getByRole("button", { name: "Conversation", exact: true }).click();
  await page.getByRole("button", { name: "Voice mode", exact: true }).click();
  await page.getByRole("button", { name: "Dictate", exact: true }).click();
  const stage = page.locator("main.auria-workspace");
  await expect(stage).toHaveAttribute("data-voice-activity", "microphone");
  const orb = stage.locator(".atelier-orb__voice i").first();
  await expect(orb).toHaveCSS("animation-name", "none");
  await page.getByRole("button", { name: "Cancel dictation" }).click();
  await expect(page.getByLabel("Message AURIA")).toHaveValue("");
  await page.getByRole("button", { name: "Dictate", exact: true }).click();
  await page.getByRole("button", { name: "Finish dictation" }).click();
  await expect(page.getByLabel("Message AURIA")).toHaveValue("سونے کی انگوٹھیاں دکھائیں");
  await expect(page.getByRole("article", { name: "Your message" })).toHaveCount(0);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(stage).toHaveAttribute("data-voice-activity", "speaker");
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("speech-count"))).toBe("1");
  await page.screenshot({ path: "artifacts/auria-vision-voice/voice-mobile.png" });
  await page.getByRole("button", { name: "Stop voice" }).click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("cancel-count"))).toBe("1");
  await page.reload();
  await expect(page.getByRole("article", { name: "AURIA response" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Voice mode", exact: true })).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => sessionStorage.getItem("speech-count"))).toBe("1");
});

test("voice mode reads the English retry once after a failed turn", async ({ page }) => {
  await page.addInitScript(() => {
    class MockUtterance {
      lang = "";
      voice?: { localService: boolean };
      onstart?: () => void;
      onend?: () => void;
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: MockUtterance });
    Object.defineProperty(window, "speechSynthesis", { value: {
      getVoices: () => [{ lang: "en-US", localService: true }],
      speak(utterance: MockUtterance) {
        if (utterance.lang !== "en-US" || !utterance.voice?.localService) throw Error("Expected local English");
        document.documentElement.dataset.speechCount = String(Number(document.documentElement.dataset.speechCount ?? 0) + 1);
        utterance.onstart?.();
        utterance.onend?.();
      },
      cancel() {},
    } });
  });
  let chatAttempts = 0;
  await page.route("**/api/ai/chat", async (route) => {
    if (++chatAttempts === 1) {
      await route.fulfill({ status: 503, json: { error: { message: "The response service is temporarily unavailable.", retryable: true } } });
      return;
    }
    await route.continue();
  });
  await page.goto("/ai-atelier");
  await page.getByRole("button", { name: "Voice mode", exact: true }).click();
  await page.getByLabel("Message AURIA").fill("Show me 22K gold rings.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "temporarily unavailable" })).toBeVisible();
  expect(await page.locator("html").getAttribute("data-speech-count")).toBeNull();
  await page.getByRole("button", { name: "Retry response" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-speech-count", "1");
  expect(chatAttempts).toBe(2);
});

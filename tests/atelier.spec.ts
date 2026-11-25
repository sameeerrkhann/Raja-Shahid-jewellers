import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("both existing homepage AURIA links open directly into the conversation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const name of ["Meet AURIA", "Design with AURIA"]) {
    await page.goto("/");
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(/\/ai-atelier$/);
    await expect(page.getByLabel("Message AURIA")).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});

for (const [width, height] of [[1440, 900], [1280, 660], [768, 900], [390, 844], [320, 568]]) {
  test(`conversation and send control are in the first viewport at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/ai-atelier");
    await expect(page.getByRole("heading", { name: /AURIA Jewellery Atelier/ })).toBeVisible();
    await expect(page.getByLabel("Message AURIA")).toBeEnabled();
    await expect(page.getByLabel("Message AURIA")).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "Send", exact: true })).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => ({ scroll: scrollY, overflow: document.documentElement.scrollWidth > innerWidth }))).toEqual({ scroll: 0, overflow: false });
    expect(await page.locator(".atelier-orb__sphere").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    expect(errors).toEqual([]);
    if (width === 1440 || width === 390) {
      await page.screenshot({ path: `artifacts/atelier/workspace-${width}.png` });
      const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(scan.violations).toEqual([]);
    }
  });
}

test("local catalogue conversation persists and can lead to a saved, trackable enquiry", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ai-atelier");
  await page.getByRole("button", { name: "22K gold rings" }).click();
  await expect(page.getByLabel("Message AURIA")).toHaveValue("Show me 22K gold rings.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const reply = page.getByRole("article", { name: "AURIA response" }).last();
  await expect(reply.getByText("Catalogue assistance", { exact: true })).toBeVisible();
  await expect(reply.getByText("These pieces come from the sample catalogue.")).toBeVisible();
  const jali = reply.locator(".auria-recommendations button").filter({ hasText: "RSJ-D007" });
  await jali.click();
  await expect(page.getByRole("heading", { name: "Jali Arch Ring", exact: true })).toBeVisible();
  await page.getByLabel("Requested changes").fill("A finer pattern for fictional review");
  await page.getByRole("button", { name: "Save demo draft" }).click();
  await expect(page.getByRole("heading", { name: "Review saved draft" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm demo enquiry" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /I approve saving/ }).check();
  await page.getByRole("button", { name: "Confirm demo enquiry" }).click();
  await expect(page.getByText("Demo enquiry saved", { exact: true })).toBeVisible();
  const ref = (await page.locator(".auria-reference").textContent())!.trim();
  expect(ref).toMatch(/^DEMO-Q-[A-F0-9]{32}$/);
  await page.reload();
  await expect(page.getByText("Catalogue assistance", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Design & draft", exact: true }).click();
  await page.getByLabel("Enquiry reference", { exact: true }).fill(ref);
  await page.getByRole("button", { name: "Check recorded status" }).click();
  const record = page.getByRole("region", { name: "Find your enquiry" });
  await expect(record.getByText(ref, { exact: true })).toBeVisible();
  await expect(record.locator('[aria-current="step"]')).toContainText("Submitted");
  await record.getByText(ref, { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/atelier/enquiry-mobile.png" });
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(scan.violations).toEqual([]);
});

test("the image stage cycles and opens keyboard-dismissable photo zoom", async ({ page }) => {
  await page.goto("/ai-atelier");
  const stage = page.getByRole("complementary", { name: "Selected design and quotation" });
  const first = await stage.getByRole("heading", { level: 2 }).textContent();
  await stage.getByRole("button", { name: "Next design image" }).click();
  await expect(stage.getByRole("heading", { level: 2 })).not.toHaveText(first!);
  const inspect = stage.getByRole("button", { name: /Inspect image of/ });
  await inspect.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Zoom in" }).click();
  await expect(dialog.getByRole("button", { name: "Reset zoom" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(inspect).toBeFocused();
});

test("reference format validation and local matching link a note to an editable draft", async ({ page }) => {
  await page.goto("/ai-atelier");
  await page.getByRole("button", { name: "Add reference image" }).click();
  const dialog = page.getByRole("dialog", { name: "Jewellery reference" });
  const input = dialog.locator("input[type=file]");
  await input.setInputFiles({ name: "incorrect.png", mimeType: "image/png", buffer: Buffer.from("bad") });
  await expect(dialog.getByRole("alert")).toContainText("format could not be verified");
  await input.setInputFiles("public/images/catalogue/design-007-480.webp");
  await expect(dialog.getByRole("img", { name: "Your local reference preview" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Closest color matches" })).toBeVisible();
  await dialog.getByRole("listitem").first().getByRole("button").click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Include photo color note" }).click();
  await expect(page.getByLabel("Customer instructions")).toHaveValue(/Photo color reference: RGB/);
});

test("voice permission denial leaves typing available and reports the browser limitation", async ({ page, request }) => {
  const home = await request.get("/");
  expect(home.headers()["permissions-policy"]).toContain("microphone=()");
  const atelier = await request.get("/ai-atelier");
  expect(atelier.headers()["permissions-policy"]).toContain("microphone=(self)");
  await page.addInitScript(() => {
    class DeniedSpeech {
      processLocally = false;
      onerror?: (event: { error: string }) => void;
      static async available() { return "available"; }
      start() { this.onerror?.({ error: "not-allowed" }); }
      abort() {}
    }
    Object.defineProperty(window, "SpeechRecognition", { value: DeniedSpeech, configurable: true });
  });
  await page.goto("/ai-atelier");
  await page.getByRole("button", { name: "Dictate", exact: true }).click();
  await expect(page.getByText(/Microphone access was denied/)).toBeVisible();
  await page.getByLabel("Message AURIA").fill("A typed question");
  await expect(page.getByLabel("Message AURIA")).toHaveValue("A typed question");
});

test("on-device dictation populates the editable composer without sending", async ({ page }) => {
  await page.addInitScript(() => {
    class LocalSpeech {
      processLocally = false;
      onstart?: () => void;
      onresult?: (event: { results: { transcript: string }[][] }) => void;
      onend?: () => void;
      static async available(options: { langs: string[]; processLocally: boolean }) {
        return options.processLocally && options.langs[0] === "en-US" ? "available" : "unavailable";
      }
      start() {
        if (!this.processLocally) throw new Error("Remote speech must not start");
        this.onstart?.();
        this.onresult?.({ results: [[{ transcript: "Show gold rings" }]] });
        this.onend?.();
      }
      abort() {}
    }
    Object.defineProperty(window, "SpeechRecognition", { value: LocalSpeech, configurable: true });
  });
  await page.goto("/ai-atelier");
  await page.getByRole("button", { name: "Dictate", exact: true }).click();
  await expect(page.getByLabel("Message AURIA")).toHaveValue("Show gold rings");
  await expect(page.getByRole("article", { name: "Your message" })).toHaveCount(0);
});

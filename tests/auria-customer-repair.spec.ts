import { expect, test, type Page } from "@playwright/test";
import type { ChatEvent } from "../src/types/auria";

const evidence = "artifacts/auria-customer-repair";
const composer = (page: Page) => page.getByLabel("Message AURIA");
const selected = (page: Page) => page.getByRole("region", { name: "Selected jewellery" });
const stage = (page: Page) => page.getByRole("complementary", { name: "Selected design and quotation" });

async function ask(page: Page, message: string) {
  await composer(page).fill(message);
  const output = page.waitForResponse((response) => response.url().endsWith("/api/ai/chat"));
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const response = await output;
  expect(response.ok()).toBeTruthy();
  const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line) as ChatEvent);
  const completed = events.at(-1);
  if (completed?.type !== "done") throw new Error("Missing saved response");
  await expect(composer(page)).toBeEnabled();
  return { conversation: completed.conversation, reply: completed.conversation.messages.at(-1)! };
}

function cards(reply: Awaited<ReturnType<typeof ask>>["reply"]) {
  return reply.cards.map(({ designCode }) => designCode);
}

async function showPane(page: Page, name: "History" | "Design & draft", mobile: boolean) {
  if (mobile) await page.getByRole("navigation", { name: "Workspace views" }).getByRole("button", { name, exact: true }).click();
  else if (name === "History") await page.getByRole("button", { name: "Conversation history", exact: true }).click();
}

async function returnToChat(page: Page, mobile: boolean, pane: "History" | "Design & draft") {
  if (mobile) {
    const area = pane === "History" ? page.getByRole("complementary", { name: "Conversation history" }) : stage(page);
    await area.getByRole("button", { name: /Back to conversation/i }).click();
    await expect(page.getByRole("heading", { name: "Conversation", exact: true })).toBeFocused();
  } else if (pane === "History") {
    await page.getByRole("button", { name: "Close history" }).click();
  }
  await expect(composer(page)).toBeInViewport({ ratio: 1 });
}

for (const [width, height] of [[1440, 900], [390, 844], [360, 740]]) {
  test(`chat guides a customer to a saved quotation and handoff at ${width} × ${height}`, async ({ page, context }) => {
    const mobile = width < 901;
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/ai-atelier");
    const starters = ["Find Jewellery", "Plan Bridal Jewellery", "Share Reference"];
    for (const name of starters) await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Inspect image of|Catalogue Demo|Live AI/ })).toHaveCount(0);
    await expect(composer(page)).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: `${evidence}/welcome-${width}.png` });
    await page.getByRole("button", { name: "Share Reference", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Jewellery reference" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Find Jewellery", exact: true }).click();
    await expect(composer(page)).toHaveValue("Show me 22K gold rings.");
    const rings = await ask(page, "I’m looking for a 22K engagement ring. My budget is PKR 250000.");
    expect(rings.reply.text).toContain("engagement ring");
    expect(cards(rings.reply)).toEqual(["RSJ-D005", "RSJ-D007"]);
    const compare = await ask(page, "Compare the first ring and second ring.");
    expect(cards(compare.reply)).toEqual(["RSJ-D005", "RSJ-D007"]);
    expect(compare.reply.text).toContain("weights");
    await page.getByRole("article", { name: "AURIA response" }).last().getByRole("button", { name: /RSJ-D005/ }).click();
    await expect(selected(page)).toContainText("Petal Seal Ring");
    await expect(composer(page)).toBeInViewport({ ratio: 1 });
    for (const name of ["Compare", "Customize", "Request quote"]) {
      await expect(selected(page).getByRole("button", { name, exact: true })).toBeEnabled();
    }
    await selected(page).getByRole("button", { name: "Compare", exact: true }).click();
    await expect(composer(page)).toHaveValue("Compare RSJ-D005 and RSJ-D007.");
    await selected(page).getByRole("button", { name: "Customize", exact: true }).click();
    const changes = page.getByLabel("Requested changes");
    await expect(changes).toBeFocused();
    await changes.fill("Unsaved detail stays when returning to chat");
    await returnToChat(page, mobile, "Design & draft");
    await selected(page).getByRole("button", { name: "Request quote", exact: true }).click();
    await expect(changes).toHaveValue("Unsaved detail stays when returning to chat");
    await returnToChat(page, mobile, "Design & draft");
    await page.screenshot({ path: `${evidence}/selected-${width}.png` });

    await showPane(page, "History", mobile);
    await page.getByLabel("Reply language").selectOption("roman-ur");
    await returnToChat(page, mobile, "History");
    const quote = await ask(page, "Iski quotation bana do");
    expect(quote.reply.text).toContain("Demo quotation draft tayyar hai");
    expect(quote.conversation.language).toBe("roman-ur");
    expect(quote.conversation.draft).toMatchObject({ budgetPKR: 250000, source: { designCode: "RSJ-D005" }, status: "DRAFT" });
    const draft = quote.conversation.draft!;
    expect(draft.source.variants.find((variant) => variant.id === draft.variantId)?.karat).toBe(22);
    await page.getByRole("button", { name: "Review quotation", exact: true }).click();
    const panel = page.getByRole("region", { name: "Demo quotation draft" });
    await expect(panel).toContainText("To be confirmed by the jeweller.");
    await expect(page.getByLabel("Your budget in PKR (optional)", { exact: true })).toHaveValue("250000");
    const purity = page.getByLabel("Sample purity option");
    const eighteen = draft.source.variants.find((variant) => variant.karat === 18)!;
    await purity.selectOption(eighteen.id);
    await page.getByLabel("Your budget in PKR (optional)", { exact: true }).fill("260000");
    await changes.fill("Low stone setting with a simple finish");
    const consent = panel.getByRole("checkbox", { name: /I approve saving/ });
    const confirm = panel.getByRole("button", { name: "Confirm demo enquiry" });
    await expect(consent).toBeDisabled();
    await expect(confirm).toBeDisabled();
    await panel.getByRole("button", { name: "Save demo draft", exact: true }).click();
    await expect(panel).toContainText("PKR 260,000");
    await expect(panel).toContainText("18K");
    await expect(confirm).toBeDisabled();
    await consent.check();
    await confirm.click();
    await expect(panel.getByText("Demo enquiry saved")).toBeVisible();
    const reference = (await panel.locator(".auria-reference").textContent())!.trim();
    expect(reference).toMatch(/^DEMO-Q-[A-F0-9]{32}$/);
    await panel.getByRole("button", { name: "Copy reference", exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(reference);
    await panel.getByRole("button", { name: "Check status", exact: true }).click();
    const status = page.getByRole("region", { name: "Find your enquiry" });
    await expect(status.getByText(reference, { exact: true })).toBeVisible();
    await expect(status.locator('[aria-current="step"]')).toContainText("Submitted");
    await page.screenshot({ path: `${evidence}/enquiry-${width}.png` });
    await returnToChat(page, mobile, "Design & draft");
    const handoff = await ask(page, "Mujhe jeweller se baat karni hai.");
    expect(handoff.reply.text).toContain("Koi message ya booking nahin bheji jayegi.");
    await page.getByRole("button", { name: "Contact & visits", exact: true }).click();
    await expect(page.locator("#auria-contact")).toHaveAttribute("open", "");
    await expect(page.getByLabel("Request type")).toBeVisible();
    await returnToChat(page, mobile, "Design & draft");
    await page.reload();
    await expect(selected(page)).toContainText("RSJ-D005");
    await expect(page.getByRole("article", { name: "Your message" })).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  });
}

test("ordinals use the visible group and request one clarification for an invalid referent", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ai-atelier");
  const first = await ask(page, "Show me rings.");
  expect(cards(first.reply)).toHaveLength(5);
  await ask(page, "Show me bangles.");
  await stage(page).getByLabel("Recommendation history").selectOption(first.reply.id);
  await expect(stage(page).getByText("Earlier recommendations")).toBeVisible();
  await expect(stage(page).getByText("5 designs", { exact: false }).first()).not.toHaveText(/Petal Seal Ring/);
  const comparison = await ask(page, "Compare the second ring and first ring.");
  expect(cards(comparison.reply)).toEqual(["RSJ-D006", "RSJ-D005"]);
  const ambiguous = await ask(page, "Compare the first ring and fifth ring.");
  expect(cards(ambiguous.reply)).toEqual([]);
  expect(ambiguous.reply.text).toBe("Which design do you mean? Select a design or enter its catalogue code.");
  await page.getByRole("article", { name: "AURIA response" }).nth(2).getByRole("button", { name: /RSJ-D005/ }).click();
  const detail = await ask(page, "Tell me about this one.");
  expect(cards(detail.reply)).toEqual(["RSJ-D005"]);
  const urdu = await ask(page, "اس کی کوٹیشن بنا دیں");
  expect(urdu.reply.text).toContain("نمونہ کوٹیشن تیار ہے");
  expect(urdu.conversation.draft?.source.designCode).toBe("RSJ-D005");
});

test("voice cancellation and retry feedback clear on both new and restored conversations", async ({ page }) => {
  await page.addInitScript(() => {
    class Recognition {
      processLocally = false;
      onstart?: () => void;
      static async available() { return "available"; }
      start() { this.onstart?.(); }
      abort() {}
    }
    Object.defineProperty(window, "SpeechRecognition", { value: Recognition, configurable: true });
  });
  await page.goto("/ai-atelier");
  await ask(page, "Show me bangles.");
  async function cancel() {
    await page.getByRole("button", { name: "Dictate", exact: true }).click();
    await page.getByRole("button", { name: "Cancel dictation" }).click();
    await expect(page.getByRole("status").filter({ hasText: /Dictation cancelled/i })).toBeVisible();
    await page.getByRole("button", { name: "Use keyboard" }).click();
    await expect(composer(page)).toBeFocused();
  }
  await cancel();
  await page.getByRole("button", { name: /New conversation/ }).click();
  await expect(page.getByRole("heading", { name: "What do you have in mind?" })).toBeVisible();
  await expect(page.getByText(/Dictation cancelled/i)).toHaveCount(0);
  await cancel();
  await page.getByRole("button", { name: "Conversation history", exact: true }).click();
  await page.getByRole("button", { name: /Bangles/ }).click();
  await expect(page.getByRole("article", { name: "Your message" })).toHaveCount(1);
  await expect(page.getByText(/Dictation cancelled/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dictate", exact: true })).toBeVisible();
});

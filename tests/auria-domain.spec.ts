import { test, expect } from "@playwright/test";
import { catalogueTool, toolSchemas } from "../src/lib/auria/catalogue-tools";
import { orchestrate, conciergeInstructions } from "../src/lib/auria/orchestrate";
import { sampleDesigns, sampleStock } from "../src/data/demo/catalogue";
import { cardProjection, matchingDesigns, displayStatus, availableVariantCount } from "../src/lib/catalogue/domain";
import type { CatalogueAccess } from "../src/lib/auria/catalogue-tools";
import type { ChatEvent, ChatProvider, ProviderChunk } from "../src/types/auria";
import { chatInput, draftInput, submitInput } from "../src/lib/auria/validation";

const repository: CatalogueAccess = {
  search(query) { const matches = matchingDesigns(sampleDesigns, sampleStock, query); return { items: matches.slice(0, query.limit).map((d) => cardProjection(d, sampleStock)), totalMatching: matches.length, nextCursor: null, previousCursor: null, pageNumber: 1, datasetOrigin: "SAMPLE", datasetVersion: "test" }; },
  get(id) { const d = sampleDesigns.find((d) => d.id === id && d.publicationState === "PUBLISHED"); return d ? { ...d, displayStatus: displayStatus(d, sampleStock), availableVariantCount: availableVariantCount(d, sampleStock), variantStatuses: d.variants.map((v) => ({ variantId: v.id, displayStatus: displayStatus(d, sampleStock, [v]) })), policyVersion: null } : null; },
};
test("retrieval uses existing records; traditional 22K rings and available bangles are grounded", () => {
  const rings = catalogueTool("searchJewellery", { category: "rings", karat: "22", style: "heritage" }, repository)!;
  for (const c of rings.cards!) { const d = repository.get(c.id)!; expect(d.categorySlug).toBe("rings"); expect(d.styles).toContain("heritage"); expect(d.variants.some((v) => v.karat === 22)).toBe(true); }
  const bangles = catalogueTool("searchJewellery", { category: "bangles" }, repository)!;
  expect(bangles.cards!.length).toBeGreaterThan(0); expect(bangles.cards!.every((d) => d.dataOrigin === "SAMPLE")).toBe(true);
});
test("budget and lightweight preferences do not fabricate prices, weights or delivery", () => {
  const result = catalogueTool("searchJewellery", { category: "bridal", budgetPKR: 100000, maxWeightGrams: 10 }, repository)!;
  expect(result.data).toMatchObject({ budgetVerified: false, weightVerified: false });
  for (const card of result.cards!) { const d = repository.get(card.id)!; expect(d.manufacturingTime).toBeNull(); expect(d.weightRange).toBeNull(); expect(d.variants.every((v) => v.indicativePrice === null && v.massGrams === null)).toBe(true); }
});
test("selected/second design details, customization, availability and related designs use exact IDs", () => {
  const cards = catalogueTool("searchJewellery", { category: "rings" }, repository)!.cards!;
  expect(cards.length).toBeGreaterThan(1); const second = cards[1];
  const detail = catalogueTool("getProductDetails", { designId: second.id }, repository)!.data;
  expect(detail).toMatchObject({ id: second.id, customizationAvailable: repository.get(second.id)!.customizationAvailable });
  expect(catalogueTool("getDesignAvailability", { designId: second.id }, repository)!.data).toMatchObject({ deliveryTime: null, dataOrigin: "SAMPLE" });
  expect(catalogueTool("getRelatedDesigns", { designId: second.id }, repository)!.cards!.every((c) => c.id !== second.id)).toBe(true);
});
test("missing products and unapproved store policies never become catalogue facts", () => {
  expect(catalogueTool("getProductDetails", { designId: "00000000-0000-4000-8000-000000000000" }, repository)!.data).toMatchObject({ found: false });
  const draft = sampleDesigns.find((d) => d.publicationState === "DRAFT")!;
  expect(catalogueTool("getProductDetails", { designId: draft.id }, repository)!.data).toMatchObject({ found: false });
  expect(catalogueTool("getStorePolicies", {}, repository)!.data).toMatchObject({ approvedShopPolicies: [] });
  expect(catalogueTool("getCategories", {}, repository)!.data).toBeTruthy();
  expect(catalogueTool("getAvailablePurities", {}, repository)!.data).toMatchObject({ options: [18, 22], dataOrigin: "SAMPLE" });
});
test("tool and request validation rejects unknown fields, spoofed ownership and unapproved submission", () => {
  expect(toolSchemas.getProductDetails.safeParse({ designId: "bad", owner: "other" }).success).toBe(false);
  expect(toolSchemas.searchJewellery.safeParse({ category: "rings", url: "https://example.com" }).success).toBe(false);
  expect(draftInput.safeParse({ designId: sampleDesigns[0].id, status: "SUBMITTED" }).success).toBe(false);
  expect(submitInput.safeParse({ expectedVersion: 1, processingAccepted: false, fictionalDataConfirmed: true }).success).toBe(false);
  expect(chatInput.safeParse({ conversationId: sampleDesigns[0].id, requestId: sampleDesigns[0].id, expectedVersion: 0, message: "a".repeat(4001) }).success).toBe(false);
  expect(conciergeInstructions).toContain("Roman Urdu");
});
test("stream orchestration retrieves tools before streamed text and preserves provider continuation", async () => {
  let round = 0; const accounting: string[] = [];
  const provider: ChatProvider = { async *stream(input) { if (round++ === 0) { expect(input.requireTool).toBe(true); yield { calls: [{ name: "searchJewellery", args: { category: "rings" } }], continuation: { signature: "retained" } }; } else { expect(input.exchanges[0].continuation).toEqual({ signature: "retained" }); yield { text: "These are " }; yield { text: "sample designs." }; yield { usage: { input: 12, output: 8, total: 20 } }; } } };
  const events: ChatEvent[] = [];
  for await (const event of orchestrate({ provider, system: conciergeInstructions, history: [{ role: "user", text: "Show rings" }], signal: new AbortController().signal, execute: (call) => catalogueTool("searchJewellery", call.args, repository)!, beforeCall: () => String(round), usage: (_id, _usage, state) => accounting.push(state) })) events.push(event);
  expect(events.map((e) => e.type)).toEqual(["cards", "delta", "delta"]); expect(accounting).toEqual(["COMPLETE", "COMPLETE"]);
});
test("rate-limit failure and Stop propagate without automatic fallback or retry", async () => {
  let calls = 0;
  const provider: ChatProvider = { async *stream(): AsyncGenerator<ProviderChunk> { calls++; throw Object.assign(new Error("Quota exhausted"), { status: 429 }); } };
  const options = { provider, system: "", history: [], signal: new AbortController().signal, execute: () => ({ data: {} }), beforeCall: () => "call", usage: () => undefined };
  await expect(async () => { for await (const event of orchestrate(options)) void event; }).rejects.toThrow("Quota exhausted"); expect(calls).toBe(1);
  const abort = new AbortController(); abort.abort(); await expect(async () => { for await (const event of orchestrate({ ...options, signal: abort.signal })) void event; }).rejects.toThrow(); expect(calls).toBe(1);
});
test("tool recursion and output absence fail explicitly", async () => {
  const provider: ChatProvider = { async *stream() { yield { calls: [{ name: "getCategories", args: {} }], continuation: {} }; } };
  await expect(async () => { for await (const e of orchestrate({ provider, system: "", history: [], signal: new AbortController().signal, execute: () => ({ data: [] }), beforeCall: () => "call", usage: () => undefined })) void e; }).rejects.toThrow("shorter follow-up");
});

test("multiple retrievals merge distinct cards and preserve ordinal context, bounded at six", async () => {
  const cards = catalogueTool("searchJewellery", {}, repository)!.cards!;
  let round = 0;
  const provider: ChatProvider = { async *stream(input) {
    if (round++ === 0) yield { calls: [{ name: "first", args: {} }, { name: "second", args: {} }], continuation: {} };
    else { expect(input.system).toContain(JSON.stringify(cards.slice(0, 6).map((c) => c.id))); yield { text: "Sample records only." }; }
  } };
  const events: ChatEvent[] = [];
  for await (const e of orchestrate({ provider, system: "", history: [], signal: new AbortController().signal, execute: (call) => ({ data: {}, cards: call.name === "first" ? cards.slice(0, 2) : cards }), beforeCall: () => "call", usage: () => undefined })) events.push(e);
  const result = events.filter((e) => e.type === "cards").at(-1)!;
  expect(result.cards.map((c) => c.id)).toEqual(cards.slice(0, 6).map((c) => c.id));
});

test("empty provider output is not recorded as a successful answer", async () => {
  const provider: ChatProvider = { async *stream() { yield { finished: true }; } };
  await expect(async () => { for await (const e of orchestrate({ provider, system: "", history: [], signal: new AbortController().signal, execute: () => ({ data: {} }), beforeCall: () => "call", usage: () => undefined })) void e; }).rejects.toThrow("no answer");
});

test("AI-02: design codes resolve to the same published record as UUIDs, case-insensitively", () => {
  const card = catalogueTool("searchJewellery", { category: "rings" }, repository)!.cards![0];
  const byCode = catalogueTool("getProductDetails", { designId: card.designCode.toLowerCase() }, repository)!.data as { id: string };
  expect(byCode.id).toBe(card.id);
  expect((catalogueTool("searchJewellery", { q: card.designCode }, repository)!.cards ?? []).map((c) => c.id)).toContain(card.id);
  expect(catalogueTool("getDesignAvailability", { designId: "RSJ-D999" }, repository)!.data).toMatchObject({ found: false, requested: "RSJ-D999" });
  const unpublished = sampleDesigns.find((d) => d.publicationState === "DRAFT")!;
  expect(catalogueTool("getProductDetails", { designId: unpublished.designCode }, repository)!.data).toMatchObject({ found: false });
  expect(toolSchemas.getProductDetails.safeParse({ designId: "RSJ-007; drop" }).success).toBe(false);
});
test("AI-02: comparison returns only recorded facts, in customer order, with cards and missing codes", () => {
  const [a, b] = catalogueTool("searchJewellery", { category: "rings" }, repository)!.cards!;
  const result = catalogueTool("compareDesigns", { designIds: [b.designCode, a.id, "RSJ-D999", b.id] }, repository)!;
  const data = result.data as { compared: { id: string; weightRange: unknown; manufacturingTime: unknown; variants: { indicativePrice: unknown; massGrams: unknown }[] }[]; notFound: string[] };
  expect(data.compared.map((r) => r.id)).toEqual([b.id, a.id]);
  expect(data.notFound).toEqual(["RSJ-D999"]);
  expect(result.cards!.map((c) => c.id)).toEqual([b.id, a.id]);
  for (const row of data.compared) { expect(row.weightRange).toBeNull(); expect(row.manufacturingTime).toBeNull(); expect(row.variants.every((v) => v.indicativePrice === null && v.massGrams === null)).toBe(true); }
  expect(toolSchemas.compareDesigns.safeParse({ designIds: [a.id] }).success).toBe(false);
  expect(toolSchemas.compareDesigns.safeParse({ designIds: Array(5).fill(a.id) }).success).toBe(false);
});
test("AI-02: unsupported purities (21K/24K) are answered honestly instead of failing validation", () => {
  for (const karat of ["21", "24"]) {
    const result = catalogueTool("searchJewellery", { category: "rings", karat }, repository)!;
    expect(result.cards).toBeUndefined();
    expect(result.data).toMatchObject({ items: [], requestedPurity: `${karat}K`, supportedSamplePurities: [18, 22] });
  }
  expect(conciergeInstructions).toContain("displayedDesigns.position");
  expect(conciergeInstructions).toContain("compareDesigns");
});

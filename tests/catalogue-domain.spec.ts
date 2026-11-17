import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { sampleDesigns, sampleStock } from "../src/data/demo/catalogue";
import { cardProjection, displayStatus, matchingDesigns } from "../src/lib/catalogue/domain";
import { emptyQuery, parseCatalogueQuery, serializeCatalogueQuery } from "../src/lib/catalogue/query";
import type { CatalogueDesign, CatalogueQuery, PhysicalStock } from "../src/types/catalogue";

const published = sampleDesigns.filter((item) => item.publicationState === "PUBLISHED");
const first = sampleDesigns[0];
const query = (values: Partial<CatalogueQuery> = {}): CatalogueQuery => ({ ...emptyQuery, ...values });

test("approved smaller seed has 11 unique image-backed public designs, 14 unpublished briefs", () => {
  expect(published).toHaveLength(11);
  expect(sampleDesigns.filter((item) => item.publicationState === "DRAFT")).toHaveLength(14);
  expect(new Set(sampleDesigns.map((item) => item.id)).size).toBe(sampleDesigns.length);
  expect(new Set(sampleDesigns.map((item) => item.designCode)).size).toBe(sampleDesigns.length);
  const hashes = published.map((design) => {
    expect(design.dataOrigin).toBe("SAMPLE");
    expect(design.weightRange).toBeNull();
    expect(design.manufacturingTime).toBeNull();
    expect(design.quoteRequired).toBe(true);
    for (const variant of design.variants) { expect(variant.massGrams).toBeNull(); expect(variant.indicativePrice).toBeNull(); }
    expect(design.images[0].dataOrigin).toBe("AI_GENERATED");
    expect(design.images[0].alt).toContain("Not an actual shop product");
    const image = `public${design.images[0].url}`;
    expect(existsSync(image)).toBe(true);
    expect(existsSync(image.replace(".webp", "-480.webp"))).toBe(true);
    return createHash("sha256").update(readFileSync(image)).digest("hex");
  });
  expect(new Set(hashes).size).toBe(11);
});

test("physical units are separate: zero stock can remain available to craft", () => {
  expect(displayStatus(first, [])).toBe("MADE_TO_ORDER");
  expect(displayStatus(first, sampleStock)).toBe("IN_STOCK");
  const units = sampleStock.filter((item) => item.variantId === first.variants[0].id);
  expect(units).toHaveLength(2);
  expect(cardProjection(first, units).availableVariantCount).toBe(1);
});

test("review-required concepts never earn a stock/manufacturing guarantee", () => {
  const concept: CatalogueDesign = { ...first, manufacturingReview: "REVIEW_REQUIRED", manufacturingAvailable: false };
  expect(displayStatus(concept, sampleStock)).toBe("CUSTOM_DESIGN");
  expect(cardProjection(concept, sampleStock).availableVariantCount).toBe(0);
});

test("unavailable requires unsupported manufacture and no eligible stock", () => {
  const unsupported: CatalogueDesign = { ...first, manufacturingAvailable: false };
  expect(displayStatus(unsupported, [])).toBe("UNAVAILABLE");
  expect(displayStatus(unsupported, sampleStock)).toBe("IN_STOCK");
});

test("stock from the wrong data origin cannot claim availability", () => {
  const foreignOrigin: PhysicalStock[] = sampleStock.map((item) => ({ ...item, dataOrigin: "SHOP_APPROVED" }));
  expect(displayStatus(first, foreignOrigin)).toBe("MADE_TO_ORDER");
  expect(displayStatus({ ...first, dataOrigin: "SHOP_APPROVED" }, sampleStock)).toBe("MADE_TO_ORDER");
});

test("invalid or zero stock quantities do not project in-stock", () => {
  for (const quantityAvailable of [0, -1, NaN, 1.5]) expect(displayStatus(first, [{ ...sampleStock[0], quantityAvailable }])).toBe("MADE_TO_ORDER");
});

test("purity and availability combine on the same eligible variant", () => {
  const base = query({ category: "rings", q: "RSJ-D005", karat: "18", status: "IN_STOCK" });
  expect(matchingDesigns(sampleDesigns, sampleStock, base)).toHaveLength(1);
  expect(matchingDesigns(sampleDesigns, sampleStock, { ...base, karat: "22" })).toHaveLength(0);
  const mto = matchingDesigns(sampleDesigns, sampleStock, { ...base, karat: "22", status: "MADE_TO_ORDER" });
  expect(mto).toHaveLength(1);
  const selected = mto[0].variants.filter((variant) => variant.karat === 22);
  expect(cardProjection(mto[0], sampleStock, selected).displayStatus).toBe("MADE_TO_ORDER");
});

test("all search and facet filters intersect, including subcategory and collection", () => {
  const selected = parseCatalogueQuery(new URLSearchParams("q=petal+floral&category=rings&subcategory=floral-rings&collection=everyday-poetry&status=IN_STOCK&karat=18&style=floral&occasion=gifting"));
  expect(matchingDesigns(sampleDesigns, sampleStock, selected).map((item) => item.designCode)).toEqual(["RSJ-D005"]);
  expect(matchingDesigns(sampleDesigns, sampleStock, { ...selected, occasion: "bridal" })).toHaveLength(0);
});

test("name, ID and keyword search is case-insensitive and token-based", () => {
  expect(matchingDesigns(sampleDesigns, sampleStock, query({ q: "rSj-d005" })).map((item) => item.title)).toEqual(["Petal Seal Ring"]);
  expect(matchingDesigns(sampleDesigns, sampleStock, query({ q: "fold SATIN" })).map((item) => item.designCode)).toEqual(["RSJ-D006"]);
  expect(matchingDesigns(sampleDesigns, sampleStock, query({ q: "not-a-real-match" }))).toHaveLength(0);
});

test("drafts and archived entries are never public query results", () => {
  const archived: CatalogueDesign = { ...first, id: "archived", publicationState: "ARCHIVED" };
  const draft: CatalogueDesign = { ...first, id: "draft", publicationState: "DRAFT" };
  expect(matchingDesigns([...sampleDesigns, archived, draft], sampleStock, query())).toHaveLength(11);
  expect(matchingDesigns(sampleDesigns, sampleStock, query({ category: "mens" }))).toHaveLength(0);
});

test("curated/newest sort has a deterministic ID tiebreaker", () => {
  const tied = [{ ...first, id: "b" }, { ...first, id: "a" }];
  expect(matchingDesigns(tied, [], query()).map((item) => item.id)).toEqual(["a", "b"]);
  expect(matchingDesigns(tied, [], query({ sort: "newest" })).map((item) => item.id)).toEqual(["a", "b"]);
  expect(matchingDesigns(sampleDesigns, sampleStock, query({ sort: "newest" }))[0].designCode).toBe("RSJ-D011");
});

test("query parser rejects unsupported, duplicated and inconsistent values", () => {
  for (const value of ["budget=100", "weight=2", "q=a&q=b", "q=" + "x".repeat(101), "limit=0", "limit=49", "limit=NaN", "sort=price", "category=nope", "subcategory=floral-rings", "category=bridal&subcategory=floral-rings", "status=FAKE", "karat=24", "style=unknown", "occasion=unknown", "collection=unknown", "cursor=!!"]) expect(() => parseCatalogueQuery(new URLSearchParams(value))).toThrow();
  expect(parseCatalogueQuery(new URLSearchParams("category=rings&subcategory=floral-rings&limit=48")).limit).toBe(48);
});

test("canonical query serialization omits empty/default fields and fixed collection", () => {
  expect(serializeCatalogueQuery(query())).toBe("");
  expect(serializeCatalogueQuery(query({ q: "Petal ring", category: "rings", collection: "everyday-poetry" }), true)).toBe("q=Petal+ring&category=rings");
});

test("10k synthetic scale fixture stays separate from the advertised dataset", async ({}, testInfo) => {
  const rows: CatalogueDesign[] = Array.from({ length: 10_000 }, (_, index) => ({ ...published[index % published.length], id: `scale-${String(index).padStart(6, "0")}`, rank: index }));
  const start = performance.now();
  const results = matchingDesigns(rows, [], query({ category: "rings", style: "minimal" }));
  const durationMs = performance.now() - start;
  expect(results.length).toBeGreaterThan(1000);
  expect(sampleDesigns.filter((item) => item.publicationState === "PUBLISHED")).toHaveLength(11);
  await testInfo.attach("catalogue-scale-fixture", { body: JSON.stringify({ rows: rows.length, matched: results.length, durationMs, scope: "In-memory domain fixture on this Windows host; not DB/load/production scalability evidence. Public dataset remains 11." }), contentType: "application/json" });
});

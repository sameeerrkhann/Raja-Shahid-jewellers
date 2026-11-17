import "server-only";
import { createHash } from "node:crypto";
import { DATASET_VERSION, sampleCollections, sampleDesigns, sampleStock } from "@/data/demo/catalogue";
import { availableVariantCount, cardProjection, displayStatus, matchingDesigns } from "@/lib/catalogue/domain";
import { CatalogueQueryError, serializeCatalogueQuery } from "@/lib/catalogue/query";
import type { CatalogueQuery, CatalogueResult, PublicDesign } from "@/types/catalogue";

// Local, public, immutable sample repository. Replace this adapter, not the UI contract, for a real DB.
export const collections = sampleCollections;
export const categoryCounts = Object.fromEntries([...new Set(sampleDesigns.map((item) => item.categorySlug))].map((slug) => [slug, sampleDesigns.filter((item) => item.categorySlug === slug && item.publicationState === "PUBLISHED").length]));
export function countsForCollection(slug: string) { return Object.fromEntries(Object.keys(categoryCounts).map((category) => [category, sampleDesigns.filter((item) => item.publicationState === "PUBLISHED" && item.categorySlug === category && item.collectionSlugs.includes(slug)).length])); }
export function queryCatalogue(query: CatalogueQuery): CatalogueResult {
  const signature = createHash("sha256").update(serializeCatalogueQuery({ ...query, cursor: "" })).digest("hex").slice(0, 20);
  const rows = matchingDesigns(sampleDesigns, sampleStock, query);
  const key = (index: number) => { const item = rows[index]; return { id: item.id, order: query.sort === "newest" ? item.publishedAt : item.rank }; };
  const cursorAt = (index: number) => Buffer.from(JSON.stringify({ v: DATASET_VERSION, q: signature, after: key(index) })).toString("base64url");
  let start = 0;
  if (query.cursor) {
    try {
      const cursor = JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"));
      if (cursor.v !== DATASET_VERSION || cursor.q !== signature || !cursor.after || typeof cursor.after.id !== "string") throw new Error();
      const index = rows.findIndex((item) => item.id === cursor.after.id);
      if (index < 0 || key(index).order !== cursor.after.order) throw new Error();
      start = index + 1;
    } catch { throw new CatalogueQueryError("This page link has expired or belongs to different filters. Start from the first page."); }
  }
  const end = start + query.limit;
  return { items: rows.slice(start, end).map((design) => cardProjection(design, sampleStock, design.variants.filter((variant) => !query.karat || variant.karat === +query.karat))), nextCursor: end < rows.length ? cursorAt(end - 1) : null, previousCursor: start > query.limit ? cursorAt(start - query.limit - 1) : null, totalMatching: rows.length, datasetOrigin: "SAMPLE", datasetVersion: DATASET_VERSION, pageNumber: Math.floor(start / query.limit) + 1 };
}
export function findPublicDesign(id: string): PublicDesign | null {
  const design = sampleDesigns.find((item) => item.id === id && item.publicationState === "PUBLISHED");
  if (!design) return null;
  const { keywords: _keywords, rank: _rank, ...publicData } = design;
  void _keywords; void _rank;
  return { ...publicData, displayStatus: displayStatus(design, sampleStock), availableVariantCount: availableVariantCount(design, sampleStock), variantStatuses: design.variants.map((variant) => ({ variantId: variant.id, displayStatus: displayStatus(design, sampleStock, [variant]) })), policyVersion: null };
}

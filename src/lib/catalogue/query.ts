import { catalogueCategories, occasionOptions, purityOptions, styleOptions, topCategories } from "@/config/catalogue";
import type { CatalogueQuery } from "@/types/catalogue";

export class CatalogueQueryError extends Error {}
export const emptyQuery: CatalogueQuery = { q: "", category: "", subcategory: "", collection: "", status: "", karat: "", style: "", occasion: "", sort: "featured", cursor: "", limit: 12 };
export const collectionSlugs = ["the-bridal-edit", "modern-heirlooms", "everyday-poetry", "heritage-forms"];
const fields = Object.keys(emptyQuery) as (keyof CatalogueQuery)[];

export function parseCatalogueQuery(params: URLSearchParams): CatalogueQuery {
  for (const key of params.keys()) {
    if (!fields.includes(key as keyof CatalogueQuery)) throw new CatalogueQueryError(`Unsupported filter: ${key.slice(0, 40)}.`);
    if (params.getAll(key).length > 1) throw new CatalogueQueryError(`Use one value for ${key}.`);
  }
  const query: CatalogueQuery = { ...emptyQuery };
  for (const key of fields) {
    const value = params.get(key)?.trim() ?? "";
    if (!value) continue;
    if (key === "limit") { if (!/^\d+$/.test(value) || +value < 1 || +value > 48) throw new CatalogueQueryError("Page size must be between 1 and 48."); query.limit = +value; }
    else if (key === "q") { if (value.length > 100 || /[\u0000-\u001f]/.test(value)) throw new CatalogueQueryError("Search must be 100 characters or fewer, without control characters."); query.q = value; }
    else if (key === "cursor") { if (value.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new CatalogueQueryError("The page link is invalid. Clear filters and start again."); query.cursor = value; }
    else if (key === "sort") { if (value !== "featured" && value !== "newest") throw new CatalogueQueryError("Choose curated order or recently added."); query.sort = value; }
    else if (key === "status") { if (!["IN_STOCK", "MADE_TO_ORDER", "CUSTOM_DESIGN", "UNAVAILABLE"].includes(value)) throw new CatalogueQueryError("Unknown availability filter."); query.status = value as CatalogueQuery["status"]; }
    else query[key] = value;
  }
  const allowed = (value: string, list: readonly string[], label: string) => { if (value && !list.includes(value)) throw new CatalogueQueryError(`Unknown ${label} filter.`); };
  allowed(query.category, topCategories.map((item) => item.slug), "category");
  allowed(query.subcategory, catalogueCategories.filter((item) => item.parentId).map((item) => item.slug), "subcategory");
  allowed(query.collection, collectionSlugs, "collection");
  allowed(query.karat, purityOptions.map(String), "purity");
  allowed(query.style, styleOptions, "style");
  allowed(query.occasion, occasionOptions, "occasion");
  if (query.subcategory) {
    const leaf = catalogueCategories.find((item) => item.slug === query.subcategory)!;
    if (!query.category || !topCategories.some((item) => item.slug === query.category && item.id === leaf.parentId)) throw new CatalogueQueryError("Choose a subcategory within the selected category.");
  }
  return query;
}

export function serializeCatalogueQuery(query: CatalogueQuery, omitCollection = false): string {
  const params = new URLSearchParams();
  for (const key of fields) {
    if (omitCollection && key === "collection") continue;
    const value = query[key];
    if (value !== "" && value !== emptyQuery[key]) params.set(key, String(value));
  }
  return params.toString();
}
export function activeFilterCount(query: CatalogueQuery, fixedCollection = false) {
  return [query.q, query.category, query.subcategory, !fixedCollection && query.collection, query.status, query.karat, query.style, query.occasion].filter(Boolean).length;
}

import { CatalogueQueryError, parseCatalogueQuery } from "@/lib/catalogue/query";
import { queryCatalogue } from "@/lib/server/catalogue";

export type PageQuery = Record<string, string | string[] | undefined>;
export function initialCatalogue(params: PageQuery, fixedCollection = "") {
  const raw = new URLSearchParams();
  for (const [key, values] of Object.entries(params)) for (const value of Array.isArray(values) ? values : values === undefined ? [] : [values]) raw.append(key, value);
  const initialKey = raw.toString();
  if (fixedCollection) raw.set("collection", fixedCollection);
  try { return { initialKey, initialResult: queryCatalogue(parseCatalogueQuery(raw)), initialError: null }; }
  catch (error) { return { initialKey, initialResult: null, initialError: error instanceof CatalogueQueryError ? error.message : "The selection could not load. Please try again." }; }
}

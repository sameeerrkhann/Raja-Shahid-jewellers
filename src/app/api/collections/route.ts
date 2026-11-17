import { collections } from "@/lib/server/catalogue";
import { CatalogueQueryError } from "@/lib/catalogue/query";
import { catalogueError, catalogueResponse } from "@/lib/server/catalogue-response";

export function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    for (const key of query.keys()) if (!["limit", "cursor"].includes(key) || query.getAll(key).length > 1) throw new CatalogueQueryError("Unsupported collection query.");
    const limit = Number(query.get("limit") || 24);
    if (!Number.isInteger(limit) || limit < 1 || limit > 48) throw new CatalogueQueryError("Page size must be between 1 and 48.");
    const after = query.get("cursor");
    const start = after ? collections.findIndex((item) => item.id === after) + 1 : 0;
    if (after && !start) throw new CatalogueQueryError("Invalid collection cursor.");
    const items = collections.slice(start, start + limit);
    return catalogueResponse({ items, nextCursor: start + limit < collections.length ? items.at(-1)!.id : null });
  } catch (error) { return catalogueError(error); }
}

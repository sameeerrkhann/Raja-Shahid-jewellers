import { catalogueCategories } from "@/config/catalogue";
import { catalogueResponse } from "@/lib/server/catalogue-response";

export function GET() { return catalogueResponse({ items: catalogueCategories, nextCursor: null }); }

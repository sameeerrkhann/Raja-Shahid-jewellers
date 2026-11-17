import { parseCatalogueQuery } from "@/lib/catalogue/query";
import { queryCatalogue } from "@/lib/server/catalogue";
import { catalogueError, catalogueResponse } from "@/lib/server/catalogue-response";

export function GET(request: Request) {
  try { return catalogueResponse(queryCatalogue(parseCatalogueQuery(new URL(request.url).searchParams))); }
  catch (error) { return catalogueError(error); }
}

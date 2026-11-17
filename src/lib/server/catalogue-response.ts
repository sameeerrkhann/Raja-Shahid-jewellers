import { CatalogueQueryError } from "@/lib/catalogue/query";

export function catalogueResponse(data: unknown, requestId = crypto.randomUUID()) {
  return Response.json({ data, meta: { requestId } }, { headers: { "Cache-Control": "public, max-age=0, must-revalidate" } });
}
export function catalogueError(error: unknown) {
  const invalid = error instanceof CatalogueQueryError;
  return Response.json({ error: { code: invalid ? "INVALID_QUERY" : "CATALOGUE_UNAVAILABLE", message: invalid ? error.message : "The Design Vault could not load. Please try again.", retryable: !invalid }, meta: { requestId: crypto.randomUUID() } }, { status: invalid ? 400 : 503, headers: { "Cache-Control": "no-store" } });
}

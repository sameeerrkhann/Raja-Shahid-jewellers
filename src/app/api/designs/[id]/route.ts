import { findPublicDesign } from "@/lib/server/catalogue";
import { catalogueResponse } from "@/lib/server/catalogue-response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = /^[a-f0-9-]{36}$/.test(id) ? findPublicDesign(id) : null;
  return item ? catalogueResponse(item) : Response.json({ error: { code: "NOT_FOUND", message: "This published design could not be found.", retryable: false }, meta: { requestId: crypto.randomUUID() } }, { status: 404 });
}

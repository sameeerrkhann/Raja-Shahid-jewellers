import { collections } from "@/lib/server/catalogue";
import { catalogueResponse } from "@/lib/server/catalogue-response";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = collections.find((item) => item.slug === slug);
  return collection ? catalogueResponse(collection) : Response.json({ error: { code: "NOT_FOUND", message: "This collection could not be found.", retryable: false }, meta: { requestId: crypto.randomUUID() } }, { status: 404 });
}

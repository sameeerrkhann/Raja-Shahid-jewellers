import { getGoldRate } from "@/lib/server/gold-rate";

export const dynamic = "force-dynamic";

export async function GET() {
  const rate = await getGoldRate();
  return Response.json({ data: rate, meta: { requestId: crypto.randomUUID() } }, { headers: { "Cache-Control": "no-store" } });
}

import "server-only";
import { rowsFrom24k, TOLA_GRAMS, type GoldRate } from "@/lib/gold/rates";

/* Gold-rate source adapter (docs/ARCHITECTURE.md): GOLD_RATE_MODE is "live", "sample" or unset (off).
   Live mode reads GOLD_RATE_API_URL (default: GoldPriceZ PKR, all measures) with GOLD_RATE_API_KEY sent as
   X-API-KEY, caches the result for GOLD_RATE_REFRESH_SECONDS and marks it stale after GOLD_RATE_STALE_SECONDS.
   Modes never fall back into each other: a failed live fetch shows the last good rate as stale, or "unavailable". */
const DEFAULT_URL = "https://goldpricez.com/api/rates/currency/pkr/measure/all";
const SOURCE = { name: "GoldPriceZ", url: "https://goldpricez.com/" };
const number = (value: string | undefined, fallback: number) => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : fallback; };

type Cache = { perGram24: number; observedAt: string | null; fetchedAt: number } | null;
let cache: Cache = null;
let inflight: Promise<void> | null = null;

const settings = () => ({
  mode: (process.env.GOLD_RATE_MODE ?? "").trim().toLowerCase(),
  url: process.env.GOLD_RATE_API_URL?.trim() || DEFAULT_URL,
  key: process.env.GOLD_RATE_API_KEY?.trim() || "",
  refresh: number(process.env.GOLD_RATE_REFRESH_SECONDS, 900),
  stale: number(process.env.GOLD_RATE_STALE_SECONDS, 3600),
});

/** Pulls a 24K PKR per-gram price out of the GoldPriceZ payload (which may arrive as a JSON string). */
export function parseGoldPriceZ(payload: unknown): { perGram24: number; observedAt: string | null } | null {
  let data: unknown = payload;
  for (let i = 0; i < 2 && typeof data === "string"; i++) { try { data = JSON.parse(data); } catch { return null; } }
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const read = (key: string) => { const n = Number(record[key]); return Number.isFinite(n) && n > 0 ? n : null; };
  const gram = read("gram_in_pkr"), tola = read("tola-pakistan_in_pkr"), ounce = read("ounce_in_pkr");
  const value = gram ?? (tola ? tola / TOLA_GRAMS : null) ?? (ounce ? ounce / 31.1034768 : null);
  if (!value) return null;
  const stamp = Object.entries(record).find(([key]) => /updated/i.test(key) && /pkr|gmt/i.test(key))?.[1];
  const parsed = typeof stamp === "string" ? Date.parse(stamp.replace(/(\d{2})-(\d{2})-(\d{4})/, "$3-$2-$1")) : NaN;
  return { perGram24: value, observedAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : null };
}

async function refresh(url: string, key: string) {
  const response = await fetch(url, { headers: { "X-API-KEY": key, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Gold rate source answered ${response.status}`);
  const parsed = parseGoldPriceZ(await response.text());
  if (!parsed) throw new Error("Gold rate source returned an unexpected payload");
  cache = { ...parsed, fetchedAt: Date.now() };
}

export async function getGoldRate(): Promise<GoldRate> {
  const { mode, url, key, refresh: refreshSeconds, stale } = settings();
  const base = { currency: "PKR" as const, refreshSeconds };
  if (mode === "sample") {
    return { ...base, status: "sample", note: "Illustrative sample figures for layout review. Not a live or current market rate.", source: null, observedAt: null, fetchedAt: null, rows: rowsFrom24k(30000) };
  }
  if (mode !== "live") return { ...base, status: "unavailable", note: "Live gold rates are not connected yet.", source: null, observedAt: null, fetchedAt: null, rows: [] };
  if (!key) return { ...base, status: "unavailable", note: "The gold-rate source is not configured.", source: SOURCE, observedAt: null, fetchedAt: null, rows: [] };
  const age = cache ? (Date.now() - cache.fetchedAt) / 1000 : Infinity;
  if (age > refreshSeconds) {
    inflight ??= refresh(url, key).catch(() => undefined).finally(() => { inflight = null; });
    await inflight;
  }
  if (!cache) return { ...base, status: "unavailable", note: "Gold rates are unavailable right now. Please check again shortly.", source: SOURCE, observedAt: null, fetchedAt: null, rows: [] };
  const fresh = (Date.now() - cache.fetchedAt) / 1000 <= stale;
  return { ...base, status: fresh ? "live" : "stale", note: fresh ? "International gold price converted to PKR. Shop rates may differ." : "This rate may be out of date: the source has not answered recently.",
    source: SOURCE, observedAt: cache.observedAt, fetchedAt: new Date(cache.fetchedAt).toISOString(), rows: rowsFrom24k(cache.perGram24) };
}

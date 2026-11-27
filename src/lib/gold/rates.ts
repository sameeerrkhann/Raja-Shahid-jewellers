/* Shared gold-rate shapes and conversions (client and server). Karat values are calculated from the 24K
   reference by purity ratio; they are not shop buying or selling prices. */
export const TOLA_GRAMS = 11.6638038;
export const KARATS = [24, 22, 21, 18] as const;
export type Karat = (typeof KARATS)[number];
export type GoldRateStatus = "live" | "stale" | "sample" | "unavailable";
export type GoldRateRow = { karat: Karat; perGram: number; perTenGram: number; perTola: number };
export type GoldRate = {
  status: GoldRateStatus;
  /** Why the rate is unavailable, or what the sample means. Plain sentence for the page. */
  note: string;
  source: { name: string; url: string } | null;
  currency: "PKR";
  /** When the source says the price was observed (ISO), if it says so. */
  observedAt: string | null;
  /** When this server last fetched it successfully (ISO). */
  fetchedAt: string | null;
  refreshSeconds: number;
  rows: GoldRateRow[];
};

export const purity = (karat: Karat) => karat / 24;
export function rowsFrom24k(perGram24: number): GoldRateRow[] {
  return KARATS.map((karat) => {
    const perGram = perGram24 * purity(karat);
    return { karat, perGram, perTenGram: perGram * 10, perTola: perGram * TOLA_GRAMS };
  });
}
export const toGrams = (weight: number, unit: "gram" | "tola") => (unit === "tola" ? weight * TOLA_GRAMS : weight);
export const formatPkr = (value: number) => `PKR ${Math.round(value).toLocaleString("en-PK")}`;

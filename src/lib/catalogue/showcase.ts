// Homepage projections. Pure and server-safe: reads the same SAMPLE fixtures as the Design Vault.
import { sampleDesigns } from "@/data/demo/catalogue";
import { categoryLabel } from "@/config/catalogue";

export type CategorySamples = { count: number; subcategories: string[]; images: { src: string; title: string; href: string }[] };

/** Per-category summary of the published SAMPLE designs, for the homepage category gallery. */
export function categorySamples(): Record<string, CategorySamples> {
  const result: Record<string, CategorySamples> = {};
  for (const design of sampleDesigns) {
    if (design.publicationState !== "PUBLISHED" || !design.images.length) continue;
    const entry = (result[design.categorySlug] ??= { count: 0, subcategories: [], images: [] });
    entry.count += 1;
    const sub = categoryLabel(design.subcategorySlug).toLowerCase();
    if (!entry.subcategories.includes(sub)) entry.subcategories.push(sub);
    if (entry.images.length < 3) entry.images.push({ src: design.images[0].url.replace(/\.webp$/, "-480.webp"), title: design.title, href: `/designs?q=${encodeURIComponent(design.designCode)}` });
  }
  return result;
}

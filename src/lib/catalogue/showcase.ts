// Homepage showcase projection. Pure and server-safe: reads the same SAMPLE fixtures as the Design Vault.
import { sampleDesigns, sampleStock } from "@/data/demo/catalogue";
import { displayStatus } from "@/lib/catalogue/domain";
import { categoryLabel, statusLabels } from "@/config/catalogue";
import { onModelPhotography } from "@/data/demo/on-model";

/** Where a piece sits on the body; drives the fitting study when no on-model photograph exists. */
export type WearPlacement = "neck" | "finger" | "wrist";

export type ShowcaseItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  status: string;
  small: string;
  large: string;
  alt: string;
  href: string;
  wear: WearPlacement;
  /** Approved on-model photograph, if the shop has supplied one. */
  onModel: { src: string; alt: string } | null;
};

const placement = (category: string): WearPlacement => (category === "rings" ? "finger" : category === "bangles" ? "wrist" : "neck");

// Necklaces and sets lead (the dramatic pieces), then bangles and rings alternate for rhythm.
const ORDER = ["RSJ-D001", "RSJ-D002", "RSJ-D003", "RSJ-D004", "RSJ-D010", "RSJ-D005", "RSJ-D007", "RSJ-D011", "RSJ-D006", "RSJ-D008", "RSJ-D009"];

export function showcaseItems(): ShowcaseItem[] {
  const published = sampleDesigns.filter((design) => design.publicationState === "PUBLISHED" && design.images.length);
  const rank = (code: string) => { const index = ORDER.indexOf(code); return index === -1 ? ORDER.length : index; };
  return [...published].sort((a, b) => rank(a.designCode) - rank(b.designCode)).map((design) => {
    const image = design.images[0];
    return {
      id: design.id,
      code: design.designCode,
      title: design.title,
      description: design.description,
      category: categoryLabel(design.categorySlug),
      subcategory: categoryLabel(design.subcategorySlug),
      status: statusLabels[displayStatus(design, sampleStock)],
      small: image.url.replace(/\.webp$/, "-480.webp"),
      large: image.url,
      alt: image.alt,
      href: `/designs?q=${encodeURIComponent(design.designCode)}`,
      wear: placement(design.categorySlug),
      onModel: onModelPhotography[design.designCode] ?? null,
    };
  });
}

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

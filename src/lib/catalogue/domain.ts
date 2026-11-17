import type { CatalogueDesign, CatalogueQuery, DesignCardData, DesignVariant, DisplayStatus, PhysicalStock } from "@/types/catalogue";

export function displayStatus(design: CatalogueDesign, stock: readonly PhysicalStock[], variants = design.variants): DisplayStatus {
  if (design.manufacturingReview === "REVIEW_REQUIRED") return "CUSTOM_DESIGN";
  if (stock.some((item) => item.dataOrigin === design.dataOrigin && Number.isSafeInteger(item.quantityAvailable) && item.quantityAvailable > 0 && variants.some((variant) => variant.id === item.variantId))) return "IN_STOCK";
  return design.manufacturingAvailable ? "MADE_TO_ORDER" : "UNAVAILABLE";
}
export function availableVariantCount(design: CatalogueDesign, stock: readonly PhysicalStock[], variants = design.variants) {
  return variants.filter((variant) => ["IN_STOCK", "MADE_TO_ORDER"].includes(displayStatus(design, stock, [variant]))).length;
}
export function cardProjection(design: CatalogueDesign, stock: readonly PhysicalStock[], variants: DesignVariant[] = design.variants): DesignCardData {
  return { id: design.id, designCode: design.designCode, slug: design.slug, title: design.title, description: design.description, categorySlug: design.categorySlug, subcategorySlug: design.subcategorySlug, collectionSlugs: design.collectionSlugs, thumbnail: design.images[0], dataOrigin: design.dataOrigin, displayStatus: displayStatus(design, stock, variants), availableVariantCount: availableVariantCount(design, stock, variants), purityOptions: [...new Set(variants.flatMap((variant) => variant.karat === null ? [] : [variant.karat]))], customizationAvailable: design.customizationAvailable, quoteRequired: design.quoteRequired, featured: design.featured, newArrival: design.newArrival };
}
const normalize = (value: string) => value.normalize("NFKC").toLowerCase();
export function matchingDesigns(designs: readonly CatalogueDesign[], stock: readonly PhysicalStock[], query: CatalogueQuery) {
  const tokens = normalize(query.q).split(/\s+/).filter(Boolean);
  return designs.filter((design) => {
    if (design.publicationState !== "PUBLISHED" || !design.images.length) return false;
    if (query.category && design.categorySlug !== query.category) return false;
    if (query.subcategory && design.subcategorySlug !== query.subcategory) return false;
    if (query.collection && !design.collectionSlugs.includes(query.collection)) return false;
    if (query.style && !design.styles.includes(query.style)) return false;
    if (query.occasion && !design.occasions.includes(query.occasion)) return false;
    const variants = design.variants.filter((variant) => !query.karat || variant.karat === +query.karat);
    if (!variants.length) return false;
    if (query.status && displayStatus(design, stock, variants) !== query.status) return false;
    const haystack = normalize([design.title, design.designCode, design.description, design.categorySlug, design.subcategorySlug, ...design.keywords].join(" "));
    return tokens.every((token) => haystack.includes(token));
  }).sort((a, b) => query.sort === "newest" ? b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id) : a.rank - b.rank || a.id.localeCompare(b.id));
}

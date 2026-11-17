export type DataOrigin = "SAMPLE" | "SHOP_APPROVED" | "AI_GENERATED" | "CUSTOMER_UPLOAD";
export type DisplayStatus = "IN_STOCK" | "MADE_TO_ORDER" | "CUSTOM_DESIGN" | "UNAVAILABLE";
export type CatalogueCategory = { id: string; slug: string; label: string; rank: number; parentId: string | null };
export type CatalogueMedia = { id: string; url: string; alt: string; width: number; height: number; dataOrigin: "AI_GENERATED" | "SHOP_APPROVED"; rightsBasis: string };
export type DesignVariant = { id: string; code: string; karat: number | null; optionValues: Record<string, string>; massGrams: string | null; indicativePrice: { currency: "PKR"; amountMinor: number } | null };
// A design is reusable; these separate records represent physical units (only SAMPLE fixtures currently).
export type PhysicalStock = { id: string; variantId: string; quantityAvailable: number; dataOrigin: "SAMPLE" | "SHOP_APPROVED"; verifiedAt: string | null; sourceNote: string };
export type CatalogueDesign = {
  id: string; designCode: string; slug: string; title: string; description: string;
  categorySlug: string; subcategorySlug: string; collectionSlugs: string[]; styles: string[]; occasions: string[]; keywords: string[];
  dataOrigin: "SAMPLE" | "SHOP_APPROVED"; publicationState: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  manufacturingReview: "SHOP_APPROVED" | "SAMPLE_ASSUMED" | "REVIEW_REQUIRED";
  manufacturingAvailable: boolean; customizationAvailable: boolean; quoteRequired: boolean;
  manufacturingTime: { minDays: number; maxDays: number; basis: "BUSINESS_DAYS" | "CALENDAR_DAYS"; source: string; approvedAt: string } | null;
  weightRange: { minGrams: string; maxGrams: string; source: string } | null;
  variants: DesignVariant[]; images: CatalogueMedia[]; featured: boolean; newArrival: boolean; rank: number; publishedAt: string;
};
export type CatalogueCollection = { id: string; slug: string; title: string; subtitle: string; description: string; hero: CatalogueMedia; tone: "ivory" | "burgundy" | "obsidian" };
export type CatalogueQuery = { q: string; category: string; subcategory: string; collection: string; status: "" | DisplayStatus; karat: string; style: string; occasion: string; sort: "featured" | "newest"; cursor: string; limit: number };
export type DesignCardData = {
  id: string; designCode: string; slug: string; title: string; description: string; categorySlug: string; subcategorySlug: string;
  collectionSlugs: string[]; thumbnail: CatalogueMedia; dataOrigin: "SAMPLE" | "SHOP_APPROVED"; displayStatus: DisplayStatus;
  availableVariantCount: number; purityOptions: number[]; customizationAvailable: boolean; quoteRequired: boolean; featured: boolean; newArrival: boolean;
};
export type CatalogueResult = { items: DesignCardData[]; nextCursor: string | null; previousCursor: string | null; totalMatching: number; datasetOrigin: "SAMPLE"; datasetVersion: string; pageNumber: number };
export type PublicDesign = Omit<CatalogueDesign, "keywords" | "rank"> & { displayStatus: DisplayStatus; availableVariantCount: number; variantStatuses: { variantId: string; displayStatus: DisplayStatus }[]; policyVersion: null };

import { z } from "zod";
import { catalogueCategories, purityOptions } from "@/config/catalogue";
import { parseCatalogueQuery } from "@/lib/catalogue/query";
import { draftInput, designRef, enquiryReference } from "./validation";
import type { CatalogueQuery, CatalogueResult, PublicDesign } from "@/types/catalogue";
import type { ToolDefinition, ToolResult } from "@/types/auria";

// Customers quote printed design codes (RSJ-D007); the model may also pass the UUID from a card.
const id = z.strictObject({ designId: designRef });
const empty = z.strictObject({});
export const toolSchemas = {
  searchJewellery: z.strictObject({ q: z.string().max(100).optional(), category: z.string().max(40).optional(), subcategory: z.string().max(40).optional(), style: z.string().max(40).optional(), occasion: z.string().max(40).optional(), karat: z.enum(["18", "21", "22", "24"]).optional(), status: z.enum(["IN_STOCK", "MADE_TO_ORDER", "CUSTOM_DESIGN", "UNAVAILABLE"]).optional(), budgetPKR: z.number().min(1).max(10_000_000).optional(), maxWeightGrams: z.number().positive().max(1000).optional() }),
  getProductDetails: id, getDesignAvailability: id, getCategories: empty,
  getAvailablePurities: z.strictObject({ designId: designRef.optional() }), getRelatedDesigns: id,
  compareDesigns: z.strictObject({ designIds: z.array(designRef).min(2).max(4) }),
  getStorePolicies: empty, createQuoteDraft: draftInput, getQuoteDraft: empty,
  getOrderStatus: z.strictObject({ reference: enquiryReference.optional() }),
};
export type ToolName = keyof typeof toolSchemas;
const descriptions: Record<ToolName, string> = {
  searchJewellery: "Search actual published SAMPLE designs, max 6. Put design codes like RSJ-D007 or names in q.English taxonomy: rings/bangles/bridal/necklaces/earrings/mens; heritage means traditional; everyday means daily wear. Translate Urdu/Roman Urdu to these filters. Budget and weight are preferences, unknown values never count as verified matches.",
  getProductDetails: "Get actual published design specifications, variants and null unknown facts by UUID or RSJ-D code. Use displayedDesigns positions for ordinal follow-ups.",
  getDesignAvailability: "Read sample availability separately for each purity variant and independent manufacturing availability. Never present SAMPLE as real inventory.",
  getCategories: "List existing catalogue taxonomy, including categories without sample designs.",
  getAvailablePurities: "Read sample purity options from a design, or the catalogue's supported sample options.",
  getRelatedDesigns: "Retrieve up to 6 existing designs from the same category, excluding the selected design.",
  compareDesigns: "Compare 2-4 published designs side by side (UUIDs or RSJ-D codes, in the order the customer named them). Returns only recorded facts; unverified prices/weights/timings stay null.",
  getStorePolicies: "Read known demo rules and explicitly pending shop policies. Use for price, delivery, returns, address or hours questions.",
  createQuoteDraft: "Prepare or replace an editable DEMO draft. Resolve designId UUID/RSJ code, displayedPosition (1-based current card order), or selected design if both absent. GetQuoteDraft first before editing: expectedVersion must match, zero only for a new draft. Gather purity from actual variants; sizing/stone/pattern changes are preferences subject to jeweller confirmation, not supported-option claims. Never invent missing details. Send the complete reviewed preferences on edit. Never submits an enquiry.",
  getQuoteDraft: "Get this conversation's owned demo draft, or null.",
  getOrderStatus: "Read recorded status/history by reference across this browser customer's own conversations, or this conversation's enquiry if reference absent. Reference possession alone never authorizes access. No invented status, price, real order or delivery promises.",
};
export const toolDefinitions: ToolDefinition[] = Object.entries(toolSchemas).map(([name, schema]) => { const parameters = z.toJSONSchema(schema); delete parameters.$schema; return { name, description: descriptions[name as ToolName], parameters }; });
export interface CatalogueAccess { search(query: CatalogueQuery): CatalogueResult; get(id: string): PublicDesign | null }
export function catalogueTool(name: ToolName, args: unknown, repository: CatalogueAccess): ToolResult | null {
  const parsed = toolSchemas[name].parse(args);
  const reference = "designId" in parsed ? parsed.designId : undefined;
  const design = reference ? resolveDesign(reference, repository) : null;
  if (reference && !design) return { data: { found: false, requested: reference, explanation: "This design is not in the published catalogue. Offer broader discovery or workshop enquiry; do not invent it." } };
  const designId = design?.id;
  switch (name) {
    case "searchJewellery": {
      const { budgetPKR, maxWeightGrams, ...filters } = parsed as z.infer<typeof toolSchemas.searchJewellery>;
      if (filters.karat && !(purityOptions as readonly number[]).includes(+filters.karat)) return { data: { items: [], requestedPurity: `${filters.karat}K`, supportedSamplePurities: purityOptions, explanation: `No ${filters.karat}K designs are published in the sample catalogue. Offer the supported purities or a custom workshop enquiry; never imply ${filters.karat}K is available.` } };
      const query = parseCatalogueQuery(new URLSearchParams({ ...filters, limit: "6" }));
      const results = repository.search(query);
      // The current catalogue has no reliable amounts/masses. Do not call a style result a budget/weight match.
      return { data: { ...results, budgetPreferencePKR: budgetPKR ?? null, maxWeightPreferenceGrams: maxWeightGrams ?? null, budgetVerified: false, weightVerified: false, explanation: "All results are SAMPLE designs. Prices and weights are unverified; obtain a quotation before claiming budget or lightweight suitability." }, cards: results.items };
    }
    case "getProductDetails": return { data: design };
    case "getDesignAvailability": return { data: { designId, dataOrigin: design!.dataOrigin, displayStatus: design!.displayStatus, manufacturingAvailable: design!.manufacturingAvailable, manufacturingReview: design!.manufacturingReview, variants: design!.variants.map((v) => ({ ...v, status: design!.variantStatuses.find((s) => s.variantId === v.id)?.displayStatus })), manufacturingTime: design!.manufacturingTime, deliveryTime: null, explanation: "Sample stock and sample manufacture are independent; neither establishes actual shop availability." } };
    case "getCategories": return { data: catalogueCategories };
    case "getAvailablePurities": return { data: { options: design ? [...new Set(design.variants.flatMap((v) => v.karat ? [v.karat] : []))] : purityOptions, dataOrigin: "SAMPLE" } };
    case "compareDesigns": {
      const refs = [...new Set((parsed as { designIds: string[] }).designIds.map((r) => r.toUpperCase()))];
      const found = refs.map((r) => ({ r, d: resolveDesign(r, repository) }));
      const designs = found.flatMap(({ d }) => d ? [d] : []).filter((d, i, all) => all.findIndex((x) => x.id === d.id) === i);
      const rows = designs.map((d) => ({ id: d.id, designCode: d.designCode, title: d.title, category: d.categorySlug, subcategory: d.subcategorySlug, styles: d.styles, occasions: d.occasions, purities: [...new Set(d.variants.flatMap((v) => v.karat ? [v.karat] : []))], sampleDisplayStatus: d.displayStatus, manufacturingAvailable: d.manufacturingAvailable, manufacturingReview: d.manufacturingReview, customizationAvailable: d.customizationAvailable, quoteRequired: d.quoteRequired, weightRange: d.weightRange, manufacturingTime: d.manufacturingTime, variants: d.variants.map((v) => ({ code: v.code, karat: v.karat, indicativePrice: v.indicativePrice, massGrams: v.massGrams })) }));
      const cards = designs.flatMap((d) => repository.search(parseCatalogueQuery(new URLSearchParams({ q: d.designCode, limit: "6" }))).items.filter((c) => c.id === d.id));
      return { data: { compared: rows, notFound: found.filter(({ d }) => !d).map(({ r }) => r), dataOrigin: "SAMPLE", explanation: "Compare only these recorded fields. Null price/weight/time means unverified; offer a quotation instead of estimating." }, cards };
    }
    case "getRelatedDesigns": { const results = repository.search(parseCatalogueQuery(new URLSearchParams({ category: design!.categorySlug, limit: "7" }))); const cards = results.items.filter((d) => d.id !== designId).slice(0, 6); return { data: { items: cards, dataOrigin: "SAMPLE" }, cards }; }
    case "getStorePolicies": return { data: { approvedShopPolicies: [], facts: ["Customer-facing private demo; use fictional customer details only.", "Catalogue images are AI concepts and availability is synthetic SAMPLE data.", "Prices, weights, delivery times, returns, address, opening hours and shop contact are not yet approved.", "Customization is a request subject to workshop review, never guaranteed.", "Demo enquiries require explicit user confirmation, create no order or reservation, and send no notification.", "AI images, uploads and voice are postponed."], source: "PRD and sample catalogue, AI-01 demo policy v1" } };
    default: return null;
  }
}
/** Resolves a UUID, or an exact RSJ design code through the same public search path the Vault uses. */
export function resolveDesign(reference: string, repository: CatalogueAccess): PublicDesign | null {
  if (!/^RSJ-D/i.test(reference)) return repository.get(reference.toLowerCase());
  const code = reference.toUpperCase();
  const hit = repository.search(parseCatalogueQuery(new URLSearchParams({ q: code, limit: "6" }))).items.find((c) => c.designCode === code);
  return hit ? repository.get(hit.id) : null;
}

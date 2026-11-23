import type { Conversation, EnquiryStatus, QuoteDraft } from "@/types/auria";
import type { PublicDesign } from "@/types/catalogue";
import { AuriaError, draftInput } from "./validation";
import { resolveDesign, type CatalogueAccess } from "./catalogue-tools";

export const unconfirmed = "To be confirmed by the jeweller.";
export const enquiryStages: { status: EnquiryStatus; label: string }[] = [
  { status: "DRAFT", label: "Draft" }, { status: "SUBMITTED", label: "Submitted" },
  { status: "UNDER_REVIEW", label: "Under Review" }, { status: "QUOTED", label: "Quoted" },
  { status: "AWAITING_CUSTOMER_APPROVAL", label: "Awaiting Customer Approval" },
  { status: "CONFIRMED", label: "Confirmed" }, { status: "IN_PRODUCTION", label: "In Production" },
  { status: "READY_FOR_COLLECTION", label: "Ready for Collection" }, { status: "COMPLETED", label: "Completed" },
  { status: "CANCELLED", label: "Cancelled" },
];
const nextStates: Record<EnquiryStatus, EnquiryStatus[]> = {
  DRAFT: ["SUBMITTED"], SUBMITTED: ["UNDER_REVIEW", "CANCELLED"], UNDER_REVIEW: ["QUOTED", "CANCELLED"],
  QUOTED: ["AWAITING_CUSTOMER_APPROVAL", "CANCELLED"], AWAITING_CUSTOMER_APPROVAL: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PRODUCTION", "CANCELLED"], IN_PRODUCTION: ["READY_FOR_COLLECTION", "CANCELLED"],
  READY_FOR_COLLECTION: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [],
};
// Called only by trusted server demo fixtures, never a public route or model tool.
export function advanceDemoEnquiry(draft: QuoteDraft, status: EnquiryStatus, at: string) {
  if (draft.status === "DRAFT" || !nextStates[draft.status].includes(status)) throw new AuriaError("INVALID_TRANSITION", "This enquiry cannot move to that stage.", 409);
  if ((status === "QUOTED" || status === "AWAITING_CUSTOMER_APPROVAL" || status === "CONFIRMED") && (!draft.jewellerQuote || draft.jewellerQuote.amountPKR <= 0 || !draft.jewellerQuote.terms.trim())) throw new AuriaError("QUOTE_REQUIRED", "A recorded jeweller quotation is required.", 409);
  if (status === "CONFIRMED" && !draft.customerApprovedAt) throw new AuriaError("APPROVAL_REQUIRED", "Recorded customer approval of the quotation is required.", 409);
  draft.status = status; draft.updatedAt = at; draft.version++;
  draft.timeline.push({ status, at, source: "SERVER_DEMO", note: "Simulated workshop event; not an actual manufacturing order." });
  return draft;
}
export function normalizeDraft(draft: QuoteDraft): QuoteDraft {
  draft.preferences ??= { size: null, stonePreferences: "", instructions: "" };
  draft.timeline ??= [{ status: "DRAFT", at: draft.updatedAt, source: "CUSTOMER", note: "Saved draft (legacy record)." }];
  if (draft.status !== "DRAFT" && !draft.timeline.some((e) => e.status === draft.status)) draft.timeline.push({ status: draft.status, at: draft.consentAt ?? draft.updatedAt, source: "CUSTOMER", note: "Recorded demo submission (legacy record)." });
  draft.submissionKey ??= null; draft.jewellerQuote ??= null; draft.customerApprovedAt ??= null;
  return draft;
}
export function validatePreferences(design: PublicDesign, input: ReturnType<typeof draftInput.parse>) {
  const { size, stonePreferences } = input.preferences;
  if (!design.customizationAvailable && (size || stonePreferences || input.requestedChanges)) throw new AuriaError("CUSTOMIZATION_UNSUPPORTED", "This design has no recorded customization option. Choose the catalogue specification or another design.", 422);
  if (size && (size.kind === "RING_SIZE" ? !["rings", "mens"].includes(design.categorySlug) || (design.categorySlug === "mens" && !/ring|band|signet/.test(design.subcategorySlug)) : !["bridal", "necklaces"].includes(design.categorySlug))) throw new AuriaError("SIZE_NOT_APPLICABLE", "That size preference does not apply to this jewellery category.", 422);
}
export function prepareDraft(conversation: Conversation, raw: unknown, repository: CatalogueAccess, id: string, at: string): QuoteDraft {
  const input = draftInput.parse(raw); const previous = conversation.draft;
  if (previous && previous.status !== "DRAFT") throw new AuriaError("ALREADY_SUBMITTED", "Start another conversation for a new draft.", 409);
  if ((previous?.version ?? 0) !== input.expectedVersion) throw new AuriaError("VERSION_CONFLICT", "The saved draft changed. Reload and review the latest version before saving again.", 409, true);
  if (input.designId && input.displayedPosition) throw new AuriaError("AMBIGUOUS_DESIGN", "Use either a design reference or a displayed position.", 422);
  const reference = input.designId ?? (input.displayedPosition ? conversation.recentDesignIds[input.displayedPosition - 1] : conversation.selectedDesignId);
  if (!reference) throw new AuriaError("DESIGN_REQUIRED", "Select a design or tell AURIA its design code.", 422);
  const design = resolveDesign(reference, repository);
  if (!design) throw new AuriaError("NOT_FOUND", "Choose a published catalogue design.", 404);
  if (design.displayStatus === "UNAVAILABLE") throw new AuriaError("DESIGN_UNAVAILABLE", "This design has no supported stock or manufacturing option.", 422);
  validatePreferences(design, input);
  const variant = input.variantId ? design.variants.find((v) => v.id === input.variantId) : input.goldPurity ? design.variants.find((v) => v.karat === input.goldPurity) : design.variants.length === 1 ? design.variants[0] : null;
  if ((input.variantId || input.goldPurity) && (!variant || (input.goldPurity && variant.karat !== input.goldPurity))) throw new AuriaError("INVALID_VARIANT", "Choose a recorded purity option belonging to this design.", 422);
  if (variant && design.variantStatuses.find((v) => v.variantId === variant.id)?.displayStatus === "UNAVAILABLE") throw new AuriaError("INVALID_VARIANT", "This option is unavailable.", 422);
  return { id: previous?.id ?? id, conversationId: conversation.id, designId: design.id, variantId: variant?.id ?? null, quantity: input.quantity, requestedChanges: input.requestedChanges, budgetPKR: input.budgetPKR, preferences: input.preferences, customer: input.customer, version: (previous?.version ?? 0) + 1, status: "DRAFT", reference: null, updatedAt: at, source: design, consentAt: null, notificationStatus: "NOT_CONFIGURED", submissionKey: null, jewellerQuote: null, customerApprovedAt: null, timeline: previous?.timeline ?? [{ status: "DRAFT", at, source: "CUSTOMER", note: "Draft saved; no enquiry submitted." }] };
}
export function missingDraftDetails(draft: QuoteDraft) {
  return [...(!draft.variantId ? ["Gold purity option"] : []), ...(!draft.preferences.size && ["rings", "bridal", "necklaces"].includes(draft.source.categorySlug) ? ["Size preference"] : [])];
}
export function confirmDraft(draft: QuoteDraft, expectedVersion: number, key: string | undefined, reference: string, at: string, current: PublicDesign | null) {
  if (draft.status !== "DRAFT") {
    if (key && draft.submissionKey && key !== draft.submissionKey) throw new AuriaError("ALREADY_SUBMITTED", "This draft already has a saved enquiry reference.", 409);
    return draft;
  }
  if (draft.version !== expectedVersion) throw new AuriaError("VERSION_CONFLICT", "The draft changed. Review it again before confirming.", 409, true);
  if (!draft.variantId) throw new AuriaError("PURITY_REQUIRED", "Choose a recorded gold purity option before confirming.", 422);
  if (!current?.variants.some((v) => v.id === draft.variantId) || current.displayStatus === "UNAVAILABLE" || current.variantStatuses.find((v) => v.variantId === draft.variantId)?.displayStatus === "UNAVAILABLE") throw new AuriaError("SOURCE_CHANGED", "The selected design or option is no longer available for review.", 409);
  validatePreferences(current, draftInput.parse({ designId: current.id, preferences: draft.preferences, requestedChanges: draft.requestedChanges }));
  draft.source = current; draft.status = "SUBMITTED"; draft.reference = reference; draft.submissionKey = key ?? null;
  draft.consentAt = at; draft.updatedAt = at; draft.version++;
  draft.timeline.push({ status: "SUBMITTED", at, source: "CUSTOMER", note: "Explicitly confirmed fictional enquiry. No order, reservation or notification." });
  return draft;
}

import "server-only";
import { randomUUID } from "node:crypto";
import { queryCatalogue, findPublicDesign } from "@/lib/server/catalogue";
import { confirmDraft, prepareDraft, unconfirmed } from "@/lib/auria/quotation";
import { AuriaError, enquiryReference, submitInput } from "@/lib/auria/validation";
import { ownedConversation, withOwner } from "./store";

export function createQuoteDraft(owner: string, conversationId: string, input: unknown, fromActiveTool = false) {
  return withOwner(owner, (s) => {
    const c = ownedConversation(s, conversationId);
    if (c.activeTurn && !fromActiveTool) throw new AuriaError("TURN_ACTIVE", "Finish the response before editing the draft.", 409);
    c.draft = prepareDraft(c, input, { search: queryCatalogue, get: findPublicDesign }, randomUUID(), new Date().toISOString());
    c.updatedAt = c.draft.updatedAt;
    return c.draft;
  });
}
export function submitQuoteDraft(owner: string, conversationId: string, raw: unknown) {
  const input = submitInput.parse(raw);
  return withOwner(owner, (s) => {
    const c = ownedConversation(s, conversationId);
    if (c.activeTurn) throw new AuriaError("TURN_ACTIVE", "Finish the response before submitting.", 409);
    if (!c.draft) throw new AuriaError("NOT_FOUND", "Prepare a draft first.", 404);
    if (input.idempotencyKey && s.conversations.some((other) => other.id !== c.id && other.draft?.submissionKey === input.idempotencyKey)) throw new AuriaError("IDEMPOTENCY_CONFLICT", "This submission key belongs to another enquiry.", 409);
    const draft = confirmDraft(c.draft, input.expectedVersion, input.idempotencyKey, `DEMO-Q-${randomUUID().replaceAll("-", "").toUpperCase()}`, new Date().toISOString(), findPublicDesign(c.draft.designId));
    c.updatedAt = draft.updatedAt;
    return draft;
  });
}
export function getQuoteDraft(owner: string, conversationId: string) { return withOwner(owner, (s) => ownedConversation(s, conversationId).draft); }
export function getOrderStatus(owner: string, conversationId: string, reference?: string) {
  const normalized = reference ? enquiryReference.parse(reference) : undefined;
  return withOwner(owner, (s) => {
    const c = ownedConversation(s, conversationId);
    const callbackConversation = normalized ? s.conversations.find((other) => other.callback?.reference === normalized) : c;
    const callback = callbackConversation?.callback;
    if (callback?.status === "SUBMITTED" && (normalized || !c.draft?.reference)) {
      return {
        found: true as const, reference: callback.reference!, conversationId: callbackConversation!.id,
        status: callback.status, version: callback.version, designCode: "",
        title: callback.topic === "APPOINTMENT" ? "Showroom visit request" : "Callback request",
        dataOrigin: "SAMPLE" as const, recordType: "CALLBACK_ENQUIRY" as const, timeline: callback.timeline,
        notificationStatus: "NOT_CONFIGURED" as const, quotedAmountPKR: null,
        explanation: "Recorded fictional request. No message or booking was sent.",
      };
    }
    const draft = normalized ? s.conversations.find((other) => other.draft?.reference === normalized)?.draft : c.draft;
    if (!draft || draft.status === "DRAFT") return { found: false as const, explanation: "No matching enquiry in your private session. Check the reference or return to the browser where it was saved." };
    return { found: true as const, reference: draft.reference!, conversationId: draft.conversationId, status: draft.status, version: draft.version, designCode: draft.source.designCode, title: draft.source.title, dataOrigin: "SAMPLE" as const, recordType: ["CONFIRMED", "IN_PRODUCTION", "READY_FOR_COLLECTION", "COMPLETED"].includes(draft.status) ? "SIMULATED_MANUFACTURING_ORDER" as const : "QUOTATION_ENQUIRY" as const, timeline: draft.timeline, notificationStatus: draft.notificationStatus, quotedAmountPKR: draft.jewellerQuote?.amountPKR ?? null, weight: unconfirmed, makingCharges: unconfirmed, manufacturingDeadline: unconfirmed, explanation: "Persisted demo record. Later workshop events, if present, are server-simulated. No actual manufacture, reservation or notification." };
  });
}

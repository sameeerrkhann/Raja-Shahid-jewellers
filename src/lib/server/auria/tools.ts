import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { queryCatalogue, findPublicDesign } from "@/lib/server/catalogue";
import { catalogueTool, toolSchemas, type ToolName } from "@/lib/auria/catalogue-tools";
import { AuriaError, draftInput } from "@/lib/auria/validation";
import type { QuoteDraft, ToolResult } from "@/types/auria";
import { ownedConversation, withOwner } from "./store";

export function createQuoteDraft(owner: string, conversationId: string, input: unknown): QuoteDraft {
  const values = draftInput.parse(input); const design = findPublicDesign(values.designId);
  if (!design) throw new AuriaError("NOT_FOUND", "Choose a published design.", 404);
  const variant = design.variants.find((v) => values.variantId ? v.id === values.variantId : true);
  if (!variant) throw new AuriaError("INVALID_VARIANT", "Choose an option belonging to this design.", 422);
  return withOwner(owner, (s) => {
    const c = ownedConversation(s, conversationId); const previous = c.draft;
    if (previous?.status === "SUBMITTED") throw new AuriaError("ALREADY_SUBMITTED", "Start another conversation for a new draft.", 409);
    const draft: QuoteDraft = { ...values, variantId: variant.id, id: previous?.id ?? randomUUID(), conversationId, version: (previous?.version ?? 0) + 1, status: "DRAFT", reference: null, updatedAt: new Date().toISOString(), source: design, customer: { name: "Demo Customer", email: "demo@example.invalid" }, consentAt: null, notificationStatus: "NOT_CONFIGURED" };
    c.draft = draft; return draft;
  });
}
export function getQuoteDraft(owner: string, conversationId: string) { return withOwner(owner, (s) => ownedConversation(s, conversationId).draft); }
export function getOrderStatus(owner: string, conversationId: string, reference?: string) {
  const draft = getQuoteDraft(owner, conversationId);
  if (!draft || draft.status !== "SUBMITTED" || (reference && reference !== draft.reference)) return { found: false, explanation: "No matching demo enquiry in this conversation. Real order tracking is not connected." };
  return { found: true, reference: draft.reference, status: "SUBMITTED", dataOrigin: "SAMPLE", customer: draft.customer, notificationStatus: "NOT_CONFIGURED", explanation: "Demo enquiry saved for review. No real order, reservation or delivery date." };
}
export function executeTool(owner: string, conversationId: string, name: string, args: unknown): ToolResult {
  if (!Object.hasOwn(toolSchemas, name)) return { data: { error: "UNKNOWN_TOOL" } };
  try {
    const key = name as ToolName; const parsed = toolSchemas[key].parse(args);
    const result = catalogueTool(key, parsed, { search: queryCatalogue, get: findPublicDesign });
    if (result) return result;
    if (key === "createQuoteDraft") { const draft = createQuoteDraft(owner, conversationId, parsed); return { data: { draft, instruction: "Draft only. Ask customer to review the draft panel and explicitly confirm submission." }, draft }; }
    if (key === "getQuoteDraft") return { data: getQuoteDraft(owner, conversationId) };
    if (key === "getOrderStatus") return { data: getOrderStatus(owner, conversationId, "reference" in parsed ? parsed.reference : undefined) };
    return { data: { error: "UNKNOWN_TOOL" } };
  } catch (error) {
    // Diagnostics only: tool name, code and field paths; never argument values or customer text.
    console.warn(`[auria] tool ${name} failed: ${error instanceof z.ZodError ? "INVALID_TOOL_ARGUMENTS " + error.issues.map((i) => `${i.path.join(".")}:${i.code}`).join(",") : error instanceof AuriaError ? error.code : (error as Error)?.name}`);
    if (error instanceof z.ZodError) return { data: { error: "INVALID_TOOL_ARGUMENTS", explanation: "Use only the declared fields and known catalogue values." } };
    if (error instanceof AuriaError) return { data: { error: error.code, explanation: error.message } };
    return { data: { error: "TOOL_UNAVAILABLE", explanation: "Could not retrieve verified facts. Do not guess; ask the user to retry." } };
  }
}

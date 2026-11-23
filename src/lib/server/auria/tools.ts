import "server-only";
import { z } from "zod";
import { queryCatalogue, findPublicDesign } from "@/lib/server/catalogue";
import { catalogueTool, toolSchemas, type ToolName } from "@/lib/auria/catalogue-tools";
import { AuriaError } from "@/lib/auria/validation";
import { missingDraftDetails, unconfirmed } from "@/lib/auria/quotation";
import { createQuoteDraft, getQuoteDraft, getOrderStatus } from "./quotations";
export { createQuoteDraft, getQuoteDraft, getOrderStatus } from "./quotations";
import type { ToolResult } from "@/types/auria";


export function executeTool(owner: string, conversationId: string, name: string, args: unknown): ToolResult {
  if (!Object.hasOwn(toolSchemas, name)) return { data: { error: "UNKNOWN_TOOL" } };
  try {
    const key = name as ToolName; const parsed = toolSchemas[key].parse(args);
    const result = catalogueTool(key, parsed, { search: queryCatalogue, get: findPublicDesign });
    if (result) return result;
    if (key === "createQuoteDraft") { const draft = createQuoteDraft(owner, conversationId, parsed, true); return { data: { draft, missingDetails: missingDraftDetails(draft), unsupportedFacts: unconfirmed, instruction: "Draft only. Ask for missing preferences; do not invent them. Review and explicitly confirm in the draft panel. Get the current draft/version before edits." }, draft }; }
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

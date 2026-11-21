import { z } from "zod";

export class AuriaError extends Error {
  constructor(public code: string, message: string, public status = 400, public retryable = false) { super(message); }
}
export const uuid = z.uuid();
export const language = z.enum(["auto", "en", "ur", "roman-ur"]);
export const chatInput = z.strictObject({ conversationId: uuid, expectedVersion: z.number().int().nonnegative(), requestId: uuid, message: z.string().trim().min(1).max(4000) });
export const selectionInput = z.strictObject({ selectedDesignId: uuid.nullable(), expectedVersion: z.number().int().nonnegative() });
export const draftInput = z.strictObject({ designId: uuid, variantId: uuid.optional(), quantity: z.number().int().min(1).max(5).default(1), requestedChanges: z.string().trim().max(2000).default(""), budgetPKR: z.number().int().min(1).max(10_000_000).nullable().default(null) });
export const submitInput = z.strictObject({ expectedVersion: z.number().int().nonnegative(), processingAccepted: z.literal(true), fictionalDataConfirmed: z.literal(true) });
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AuriaError("CONTENT_TYPE", "Use a JSON request.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AuriaError("INVALID_REQUEST", "A request body is required.");
  let text = "", size = 0;
  const decoder = new TextDecoder();
  try {
    while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > 16_384) { await reader.cancel(); throw new AuriaError("BODY_TOO_LARGE", "Request is too large.", 413); } text += decoder.decode(next.value, { stream: true }); }
    text += decoder.decode();
    return schema.parse(JSON.parse(text));
  } catch (error) { if (error instanceof AuriaError) throw error; throw new AuriaError("INVALID_REQUEST", "Check the request fields and try again.", 422); }
}

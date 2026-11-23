import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { CallbackDraft } from "@/types/auria";
import { AuriaError, callbackInput, submitInput } from "@/lib/auria/validation";
import { ownedConversation, withOwner } from "./store";

export function saveCallback(owner: string, id: string, input: ReturnType<typeof callbackInput.parse>) {
  return withOwner(owner, (state) => {
    const conversation = ownedConversation(state, id);
    const draft = conversation.callback;
    if (conversation.activeTurn || draft?.status === "SUBMITTED") throw new AuriaError("CALLBACK_UNAVAILABLE", "Finish your response or start another conversation to prepare this request.", 409);
    if ((draft?.version ?? 0) !== input.expectedVersion) throw new AuriaError("VERSION_CONFLICT", "This callback draft changed. Reload it before saving.", 409, true);
    const now = new Date().toISOString();
    const result: CallbackDraft = {
      id: draft?.id ?? randomUUID(), topic: input.topic, customer: input.customer, note: input.note,
      status: "DRAFT", version: input.expectedVersion + 1, updatedAt: now, reference: null, submissionKey: null,
      timeline: draft?.timeline ?? [{ status: "DRAFT", at: now, source: "CUSTOMER", note: "Fictional callback draft saved." }],
    };
    conversation.callback = result;
    conversation.updatedAt = now;
    return result;
  });
}

export function submitCallback(owner: string, id: string, input: ReturnType<typeof submitInput.parse>) {
  return withOwner(owner, (state) => {
    const conversation = ownedConversation(state, id);
    if (conversation.activeTurn) throw new AuriaError("TURN_ACTIVE", "Finish the response before confirming.", 409);
    const draft = conversation.callback;
    if (!draft) throw new AuriaError("NOT_FOUND", "Save a request draft first.", 404);
    if (draft.status === "SUBMITTED") {
      if (draft.submissionKey !== (input.idempotencyKey ?? null)) throw new AuriaError("ALREADY_SUBMITTED", "This request is already recorded.", 409);
      return draft;
    }
    if (draft.version !== input.expectedVersion) throw new AuriaError("VERSION_CONFLICT", "This request changed. Review it again before confirming.", 409, true);
    const now = new Date().toISOString();
    draft.status = "SUBMITTED";
    draft.reference = "DEMO-C-" + randomBytes(10).toString("hex").toUpperCase();
    draft.version++;
    draft.updatedAt = now;
    draft.submissionKey = input.idempotencyKey ?? null;
    draft.timeline.push({ status: "SUBMITTED", at: now, source: "CUSTOMER", note: "Explicitly confirmed fictional callback. No notification or booking was sent." });
    conversation.updatedAt = now;
    return draft;
  });
}

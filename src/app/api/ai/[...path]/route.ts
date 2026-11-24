import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AuriaError, readJson, language, uuid, selectionInput, callbackInput, draftInput, submitInput, enquiryReference } from "@/lib/auria/validation";
import { session, json, failure } from "@/lib/server/auria/http";
import { ownedConversation, withOwner } from "@/lib/server/auria/store";
import { providerCapability } from "@/lib/server/auria/provider";
import { findPublicDesign } from "@/lib/server/catalogue";
import { createQuoteDraft, submitQuoteDraft, getOrderStatus } from "@/lib/server/auria/quotations";
import { chat, stopTurn } from "@/lib/server/auria/chat";
import { saveCallback, submitCallback } from "@/lib/server/auria/callbacks";
import { analyzeReference } from "@/lib/server/auria/vision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  try {
    const { path } = await context.params; const route = path.join("/"); const method = request.method;
    if (route === "session" && method === "POST") { await readJson(request, z.strictObject({})); const s = await session(request, true); return json({ csrfToken: s.csrfToken, capability: providerCapability() }); }
    const { owner } = await session(request);
    if (route === "chat" && method === "POST") return await chat(request, owner);
    if (route === "reference" && method === "POST") return json(await analyzeReference(request, owner));
    if (path[0] === "enquiries" && path.length === 2 && method === "GET") {
      const reference = enquiryReference.safeParse(path[1]);
      if (!reference.success) throw new AuriaError("NOT_FOUND", "Enquiry unavailable.", 404);
      const conversationId = withOwner(owner, (s) => s.conversations[0]?.id);
      if (!conversationId) throw new AuriaError("NOT_FOUND", "Enquiry unavailable.", 404);
      const result = getOrderStatus(owner, conversationId, reference.data);
      if (!result.found) throw new AuriaError("NOT_FOUND", "Enquiry unavailable.", 404);
      return json(result);
    }
    if (route === "conversations" && method === "GET") return json(withOwner(owner, (s) => ({ conversations: s.conversations.map(({ id, title, updatedAt, language }) => ({ id, title, updatedAt, language })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), capability: providerCapability(), usage: s.usage.map(({ model, startedAt, state, inputTokens, outputTokens, totalTokens }) => ({ model, startedAt, state, inputTokens, outputTokens, totalTokens })) })));
    if (route === "conversations" && method === "POST") {
      const input = await readJson(request, z.strictObject({ language: language.default("auto"), mode: z.enum(["live", "catalogue"]).optional() }));
      return json(withOwner(owner, (s) => { if (s.conversations.length >= 30) throw new AuriaError("HISTORY_LIMIT", "This session has reached its 30 conversation limit.", 429); const now = new Date().toISOString(); const c = { id: randomUUID(), title: "A new inspiration", language: input.language, mode: input.mode, version: 0, createdAt: now, updatedAt: now, selectedDesignId: null, recentDesignIds: [], messages: [], draft: null, activeTurn: null, requests: {} }; s.conversations.push(c); return c; }), 201);
    }
    if (path[0] !== "conversations" || !uuid.safeParse(path[1]).success || path.length > 3) throw new AuriaError("NOT_FOUND", "Route unavailable.", 404);
    const id = path[1];
    if (path.length === 2 && method === "GET") return json(withOwner(owner, (s) => ownedConversation(s, id)));
    if (path[2] === "mode" && method === "POST") {
      const input = await readJson(request, z.strictObject({ mode: z.enum(["live", "catalogue"]), expectedVersion: z.number().int().nonnegative() }));
      return json(withOwner(owner, (s) => {
        const c = ownedConversation(s, id);
        if (c.activeTurn || c.version !== input.expectedVersion) throw new AuriaError("VERSION_CONFLICT", "Finish the response or reload the conversation before switching modes.", 409, true);
        c.mode = input.mode;
        c.version++;
        return c;
      }));
    }
    if (path[2] === "selection" && method === "POST") {
      const input = await readJson(request, selectionInput);
      if (input.selectedDesignId && !findPublicDesign(input.selectedDesignId)) throw new AuriaError("NOT_FOUND", "Design unavailable.", 404);
      return json(withOwner(owner, (s) => { const c = ownedConversation(s, id); if (c.activeTurn || c.version !== input.expectedVersion) throw new AuriaError("VERSION_CONFLICT", "Finish the response or reload history before selecting a design.", 409, true); if (input.referenceNote !== undefined || c.selectedDesignId !== input.selectedDesignId) c.referenceNote = input.selectedDesignId ? input.referenceNote ?? null : null; c.selectedDesignId = input.selectedDesignId; c.version++; return c; }));
    }
    if (path[2] === "stop" && method === "POST") { await readJson(request, z.strictObject({})); return json(stopTurn(owner, id)); }
    if (path[2] === "callback" && method === "POST") return json(saveCallback(owner, id, await readJson(request, callbackInput)));
    if (path[2] === "callback-submit" && method === "POST") return json(submitCallback(owner, id, await readJson(request, submitInput)));
    if (path[2] === "draft" && method === "POST") { const input = await readJson(request, draftInput); return json(createQuoteDraft(owner, id, input)); }
    if (path[2] === "submit" && method === "POST") {
      const input = await readJson(request, submitInput);
      return json(submitQuoteDraft(owner, id, input));
    }
    throw new AuriaError("NOT_FOUND", "Route unavailable.", 404);
  } catch (error) { return failure(error); }
}
export const GET = handle;
export const POST = handle;

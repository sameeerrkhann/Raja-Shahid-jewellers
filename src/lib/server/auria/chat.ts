import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { chatInput, AuriaError, readJson } from "@/lib/auria/validation";
import { conciergeInstructions, orchestrate } from "@/lib/auria/orchestrate";
import type { ChatEvent, Conversation, ProviderTurn } from "@/types/auria";
import { ownedConversation, reserveCall, withOwner, markVerified } from "./store";
import { geminiProvider, providerCapability, providerError } from "./provider";
import { executeTool } from "./tools";
import { findPublicDesign } from "@/lib/server/catalogue";
import { noStore } from "./http";
import { catalogueDemoProvider } from "./catalogue-demo";
import { isTransientProviderFailure, upstreamStatus } from "@/lib/auria/provider-policy";
import { setTimeout as wait } from "node:timers/promises";
import { demoTitle } from "@/lib/auria/demo-intent";

const globalState = globalThis as typeof globalThis & { auriaTurns?: Map<string, AbortController> };
const active = globalState.auriaTurns ??= new Map<string, AbortController>();
export function stopTurn(owner: string, conversationId: string) {
  const turn = withOwner(owner, (s) => { const c = ownedConversation(s, conversationId); const turn = c.activeTurn; if (turn) { const m = c.messages.find((m) => m.id === turn.assistantId)!; m.state = "STOPPED"; c.activeTurn = null; c.version++; } return turn; });
  if (turn) active.get(turn.id)?.abort();
  return withOwner(owner, (s) => ownedConversation(s, conversationId));
}
export async function chat(request: Request, owner: string) {
  const body = await readJson(request, chatInput);
  const demo = body.mode === "catalogue";
  const hash = createHash("sha256").update(JSON.stringify({ message: body.message, version: body.expectedVersion, ...(demo ? { mode: body.mode } : {}) })).digest("hex");
  const replay = withOwner(owner, (s) => { const c = ownedConversation(s, body.conversationId); const previous = c.requests[body.requestId]; if (previous && previous.hash !== hash) throw new AuriaError("IDEMPOTENCY_CONFLICT", "This request ID belongs to another message.", 409); return previous ? c : null; });
  if (replay) {
    if (replay.activeTurn) throw new AuriaError("TURN_ACTIVE", "This response is still running. Reload history or stop it.", 409);
    return new Response(JSON.stringify({ type: "done", conversation: replay } satisfies ChatEvent) + "\n", { headers: { ...noStore, "Content-Type": "application/x-ndjson" } });
  }
  const liveProvider = demo ? null : geminiProvider();
  const conversation = withOwner(owner, (s) => {
    const c = ownedConversation(s, body.conversationId);
    if (c.activeTurn) throw new AuriaError("TURN_ACTIVE", "Stop the current response before sending another.", 409);
    if (c.version !== body.expectedVersion) throw new AuriaError("VERSION_CONFLICT", "History changed in another tab. Reload it before sending.", 409, true);
    if (c.messages.length >= 80) throw new AuriaError("CONVERSATION_LIMIT", "Start a new conversation to continue.", 429);
    const now = new Date().toISOString(); const assistantId = randomUUID();
    c.messages.push({ id: randomUUID(), role: "user", text: body.message, createdAt: now, state: "COMPLETE", cards: [] }, { id: assistantId, role: "assistant", text: "", createdAt: now, state: "STREAMING", cards: [], ...(demo ? { source: "CATALOGUE_DEMO" as const } : {}) });
    c.mode = demo ? "catalogue" : "live";
    if (c.messages.length === 2) c.title = demo ? demoTitle(body.message) : body.message.slice(0, 55);
    c.updatedAt = now; c.version++;
    c.requests[body.requestId] = { hash, assistantId }; c.activeTurn = { id: body.requestId, assistantId, expiresAt: Date.now() + 95_000 };
    return c;
  });
  const controller = new AbortController(); active.set(body.requestId, controller);
  const abort = () => controller.abort(); request.signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error("TIMEOUT")), 90_000);
  let text = ""; let cards = conversation.messages.at(-1)!.cards;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(output) {
      let open = true;
      const send = (event: ChatEvent) => { if (open) try { output.enqueue(encoder.encode(JSON.stringify(event) + "\n")); } catch { open = false; controller.abort(); } };
      const stillActive = () => { controller.signal.throwIfAborted(); if (!withOwner(owner, (s) => ownedConversation(s, body.conversationId).activeTurn?.id === body.requestId)) { controller.abort(); controller.signal.throwIfAborted(); } };
      const finish = (state: "COMPLETE" | "FAILED" | "STOPPED", failure?: AuriaError): Conversation => withOwner(owner, (s) => { const c = ownedConversation(s, body.conversationId); const m = c.messages.find((m) => m.id === conversation.activeTurn!.assistantId)!; m.text = text; m.cards = cards; m.state = c.activeTurn?.id === body.requestId ? state : "STOPPED"; if (m.state === "COMPLETE" && demo && cards.length === 1) c.selectedDesignId = cards[0].id; if (failure && m.state === "FAILED") { m.errorCode = failure.code; m.failure = { message: failure.message, retryable: failure.retryable }; } if (c.activeTurn?.id === body.requestId) { c.activeTurn = null; c.version++; } c.updatedAt = new Date().toISOString(); return c; });
      try {
        let remaining = 16_000;
        const history: ProviderTurn[] = conversation.messages.filter((m) => m.role === "user" || m.state === "COMPLETE").slice(-12).reverse().flatMap((m) => { if (remaining <= 0) return []; const value = m.text.slice(0, Math.min(4000, remaining)); remaining -= value.length; return [{ role: m.role, text: value }]; }).reverse();
        const describe = (id: string) => { const d = findPublicDesign(id); return d ? { id, designCode: d.designCode, title: d.title, category: d.categorySlug } : null; };
        const context = { language: conversation.language, selectedDesign: conversation.selectedDesignId ? describe(conversation.selectedDesignId) : null, displayedDesigns: conversation.recentDesignIds.flatMap((id, i) => { const d = describe(id); return d ? [{ position: i + 1, ...d }] : []; }), shortlistDesigns: conversation.shortlistDesignIds?.flatMap((id) => { const design = describe(id); return design ? [design] : []; }), draft: conversation.draft ? { status: conversation.draft.status, designId: conversation.draft.designId, reference: conversation.draft.reference } : null };
        const provider = liveProvider ?? catalogueDemoProvider(body.message, context);
        for await (const event of orchestrate({ provider, system: `${conciergeInstructions}\nTrusted application context (IDs in displayed order): ${JSON.stringify(context)}`, history, signal: controller.signal,
          beforeCall: () => { stillActive(); return demo ? "local" : reserveCall(owner, providerCapability().model); },
          usage: (id, usage, state) => { if (!demo) withOwner(owner, (s) => { const u = s.usage.find((u) => u.id === id)!; u.state = state; u.inputTokens = usage?.input ?? null; u.outputTokens = usage?.output ?? null; u.totalTokens = usage?.total ?? null; }); },
          retry: demo ? undefined : async (error) => {
            if (!isTransientProviderFailure(error)) return false;
            console.info("[auria] transient provider retry", { requestId: body.requestId, upstreamStatus: upstreamStatus(error), code: providerError(error).code });
            await wait(650, undefined, { signal: controller.signal });
            return true;
          },
          execute: (call) => { stillActive(); return executeTool(owner, body.conversationId, call.name, call.args); },
        })) {
          stillActive();
          if (event.type === "delta") { text += event.text; if (text.length > 20_000) throw new AuriaError("OUTPUT_LIMIT", "Response length limit reached.", 422, true); }
          if (event.type === "cards") {
            cards = event.cards;
            if (cards.length) withOwner(owner, (s) => {
              const current = ownedConversation(s, body.conversationId);
              current.recentDesignIds = cards.map((card) => card.id);
              if (cards.length > 1) current.shortlistDesignIds = current.recentDesignIds;
            });
          }
          send(event);
        }
        stillActive(); const completed = finish("COMPLETE"); if (!demo) markVerified(); send({ type: "done", conversation: completed });
      } catch (error) {
        const timedOut = controller.signal.aborted && controller.signal.reason instanceof Error && controller.signal.reason.message === "TIMEOUT";
        const safe = timedOut ? new AuriaError("TIMEOUT", "The response timed out. You can retry.", 504, true) : controller.signal.aborted ? new AuriaError("STOPPED", "Response stopped. Partial text may be incomplete.", 409, true) : providerError(error);
        if (!controller.signal.aborted) console.warn("[auria] chat failure", { requestId: body.requestId, upstreamStatus: upstreamStatus(error), code: safe.code });
        try { const c = finish(controller.signal.aborted ? "STOPPED" : "FAILED", safe); send({ type: "error", code: safe.code, message: safe.message, retryable: safe.retryable }); send({ type: "done", conversation: c }); } catch { send({ type: "error", code: "SAVE_FAILED", message: "The response could not be saved. Reload history before retrying.", retryable: true }); }
      } finally { clearTimeout(timeout); request.signal.removeEventListener("abort", abort); active.delete(body.requestId); if (open) try { output.close(); } catch {} }
    },
    cancel() { controller.abort(); },
  });
  return new Response(stream, { headers: { ...noStore, "Content-Type": "application/x-ndjson; charset=utf-8", "X-Accel-Buffering": "no" } });
}

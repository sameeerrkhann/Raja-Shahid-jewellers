import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { chatInput, AuriaError, readJson } from "@/lib/auria/validation";
import { conciergeInstructions, orchestrate } from "@/lib/auria/orchestrate";
import type { ChatEvent, ChatProvider, Conversation, ModelProvider, ReplySource } from "@/types/auria";
import { ownedConversation, reserveCall, withOwner, markVerified, finishProviderCall } from "./store";
import { geminiProvider, providerCapability, providerError } from "./provider";
import { executeTool } from "./tools";
import { findPublicDesign } from "@/lib/server/catalogue";
import { noStore } from "./http";
import { catalogueDemoProvider, isGuidedRequest } from "./catalogue-demo";
import { canUseLocalFallback, isTransientProviderFailure, providerOrder, upstreamRetryAfter, upstreamStatus } from "@/lib/auria/provider-policy";
import { setTimeout as wait } from "node:timers/promises";
import { budgetFrom, demoTitle, purityFrom } from "@/lib/auria/demo-intent";
import { providerHistory } from "@/lib/auria/provider-history";
import { ollamaModel, ollamaProvider } from "./ollama";
import { healthFor, recordProviderFailure, recordProviderSuccess } from "./provider-health";
import { groqProvider } from "./groq";

type NamedProvider = { kind: ModelProvider | "catalogue"; model: string; provider: ChatProvider };
const sourceByKind = { gemini: "GEMINI", groq: "GROQ", ollama: "OLLAMA_LOCAL", catalogue: "CATALOGUE_DEMO" } as const satisfies Record<NamedProvider["kind"], ReplySource>;

function hostedOrLocal(kind: ModelProvider): NamedProvider {
  if (kind === "ollama") return { kind, model: ollamaModel, provider: ollamaProvider() };
  const provider = kind === "gemini" ? geminiProvider() : groqProvider();
  return { kind, model: provider.model, provider };
}

const globalState = globalThis as typeof globalThis & { auriaTurns?: Map<string, AbortController> };
const active = globalState.auriaTurns ??= new Map<string, AbortController>();
export function stopTurn(owner: string, conversationId: string) {
  const turn = withOwner(owner, (s) => { const c = ownedConversation(s, conversationId); const turn = c.activeTurn; if (turn) { const m = c.messages.find((m) => m.id === turn.assistantId)!; m.state = "STOPPED"; c.activeTurn = null; c.version++; } return turn; });
  if (turn) active.get(`${owner}:${conversationId}:${turn.id}`)?.abort();
  return withOwner(owner, (s) => ownedConversation(s, conversationId));
}
export async function chat(request: Request, owner: string) {
  const body = await readJson(request, chatInput);
  const diagnostic = process.env.AURIA_TEST_STORE === "true" ? body.mode : undefined;
  const catalogueOnly = diagnostic === "catalogue";
  const hash = createHash("sha256").update(JSON.stringify({ message: body.message, version: body.expectedVersion, ...(catalogueOnly ? { mode: "catalogue" } : {}), ...(body.retryOf ? { retryOf: body.retryOf } : {}), ...(body.recommendationId ? { recommendationId: body.recommendationId } : {}), ...(body.language ? { language: body.language } : {}) })).digest("hex");
  const replay = withOwner(owner, (s) => { const c = ownedConversation(s, body.conversationId); const previous = c.requests[body.requestId]; if (previous && previous.hash !== hash) throw new AuriaError("IDEMPOTENCY_CONFLICT", "This request ID belongs to another message.", 409); return previous ? c : null; });
  if (replay) {
    if (replay.activeTurn) throw new AuriaError("TURN_ACTIVE", "This response is still running. Reload history or stop it.", 409);
    return new Response(JSON.stringify({ type: "done", conversation: replay } satisfies ChatEvent) + "\n", { headers: { ...noStore, "Content-Type": "application/x-ndjson" } });
  }
  const choices = catalogueOnly ? [] : providerOrder(process.env);
  if (diagnostic === "live" && !choices.length) throw new AuriaError("CHAT_UNAVAILABLE", providerCapability().reason, 503);
  const conversation = withOwner(owner, (s) => {
    const c = ownedConversation(s, body.conversationId);
    if (c.activeTurn) throw new AuriaError("TURN_ACTIVE", "Stop the current response before sending another.", 409);
    if (c.version !== body.expectedVersion) throw new AuriaError("VERSION_CONFLICT", "History changed in another tab. Reload it before sending.", 409, true);
    const previous = c.messages.at(-1);
    if (body.retryOf && (previous?.id !== body.retryOf || previous.role !== "assistant" || c.messages.at(-2)?.text !== body.message || !(previous.state === "FAILED" || previous.state === "STOPPED" || previous.assistance?.retryable))) {
      throw new AuriaError("VERSION_CONFLICT", "Reload the conversation before retrying this message.", 409, true);
    }
    if (!body.retryOf && c.messages.length >= 80) throw new AuriaError("CONVERSATION_LIMIT", "Start a new conversation to continue.", 429);
    const now = new Date().toISOString(); const assistantId = body.retryOf ?? randomUUID();
    if (body.retryOf) c.messages.pop();
    else c.messages.push({ id: randomUUID(), role: "user", text: body.message, createdAt: now, state: "COMPLETE", cards: [] });
    c.messages.push({ id: assistantId, role: "assistant", text: "", createdAt: now, state: "STREAMING", cards: [] });
    if (c.messages.length === 2 && !body.retryOf) c.title = demoTitle(body.message);
    c.language = body.language ?? c.language;
    c.updatedAt = now; c.version++;
    c.requests[body.requestId] = { hash, assistantId }; c.activeTurn = { id: body.requestId, assistantId, expiresAt: Date.now() + 95_000 };
    return c;
  });
  const turnKey = `${owner}:${body.conversationId}:${body.requestId}`;
  const controller = new AbortController(); active.set(turnKey, controller);
  const abort = () => controller.abort();
  if (request.signal.aborted) abort();
  else request.signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error("TIMEOUT")), 90_000);
  let text = ""; let cards = conversation.messages.at(-1)!.cards;
  let source: ReplySource | undefined;
  let fallback = false;
  let draftDesignId: string | undefined;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(output) {
      let open = true;
      const send = (event: ChatEvent) => { if (open) try { output.enqueue(encoder.encode(JSON.stringify(event) + "\n")); } catch { open = false; controller.abort(); } };
      let lastCheck = 0;
      const stillActive = (force = true) => {
        controller.signal.throwIfAborted();
        if (!force && Date.now() - lastCheck < 1000) return;
        lastCheck = Date.now();
        if (!withOwner(owner, (state) => ownedConversation(state, body.conversationId).activeTurn?.id === body.requestId)) {
          controller.abort();
          controller.signal.throwIfAborted();
        }
      };
      const finish = (state: "COMPLETE" | "FAILED" | "STOPPED", failure?: AuriaError): Conversation => withOwner(owner, (s) => { const c = ownedConversation(s, body.conversationId); const m = c.messages.find((m) => m.id === conversation.activeTurn!.assistantId)!; m.text = text; m.cards = cards; if (source) m.source = source; if (fallback) m.assistance = { retryable: choices.length > 0 }; m.state = c.activeTurn?.id === body.requestId ? state : "STOPPED"; if (m.state === "COMPLETE" && draftDesignId && c.selectedDesignId !== draftDesignId) { c.selectedDesignId = draftDesignId; c.referenceNote = null; } if (m.state === "COMPLETE" && cards.length === 1 && c.selectedDesignId !== cards[0].id && (!c.selectedDesignId || body.message.toUpperCase().includes(cards[0].designCode) || /\b(prefer|choose|select|like|pasand)\b|پسند/i.test(body.message))) { c.selectedDesignId = cards[0].id; c.referenceNote = null; } if (failure && m.state === "FAILED") { m.errorCode = failure.code; m.failure = { message: failure.message, retryable: failure.retryable }; } if (c.activeTurn?.id === body.requestId) { c.activeTurn = null; c.version++; } c.updatedAt = new Date().toISOString(); return c; });
      try {
        const history = providerHistory(conversation.messages);
        const describe = (id: string) => { const d = findPublicDesign(id); return d ? { id, designCode: d.designCode, title: d.title, category: d.categorySlug, purities: d.variants.flatMap((variant) => variant.karat ? [variant.karat] : []) } : null; };
        const displayed = body.recommendationId
          ? conversation.messages.find((message) => message.id === body.recommendationId && message.role === "assistant" && message.state === "COMPLETE")?.cards.map(({ id }) => id) ?? []
          : conversation.recentDesignIds;
        const userMessages = conversation.messages.filter((message) => message.role === "user");
        const preferred = userMessages.map((message) => purityFrom(message.text)).findLast(Boolean);
        const guided = diagnostic !== "live" && isGuidedRequest(body.message, !!body.recommendationId);
        const context = { language: conversation.language, selectedDesign: conversation.selectedDesignId ? describe(conversation.selectedDesignId) : null, displayedDesigns: displayed.flatMap((id, i) => { const d = describe(id); return d ? [{ position: i + 1, ...d }] : []; }), purityPreference: preferred ? Number(preferred) : undefined, budgetPreferencePKR: userMessages.map((message) => budgetFrom(message.text)).findLast((budget) => budget !== null) ?? null, shortlistDesigns: (body.recommendationId ? undefined : conversation.shortlistDesignIds)?.flatMap((id) => { const design = describe(id); return design ? [design] : []; }), referenceNote: conversation.referenceNote ?? null, draft: conversation.draft ? { status: conversation.draft.status, designId: conversation.draft.designId, reference: conversation.draft.reference } : null };
        const providers: NamedProvider[] = (guided ? [] : choices).filter((kind) => !healthFor(kind)).map(hostedOrLocal);
        const hasModelAlternative = providers.length > 1;
        if (diagnostic !== "live") providers.push({ kind: "catalogue", model: "catalogue", provider: catalogueDemoProvider(body.message, context, history) });
        const greeting = /^(?:hi|hello|hey|salaam|salam|assalam(?:u)? alaikum|السلام علیکم|thank you|thanks|shukriya|شکریہ)[.!؟!\s]*$/iu.test(body.message.trim());
        const contextJson = JSON.stringify(context);
        async function* responseEvents(): AsyncGenerator<ChatEvent> {
          if (!providers.length) throw new AuriaError("CHAT_UNAVAILABLE", "Advanced assistance is temporarily unavailable.", 503, true);
          for (const entry of providers) {
            const startedAt = Date.now();
            const isCatalogue = entry.kind === "catalogue";
            const provenance = sourceByKind[entry.kind];
            let visible = false, draftWrite = false;
            const pending: ChatEvent[] = [];
            try {
              for await (const event of orchestrate({
                provider: entry.provider, groundFirst: !isCatalogue && !greeting, requireInitialTool: !isCatalogue && !greeting,
                system: conciergeInstructions + "\nApplication context (IDs in displayed order): " + contextJson,
                context: contextJson, history, signal: controller.signal,
                beforeCall: () => { stillActive(); return isCatalogue ? "local" : reserveCall(owner, entry.model); },
                usage: (id, usage, state) => { if (!isCatalogue) finishProviderCall(owner, id, usage, state); },
                retry: entry.kind === "gemini" || entry.kind === "groq" ? async (error) => {
                  if (hasModelAlternative || !isTransientProviderFailure(error) || draftWrite || visible || upstreamRetryAfter(error) > 1500) return false;
                  await wait(Math.max(750, upstreamRetryAfter(error)) + Math.floor(Math.random() * 150), undefined, { signal: controller.signal });
                  return true;
                } : undefined,
                execute: (call) => {
                  stillActive();
                  const result = executeTool(owner, body.conversationId, call.name, call.args);
                  if (result.draft && call.name === "createQuoteDraft") { draftWrite = true; draftDesignId = result.draft.designId; }
                  return result;
                },
              })) {
                if (!visible && event.type !== "delta" && !draftWrite) { pending.push(event); continue; }
                if (!visible) {
                  visible = true;
                  source = provenance;
                  fallback = isCatalogue && !catalogueOnly && !guided;
                  yield { type: "source", source, ...(fallback ? { assistance: { retryable: choices.length > 0 } } : {}) };
                  yield* pending;
                }
                yield event;
              }
              if (entry.kind !== "catalogue") {
                recordProviderSuccess(entry.kind);
                console.info("[auria] reply completed", { provider: entry.kind, model: entry.model, durationMs: Date.now() - startedAt });
              }
              return;
            } catch (error) {
              if (entry.kind !== "catalogue" && !controller.signal.aborted) {
                const code = providerError(error).code;
                recordProviderFailure(entry.kind, code, error);
                console.warn("[auria] provider attempt failed", { provider: entry.kind, upstreamStatus: upstreamStatus(error), code, durationMs: Date.now() - startedAt });
              }
              if (isCatalogue || visible || draftWrite || controller.signal.aborted || diagnostic === "live" && (!canUseLocalFallback(error) || entry === providers.at(-1))) throw error;
            }
          }
        }

        for await (const event of responseEvents()) {
          stillActive(false);
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
        stillActive(); const completed = finish("COMPLETE"); if ((source === "GEMINI" || source === "GROQ") && completed.messages.at(-1)?.state === "COMPLETE") markVerified(source === "GEMINI" ? "gemini" : "groq"); send({ type: "done", conversation: completed });
      } catch (error) {
        const timedOut = controller.signal.aborted && controller.signal.reason instanceof Error && controller.signal.reason.message === "TIMEOUT";
        const safe = timedOut ? new AuriaError("TIMEOUT", "The response timed out. You can retry.", 504, true) : controller.signal.aborted ? new AuriaError("STOPPED", "Response stopped. Partial text may be incomplete.", 409, true) : providerError(error);
        if (!controller.signal.aborted) console.warn("[auria] chat failure", { requestId: body.requestId, upstreamStatus: upstreamStatus(error), code: safe.code });
        try { const c = finish(controller.signal.aborted && !timedOut ? "STOPPED" : "FAILED", safe); send({ type: "error", code: safe.code, message: safe.message, retryable: safe.retryable }); send({ type: "done", conversation: c }); } catch { send({ type: "error", code: "SAVE_FAILED", message: "The response could not be saved. Reload history before retrying.", retryable: true }); }
      } finally { clearTimeout(timeout); request.signal.removeEventListener("abort", abort); active.delete(turnKey); if (open) try { output.close(); } catch {} }
    },
    cancel() { controller.abort(); },
  });
  return new Response(stream, { headers: { ...noStore, "Content-Type": "application/x-ndjson; charset=utf-8", "X-Accel-Buffering": "no" } });
}

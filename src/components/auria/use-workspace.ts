"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CallbackDraft, Capability, ChatEvent, ChatMessage, ChatMode, Conversation, ConversationSummary, Language, QuoteDraft } from "@/types/auria";
import type { DesignCardData, PublicDesign } from "@/types/catalogue";
export type View = "conversation" | "selection" | "history";
type Session = { csrfToken: string; capability: Capability };
let bootstrapRequest: Promise<Session> | null = null;

function bootstrap() {
  bootstrapRequest ??= fetch("/api/ai/session", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  }).then(async (r) => {
    const payload = await r.json();
    if (!r.ok) throw new Error(payload.error?.message || "Could not start your session.");
    return payload.data as Session;
  }).finally(() => { bootstrapRequest = null; });
  return bootstrapRequest;
}

function restoredMode(conversation: Conversation): ChatMode {
  return conversation.mode ?? (conversation.messages.findLast((message) => message.role === "assistant")?.source === "CATALOGUE_DEMO" ? "catalogue" : "live");
}
export function useWorkspace() {
  const [csrf, setCsrf] = useState(""); const [capability, setCapability] = useState<Capability | null>(null);
  const [history, setHistory] = useState<ConversationSummary[]>([]); const [conversation, setConversation] = useState<Conversation | null>(null);
  const [selected, setSelected] = useState<PublicDesign | null>(null); const [view, setView] = useState<View>("conversation");
  const [input, setInput] = useState(""); const [language, setLanguage] = useState<Language>("auto");
  const [mode, setMode] = useState<ChatMode>("live");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState<ChatMessage | null>(null); const [notice, setNotice] = useState(""); const [retryText, setRetryText] = useState(""); const [usageCount, setUsageCount] = useState(0);
  const [retryAllowed, setRetryAllowed] = useState(false);
  const [newReply, setNewReply] = useState(false);
  const followsTail = useRef(true);
  const lastScrollIntent = useRef(-Infinity);
  const sendLock = useRef(false);
  const abortRef = useRef<AbortController | null>(null); const scrollRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLTextAreaElement>(null); const conversationRef = useRef<Conversation | null>(null);
  useEffect(() => { conversationRef.current = conversation; }, [conversation]);
  const api = useCallback(async <T,>(path: string, body?: unknown, token = csrf): Promise<T> => {
    const response = await fetch(`/api/ai/${path}`, { method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store" });
    const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message || "Could not complete the request."); return payload.data as T;
  }, [csrf]);
  const refreshHistory = useCallback(async () => { const data = await api<{ conversations: ConversationSummary[]; capability: Capability; usage: unknown[] }>("conversations"); setHistory(data.conversations); setCapability(data.capability); setUsageCount(data.usage.length); }, [api]);
  const loadConversation = useCallback(async (id: string) => {
    const c = await api<Conversation>(`conversations/${id}`); followsTail.current = true; lastScrollIntent.current = -Infinity;
    setConversation(c); setLanguage(c.language); setMode(restoredMode(c)); setSelected(null); setRetryText("");
    if (c.selectedDesignId) { const r = await fetch(`/api/designs/${c.selectedDesignId}`); const p = await r.json(); if (r.ok) setSelected(p.data); }
    return c;
  }, [api]);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const session = await bootstrap();
        if (!live) return; setCsrf(session.csrfToken); setCapability(session.capability);
        const list = await fetch("/api/ai/conversations", { cache: "no-store" }); const result = await list.json(); if (!list.ok) throw new Error(result.error?.message || "Could not restore history.");
        if (!live) return; setHistory(result.data.conversations); setUsageCount(result.data.usage.length);
        const id = new URLSearchParams(location.search).get("conversation") || result.data.conversations[0]?.id;
        if (id) { const response = await fetch(`/api/ai/conversations/${encodeURIComponent(id)}`, { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || "Conversation unavailable."); if (!live) return; setConversation(data.data); setLanguage(data.data.language); setMode(restoredMode(data.data)); if (data.data.selectedDesignId) { const d = await fetch(`/api/designs/${data.data.selectedDesignId}`); const dp = await d.json(); if (live && d.ok) setSelected(dp.data); } }
      } catch (e) { if (live) setError(e instanceof Error ? e.message : "Session unavailable."); } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; abortRef.current?.abort(); };
  }, []);
  function noteScrollIntent() {
    lastScrollIntent.current = performance.now();
  }

  function jumpToStart() {
    followsTail.current = false;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  function updateFollow() {
    const el = scrollRef.current;
    if (loading || !el || !el.clientHeight) return;
    const nearTail = el.scrollHeight - el.clientHeight - el.scrollTop < 40;
    // Restore/resize can emit scroll events even if the customer has not left the latest reply.
    if (!nearTail && followsTail.current && performance.now() - lastScrollIntent.current > 500) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    followsTail.current = nearTail;
    if (nearTail) setNewReply(false);
  }

  function jumpToReply() {
    followsTail.current = true;
    lastScrollIntent.current = -Infinity;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setNewReply(false);
  }

  const lastMessage = streaming ?? conversation?.messages.at(-1);
  const transcriptReady = !loading && !!lastMessage;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const content = el?.querySelector(".atelier-messages");
    if (!transcriptReady || view !== "conversation" || !el || !content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (el.clientHeight && followsTail.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(el);
    observer.observe(content);
    return () => observer.disconnect();
  }, [conversation?.id, transcriptReady, view]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !el.clientHeight) return;
    const frame = requestAnimationFrame(() => {
      if (followsTail.current) {
        el.scrollTop = el.scrollHeight;
        setNewReply(false);
      } else if (lastMessage?.role === "assistant") {
        setNewReply(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [lastMessage, view, loading, error]);
  async function newConversation() {
    setBusy(true); setError(""); setNotice(""); setNewReply(false);
    followsTail.current = true;
    lastScrollIntent.current = -Infinity;
    try { const c = await api<Conversation>("conversations", { language, mode }); setConversation(c); setSelected(null); setStreaming(null); setInput(""); setRetryText(""); setView("conversation"); window.history.replaceState(null, "", `/ai-atelier?conversation=${c.id}`); await refreshHistory(); inputRef.current?.focus(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function openConversation(id: string) { setError(""); setNotice(""); setInput(""); setNewReply(false); setLoading(true); try { await loadConversation(id); setView("conversation"); window.history.replaceState(null, "", `/ai-atelier?conversation=${id}`); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } }
  async function selectDesign(design: DesignCardData, referenceNote?: string) {
    if (busy) return; setBusy(true); setError("");
    try { const c = conversation ?? await api<Conversation>("conversations", { language, mode }); const updated = await api<Conversation>(`conversations/${c.id}/selection`, { selectedDesignId: design.id, expectedVersion: c.version, ...(referenceNote ? { referenceNote } : {}) }); setConversation(updated); const response = await fetch(`/api/designs/${design.id}`); const data = await response.json(); if (!response.ok) throw new Error("Design details unavailable."); setSelected(data.data); setView("selection"); await refreshHistory(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function send(text = input) {
    if (busy || loading || sendLock.current || conversation?.activeTurn || !csrf || !text.trim()) return; if (mode === "live" && !capability?.available) { setError(capability?.reason || "Chat is unavailable."); return; }
    sendLock.current = true;
    followsTail.current = true;
    lastScrollIntent.current = -Infinity;
    setBusy(true); setError(""); setNotice(""); setRetryAllowed(false); setRetryText(text); setView("conversation"); const controller = new AbortController(); abortRef.current = controller; let c = conversation;
    let completedReply: ChatMessage | undefined;
    try {
      if (!c) {
        c = await api<Conversation>("conversations", { language, mode });
        window.history.replaceState(null, "", `/ai-atelier?conversation=${c.id}`);
      }
      setConversation(c);
      conversationRef.current = c;
      const now = new Date().toISOString(); const user: ChatMessage = { id: crypto.randomUUID(), role: "user", text, createdAt: now, state: "COMPLETE", cards: [] };
      setConversation({ ...c, messages: [...c.messages, user] }); setStreaming({ id: "stream", role: "assistant", text: "", createdAt: now, state: "STREAMING", cards: [], ...(mode === "catalogue" ? { source: "CATALOGUE_DEMO" as const } : {}) }); setInput("");
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ conversationId: c.id, expectedVersion: c.version, requestId: crypto.randomUUID(), message: text, mode }), signal: controller.signal });
      if (!response.ok) {
        const data = await response.json();
        setRetryAllowed(!!data.error?.retryable);
        throw new Error(data.error?.message || "Chat request failed.");
      }
      setRetryAllowed(true);
      if (!response.body) throw new Error("Streaming is unavailable in this browser.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "", completed = false, failed = false;
      let newDesignId: string | null = null;
      const accept = (line: string) => {
        if (!line.trim() || completed) return;
        const event = JSON.parse(line) as ChatEvent;
        if (event.type === "source") setStreaming((m) => m ? { ...m, source: event.source } : m);
        if (event.type === "delta") setStreaming((m) => m ? { ...m, text: m.text + event.text } : m);
        if (event.type === "cards") setStreaming((m) => m ? { ...m, cards: event.cards } : m);
        if (event.type === "draft") setConversation((current) => current ? { ...current, draft: event.draft } : current);
        if (event.type === "error") { failed = true; setError(event.message); setRetryAllowed(event.retryable); }
        if (event.type === "done") {
          completed = true;
          if (event.conversation.selectedDesignId !== c?.selectedDesignId) newDesignId = event.conversation.selectedDesignId;
          setConversation(event.conversation);
          setStreaming(null);
          const latest = event.conversation.messages.at(-1);
          if (!failed && latest?.role === "assistant" && latest.state === "COMPLETE") {
            completedReply = latest;
            setRetryText("");
            setNotice("Response saved.");
          }
        }
      };
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          buffer += decoder.decode(next.value, { stream: true });
          const lines = buffer.split("\n"); buffer = lines.pop()!;
          lines.forEach(accept);
        }
        buffer += decoder.decode();
        if (buffer.trim()) accept(buffer);
        if (!completed) throw new Error("Connection interrupted. Reload history before retrying.");
      } finally {
        if (!completed) void reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      if (newDesignId) {
        const response = await fetch(`/api/designs/${newDesignId}`).catch(() => null);
        if (response?.ok) setSelected(await response.json().then((payload) => payload.data).catch(() => null));
      }
    } catch (e) { if (!controller.signal.aborted) setError((e as Error).message); else setNotice("Response stopped."); if (c) { try { await loadConversation(c.id); setRetryText(text); } catch {} } setStreaming(null); }
    finally {
      abortRef.current = null;
      await refreshHistory().catch(() => undefined);
      sendLock.current = false;
      setBusy(false);
    }
    return controller.signal.aborted ? undefined : completedReply;
  }
  async function stop() { const c = conversationRef.current; if (!c) return; try { const updated = await api<Conversation>(`conversations/${c.id}/stop`, {}); setConversation(updated); abortRef.current?.abort(); setNotice("Response stopped."); } catch (e) { setError((e as Error).message); } }
  async function saveDraft(body: unknown) { if (!conversation) return; const draft = await api<QuoteDraft>(`conversations/${conversation.id}/draft`, body); setConversation((c) => c ? { ...c, draft } : c); setNotice("Demo draft saved. Nothing has been submitted."); }
  async function submitDraft(version: number, idempotencyKey: string) { if (!conversation) return; const draft = await api<QuoteDraft>(`conversations/${conversation.id}/submit`, { expectedVersion: version, idempotencyKey, processingAccepted: true, fictionalDataConfirmed: true }); setConversation((c) => c ? { ...c, draft } : c); setNotice("Demo enquiry saved. No real order or notification created."); }
  async function saveCallback(input: unknown) {
    setBusy(true);
    try {
      const current = conversation ?? await api<Conversation>("conversations", { language, mode });
      if (!conversation) {
        setConversation(current);
        window.history.replaceState(null, "", `/ai-atelier?conversation=${current.id}`);
      }
      const callback = await api<CallbackDraft>(`conversations/${current.id}/callback`, input);
      setConversation((previous) => previous?.id === current.id ? { ...previous, callback } : previous);
      await refreshHistory().catch(() => undefined);
    } finally { setBusy(false); }
  }
  async function submitCallback(version: number, idempotencyKey: string) {
    if (!conversation) return;
    const callback = await api<CallbackDraft>(`conversations/${conversation.id}/callback-submit`, {
      expectedVersion: version, idempotencyKey, processingAccepted: true, fictionalDataConfirmed: true,
    });
    setConversation((previous) => previous?.id === conversation.id ? { ...previous, callback } : previous);
  }
  async function reloadDraft() { if (conversation) await loadConversation(conversation.id); }
  async function changeMode(next: ChatMode) {
    if (busy || loading || conversation?.activeTurn || sendLock.current) return;
    setBusy(true);
    try {
      if (conversation) setConversation(await api<Conversation>(`conversations/${conversation.id}/mode`, { mode: next, expectedVersion: conversation.version }));
      setMode(next);
      setError("");
      if (retryText) setInput(retryText);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return { csrf, capability, history, conversation, selected, view, setView, input, setInput, language, setLanguage, mode, changeMode, error, busy, loading, streaming, notice, retryText, retryAllowed, newReply, updateFollow, noteScrollIntent, jumpToStart, jumpToReply, usageCount, scrollRef, inputRef, newConversation, openConversation, selectDesign, send, stop, saveDraft, submitDraft, reloadDraft, saveCallback, submitCallback };
}

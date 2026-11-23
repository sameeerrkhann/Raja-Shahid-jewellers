"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Capability, ChatEvent, ChatMessage, Conversation, ConversationSummary, Language, QuoteDraft } from "@/types/auria";
import type { DesignCardData, PublicDesign } from "@/types/catalogue";
export type View = "conversation" | "selection" | "history";
export function useWorkspace() {
  const [csrf, setCsrf] = useState(""); const [capability, setCapability] = useState<Capability | null>(null);
  const [history, setHistory] = useState<ConversationSummary[]>([]); const [conversation, setConversation] = useState<Conversation | null>(null);
  const [selected, setSelected] = useState<PublicDesign | null>(null); const [view, setView] = useState<View>("conversation");
  const [input, setInput] = useState(""); const [language, setLanguage] = useState<Language>("auto");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState<ChatMessage | null>(null); const [notice, setNotice] = useState(""); const [retryText, setRetryText] = useState(""); const [usageCount, setUsageCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null); const scrollRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLTextAreaElement>(null); const conversationRef = useRef<Conversation | null>(null);
  useEffect(() => { conversationRef.current = conversation; }, [conversation]);
  const api = useCallback(async <T,>(path: string, body?: unknown, token = csrf): Promise<T> => {
    const response = await fetch(`/api/ai/${path}`, { method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store" });
    const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message || "Could not complete the request."); return payload.data as T;
  }, [csrf]);
  const refreshHistory = useCallback(async () => { const data = await api<{ conversations: ConversationSummary[]; capability: Capability; usage: unknown[] }>("conversations"); setHistory(data.conversations); setCapability(data.capability); setUsageCount(data.usage.length); }, [api]);
  const loadConversation = useCallback(async (id: string) => {
    const c = await api<Conversation>(`conversations/${id}`); setConversation(c); setLanguage(c.language); setSelected(null); setRetryText("");
    if (c.selectedDesignId) { const r = await fetch(`/api/designs/${c.selectedDesignId}`); const p = await r.json(); if (r.ok) setSelected(p.data); }
    return c;
  }, [api]);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/ai/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); const p = await r.json(); if (!r.ok) throw new Error(p.error?.message || "Could not start your session.");
        if (!live) return; setCsrf(p.data.csrfToken); setCapability(p.data.capability);
        const list = await fetch("/api/ai/conversations", { cache: "no-store" }); const result = await list.json(); if (!list.ok) throw new Error(result.error?.message || "Could not restore history.");
        if (!live) return; setHistory(result.data.conversations); setUsageCount(result.data.usage.length);
        const id = new URLSearchParams(location.search).get("conversation") || result.data.conversations[0]?.id;
        if (id) { const response = await fetch(`/api/ai/conversations/${encodeURIComponent(id)}`, { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || "Conversation unavailable."); if (!live) return; setConversation(data.data); setLanguage(data.data.language); if (data.data.selectedDesignId) { const d = await fetch(`/api/designs/${data.data.selectedDesignId}`); const dp = await d.json(); if (live && d.ok) setSelected(dp.data); } }
      } catch (e) { if (live) setError(e instanceof Error ? e.message : "Session unavailable."); } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; abortRef.current?.abort(); };
  }, []);
  useEffect(() => { const el = scrollRef.current; if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) el.scrollTop = el.scrollHeight; }, [streaming, conversation]);
  async function newConversation() {
    setBusy(true); setError("");
    try { const c = await api<Conversation>("conversations", { language }); setConversation(c); setSelected(null); setStreaming(null); setInput(""); setRetryText(""); setView("conversation"); window.history.replaceState(null, "", `/ai-atelier?conversation=${c.id}`); await refreshHistory(); inputRef.current?.focus(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function openConversation(id: string) { setError(""); setLoading(true); try { await loadConversation(id); setView("conversation"); window.history.replaceState(null, "", `/ai-atelier?conversation=${id}`); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } }
  async function selectDesign(design: DesignCardData) {
    if (busy) return; setBusy(true); setError("");
    try { const c = conversation ?? await api<Conversation>("conversations", { language }); const updated = await api<Conversation>(`conversations/${c.id}/selection`, { selectedDesignId: design.id, expectedVersion: c.version }); setConversation(updated); const response = await fetch(`/api/designs/${design.id}`); const data = await response.json(); if (!response.ok) throw new Error("Design details unavailable."); setSelected(data.data); setView("selection"); await refreshHistory(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function send(text = input) {
    if (busy || !text.trim()) return; if (!capability?.available) { setError(capability?.reason || "Chat is unavailable."); return; }
    setBusy(true); setError(""); setNotice(""); setRetryText(text); setView("conversation"); const controller = new AbortController(); abortRef.current = controller; let c = conversation;
    try {
      c ??= await api<Conversation>("conversations", { language }); setConversation(c); conversationRef.current = c;
      const now = new Date().toISOString(); const user: ChatMessage = { id: crypto.randomUUID(), role: "user", text, createdAt: now, state: "COMPLETE", cards: [] };
      setConversation({ ...c, messages: [...c.messages, user] }); setStreaming({ id: "stream", role: "assistant", text: "", createdAt: now, state: "STREAMING", cards: [] }); setInput("");
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ conversationId: c.id, expectedVersion: c.version, requestId: crypto.randomUUID(), message: text }), signal: controller.signal });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error?.message || "Chat request failed."); }
      if (!response.body) throw new Error("Streaming is unavailable in this browser.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "", completed = false, failed = false;
      const accept = (line: string) => {
        if (!line.trim()) return; const event = JSON.parse(line) as ChatEvent;
        if (event.type === "delta") setStreaming((m) => m ? { ...m, text: m.text + event.text } : m);
        if (event.type === "cards") setStreaming((m) => m ? { ...m, cards: event.cards } : m);
        if (event.type === "draft") setConversation((current) => current ? { ...current, draft: event.draft } : current);
        if (event.type === "error") { failed = true; setError(event.message); }
        if (event.type === "done") { completed = true; setConversation(event.conversation); setStreaming(null); if (!failed) { setRetryText(""); setNotice("Response saved."); } }
      };
      while (true) { const next = await reader.read(); if (next.done) break; buffer += decoder.decode(next.value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop()!; lines.forEach(accept); }
      buffer += decoder.decode(); if (buffer.trim()) accept(buffer); if (!completed) throw new Error("Connection interrupted. Reload history before retrying.");
    } catch (e) { if (!controller.signal.aborted) setError((e as Error).message); else setNotice("Response stopped. Partial text may be incomplete."); if (c) { try { await loadConversation(c.id); setRetryText(text); } catch {} } setStreaming(null); }
    finally { abortRef.current = null; setBusy(false); await refreshHistory().catch(() => undefined); }
  }
  async function stop() { const c = conversationRef.current; if (!c) return; try { const updated = await api<Conversation>(`conversations/${c.id}/stop`, {}); setConversation(updated); abortRef.current?.abort(); setNotice("Response stopped."); } catch (e) { setError((e as Error).message); } }
  async function saveDraft(body: unknown) { if (!conversation) return; const draft = await api<QuoteDraft>(`conversations/${conversation.id}/draft`, body); setConversation((c) => c ? { ...c, draft } : c); setNotice("Demo draft saved. Nothing has been submitted."); }
  async function submitDraft(version: number, idempotencyKey: string) { if (!conversation) return; const draft = await api<QuoteDraft>(`conversations/${conversation.id}/submit`, { expectedVersion: version, idempotencyKey, processingAccepted: true, fictionalDataConfirmed: true }); setConversation((c) => c ? { ...c, draft } : c); setNotice("Demo enquiry saved. No real order or notification created."); }
  async function reloadDraft() { if (conversation) await loadConversation(conversation.id); }
  return { csrf, capability, history, conversation, selected, view, setView, input, setInput, language, setLanguage, error, busy, loading, streaming, notice, retryText, usageCount, scrollRef, inputRef, newConversation, openConversation, selectDesign, send, stop, saveDraft, submitDraft, reloadDraft };
}

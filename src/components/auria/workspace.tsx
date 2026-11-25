"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Language } from "@/types/auria";
import type { DesignCardData } from "@/types/catalogue";
import { statusLabels } from "@/config/catalogue";
import { savedProviderFailure } from "@/lib/auria/provider-policy";
import { SafeMessage } from "./safe-message";
import { QuotePanel } from "./quote-panel";
import { EnquiryLookup } from "./enquiry-status";
import { AtelierCore, type CoreState } from "./atelier-core";
import { JewelleryPicture, JewelleryStage } from "./jewellery-stage";
import { useWorkspace, type View } from "./use-workspace";
import { ReferencePanel } from "./reference-panel";
import { useLocalVoice, type DictationLanguage } from "./use-local-voice";
import { CallbackPanel } from "./callback-panel";
import { budgetFrom, demoLanguage } from "@/lib/auria/demo-intent";

const suggestions = [
  { label: "22K gold rings", prompt: "Show me 22K gold rings." },
  { label: "Bridal jewellery", prompt: "Show me bridal jewellery." },
  { label: "Compare two designs", prompt: "Compare RSJ-D005 and RSJ-D007." },
  { label: "Quotation draft", prompt: "I'd like to prepare a quotation draft." },
];
const views: { id: View; label: string }[] = [
  { id: "conversation", label: "Conversation" }, { id: "selection", label: "Design & draft" }, { id: "history", label: "History" },
];

function Message({ message, busy, selectDesign }: { message: ChatMessage; busy: boolean; selectDesign: (card: DesignCardData) => void }) {
  return <article className={`auria-message auria-message--${message.role}`} aria-label={message.role === "user" ? "Your message" : "AURIA response"}>
    <div className="auria-message-meta"><span>{message.role === "user" ? "You" : message.source === "CATALOGUE_DEMO" ? "Catalogue assistance" : "AURIA"}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>
    {message.text && <SafeMessage text={message.text} />}
    {message.state === "FAILED" && <p className="auria-failed-message">{message.errorCode?.startsWith("PROVIDER_") || message.errorCode === "MODEL_UNAVAILABLE" ? "Advanced assistance could not finish this reply." : (message.failure ?? savedProviderFailure(message.errorCode)).message}</p>}
    {message.state === "STOPPED" && <p className="auria-message-state">Response stopped.</p>}
    {message.state === "STREAMING" && !message.text && <p className="auria-muted">Preparing your response…</p>}
    {message.cards.length > 0 && <div className="auria-recommendations" role="region" aria-label="Recommended designs" tabIndex={0}>
      {message.cards.map((card) => <button type="button" className="auria-design" key={card.id} disabled={busy} onClick={() => selectDesign(card)}>
        <JewelleryPicture media={card.thumbnail} title={card.title} />
        <span><small translate="no">{card.designCode}</small><strong>{card.title}</strong><small>Sample · {statusLabels[card.displayStatus]}</small></span>
      </button>)}
    </div>}
    {(message.state === "FAILED" || message.state === "STOPPED") && !!message.text && <p className="auria-message-state">Partial response</p>}
  </article>;
}

export function AuriaWorkspace({ discovery, fontClass }: { discovery: DesignCardData[]; fontClass?: string }) {
  const { csrf, capability, history, conversation, selected, view, setView, input, setInput, language, setLanguage, error, busy, loading, streaming, notice, retryText, retryAllowed, newReply, updateFollow, noteScrollIntent, jumpToStart, jumpToReply, scrollRef, inputRef, newConversation, openConversation, selectDesign, send, stop, saveDraft, submitDraft, reloadDraft, saveCallback, submitCallback } = useWorkspace();
  const { state: voiceState, voiceActivity, voiceNotice, voiceReload, dictate, finishDictation, cancelDictation, retryDictation, stopVoice, readAloud, installLanguage, installVoicePack } = useLocalVoice();
  const [voiceMode, setVoiceMode] = useState(false);
  const voiceIntent = useRef({ enabled: false });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pinned, setPinned] = useState<{ conversationId?: string; recommendationId?: string; designId: string } | null>(null);
  const messages = conversation?.messages;
  const recommendations = useMemo(() => (messages ?? []).filter((message) => message.role === "assistant" && message.state === "COMPLETE" && message.cards.length).slice(-6).reverse().map(({ id, cards, createdAt }) => ({ id, cards, createdAt })), [messages]);
  const recommendationId = recommendations[0]?.id;
  const conversationId = conversation?.id;
  const shownPin = pinned && pinned.conversationId === conversationId && pinned.recommendationId === recommendationId ? pinned.designId : undefined;
  function chooseDesign(card: DesignCardData, note?: string) {
    setPinned({ conversationId, recommendationId, designId: card.id });
    void selectDesign(card, note);
  }
  const [dictationLanguage, setDictationLanguage] = useState<DictationLanguage | "auto">("auto");
  const voiceLanguage = dictationLanguage === "auto" ? (conversation?.language ?? language) === "ur" ? "ur-PK" : "en-US" : dictationLanguage;
  const scene = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (document.documentElement.dataset.reduceMotion === "true" && scene.current) {
      scene.current.dataset.reducedMotion = "true";
    }
  }, []);
  const historyPane = useRef<HTMLElement>(null);
  const historyToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (historyOpen) historyPane.current?.focus({ preventScroll: true });
  }, [historyOpen]);
  function closeHistory() {
    setHistoryOpen(false);
    historyToggle.current?.focus({ preventScroll: true });
  }
  const active = !!(streaming || conversation?.activeTurn);
  const blocked = busy || loading || active;
  const state: CoreState = voiceState === "listening" || voiceState === "speaking" ? voiceState : error ? "attention" : streaming?.text ? "responding" : active || voiceState === "checking" || voiceState === "finalizing" ? "processing" : "idle";
  const hasMessages = !!conversation?.messages.length || !!streaming;
  const budgetPreference = conversation?.messages.findLast((message) => message.role === "user" && budgetFrom(message.text));
  const lastQuestion = conversation?.messages.findLast((message) => message.role === "user")?.text ?? "";
  const lastReply = conversation?.messages.findLast((message) => message.role === "assistant" && message.state === "COMPLETE" && message.text);
  const nextAction = !blocked && lastReply && !error
    ? /\b(callback|call back|appointment|showroom visit|whatsapp|human)\b|ملاقات|رابطہ/i.test(lastQuestion) ? "contact"
      : /\b(quote|quotation|customize|customise)\b|کوٹیشن/i.test(lastQuestion) && (conversation?.draft || selected) ? "quote" : null
    : null;
  function showNextAction(action: "contact" | "quote") {
    setView("selection");
    requestAnimationFrame(() => {
      const target = document.getElementById("auria-" + action);
      if (target instanceof HTMLDetailsElement) target.open = true;
      (target?.querySelector("summary") ?? target)?.focus();
    });
  }
  function beginConversation() {
    stopVoice();
    if (historyOpen) closeHistory();
    void newConversation();
  }
  async function sendFromComposer(text?: string, retry = false) {
    stopVoice();
    const intent = voiceIntent.current;
    const reply = await send(text, retry);
    if (reply?.text && intent.enabled && intent === voiceIntent.current) readAloud(reply.text, spokenLanguage(reply.text));
  }
  function spokenLanguage(text: string) {
    if (dictationLanguage !== "auto") return dictationLanguage;
    return demoLanguage(text, conversation?.language ?? language) === "ur" ? "ur-PK" : voiceLanguage;
  }
  function toggleVoiceMode() {
    const next = !voiceIntent.current.enabled;
    voiceIntent.current = { enabled: next };
    setVoiceMode(next);
    if (!next) stopVoice();
  }
  function startDictation() {
    void dictate(voiceLanguage, (text) => setInput((previous) => `${previous} ${text}`.trim().slice(0, 4000)));
  }
  return <main id="main-content" ref={scene} className={["auria-workspace", fontClass].filter(Boolean).join(" ")} data-view={view} data-voice-activity={voiceActivity ?? undefined}>
    <div className="auria-masthead">
      <div className="atelier-identity"><AtelierCore state={state} compact /><div><h1 translate="no">AURIA <span>Jewellery Atelier</span></h1><p>Your personal jewellery concierge</p></div></div>
      <div className="atelier-masthead-actions">
        <button type="button" className="atelier-desktop-action atelier-outline" disabled={blocked || !csrf} onClick={beginConversation}>＋ New conversation</button>
        <button type="button" className="atelier-desktop-action atelier-outline" ref={historyToggle} aria-controls="atelier-history" aria-expanded={historyOpen} onClick={() => historyOpen ? closeHistory() : setHistoryOpen(true)}>Conversation history</button>
        <Link href="/designs" className="atelier-vault">Explore the Design Vault <span aria-hidden="true">↗</span></Link>
      </div>
    </div>
    <nav className="auria-mobile-nav" aria-label="Workspace views">
      {views.map((item) => <button type="button" key={item.id} aria-pressed={view === item.id} onClick={() => setView(item.id)}>{item.label}</button>)}
    </nav>
    <div className="auria-layout">
      <aside id="atelier-history" ref={historyPane} tabIndex={-1} className="auria-history" aria-label="Conversation history" data-drawer-open={historyOpen}
        onKeyDown={(event) => { if (historyOpen && event.key === "Escape") { event.stopPropagation(); closeHistory(); } }}>
        <button type="button" className="atelier-desktop-action atelier-outline atelier-close-history" onClick={closeHistory}>Close history</button>
        <AtelierCore state={state} />
        <div className="atelier-history__heading"><h2>Conversations</h2><button type="button" className="auria-new atelier-outline" disabled={blocked || !csrf} onClick={beginConversation}>New conversation</button></div>
        <label className="auria-label" htmlFor="auria-language">Language for new conversations</label>
        <select id="auria-language" name="language" value={language} onChange={(e) => setLanguage(e.target.value as Language)} disabled={busy}>
          <option value="auto">Follow my language</option><option value="en">English</option><option value="ur">اردو</option><option value="roman-ur">Roman Urdu</option>
        </select>
        <label className="auria-label" htmlFor="atelier-dictation-language">Dictation language</label>
        <select id="atelier-dictation-language" value={dictationLanguage} onChange={(event) => { stopVoice(); setDictationLanguage(event.target.value as DictationLanguage | "auto"); }}>
          <option value="auto">Follow conversation</option><option value="en-PK">English (Pakistan)</option>
          <option value="en-US">English (US)</option><option value="ur-PK">Urdu (Pakistan)</option>
        </select>
        <div className="auria-history-list">{history.length ? history.map((item) => <button type="button" key={item.id} disabled={blocked} aria-current={conversation?.id === item.id ? "true" : undefined} onClick={() => { stopVoice(); if (historyOpen) closeHistory(); void openConversation(item.id); }}><span>{item.title}</span><small>{new Date(item.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></button>) : <p className="auria-muted">Your saved conversations will appear here.</p>}</div>
        <p className="auria-history-note">Saved to this browser session for 7 days.</p>
      </aside>
      <section className="auria-chat" aria-label="AURIA conversation">
        <div className="auria-chat-heading">
          <div className="auria-chat-heading-copy"><AtelierCore state={state} compact /><div><h2>Conversation</h2><p>{loading ? "Opening your workspace…" : "Designs, quotations and enquiries"}</p></div></div>
        </div>
        <div className="auria-transcript" ref={scrollRef} onScroll={updateFollow} onWheel={noteScrollIntent} onTouchMove={noteScrollIntent} onPointerDown={noteScrollIntent} onFocusCapture={noteScrollIntent} aria-label="Messages" tabIndex={0}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget && (event.key === "Home" || event.key === "End")) {
              event.preventDefault();
              if (event.key === "Home") jumpToStart();
              else jumpToReply();
            } else if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " "].includes(event.key)) {
              noteScrollIntent();
            }
          }}>
          {loading ? <div className="auria-skeleton" role="status">Restoring your atelier…<span /><span /></div> : !hasMessages ? <div className="auria-welcome">
            <span className="atelier-welcome__ornament" aria-hidden="true">✧</span>
            <h2>What do you have in mind?</h2>
            <p>Explore a design, compare pieces or prepare a quotation.</p>
            <div className="auria-suggestions">{suggestions.map(({ label, prompt }) => <button type="button" key={label} onClick={() => { setInput(prompt); inputRef.current?.focus({ preventScroll: true }); }}>{label}<span aria-hidden="true">↗</span></button>)}</div>
          </div> : <div className="atelier-messages">
            {conversation?.messages.map((message) => <Message key={message.id} message={message} busy={busy} selectDesign={chooseDesign} />)}
            {streaming && <Message message={streaming} busy={busy} selectDesign={chooseDesign} />}
          </div>}
        </div>
        <div className="auria-chat-composer">
          {newReply && <button type="button" className="auria-new-reply atelier-outline" onClick={jumpToReply}>New reply <span aria-hidden="true">↓</span></button>}
          {error && <div className="auria-error auria-composer-error" role="alert">
            <p>{error}</p>
            {retryText && retryAllowed && <button type="button" disabled={blocked} onClick={() => void sendFromComposer(retryText, true)}>Retry response</button>}
            {!csrf && <button type="button" onClick={() => window.location.reload()}>Reload workspace</button>}
          </div>}
          {!error && !active && conversation?.messages.at(-1)?.assistance && <div className="auria-availability atelier-assistance">Advanced AI is temporarily unavailable. I can still help you explore designs and prepare an enquiry. {retryText && retryAllowed && <button type="button" className="atelier-text-action" disabled={blocked} onClick={() => void sendFromComposer(retryText, true)}>Retry advanced assistance</button>}</div>}
          {nextAction && <button type="button" className="atelier-text-action atelier-next-action" onClick={() => showNextAction(nextAction)}>{nextAction === "contact" ? "Contact & visits" : "Review quotation"}</button>}
          <p className="auria-live-status" role="status">{active ? "Writing a response…" : busy ? "Saving or loading your changes…" : voiceState === "checking" ? "Checking local speech support…" : voiceState === "listening" ? voiceActivity === "microphone" ? "Voice detected…" : "Listening on this device…" : voiceState === "finalizing" ? "Finishing dictation…" : voiceState === "speaking" ? "Reading aloud…" : voiceNotice || notice}</p>
          <form onSubmit={(e) => { e.preventDefault(); void sendFromComposer(); }}>
            <label htmlFor="auria-message" className="sr-only">Message AURIA</label>
            <textarea id="auria-message" name="message" ref={inputRef} dir="auto" value={input} maxLength={4000} rows={1} placeholder="Ask about jewellery…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void sendFromComposer(); } }} disabled={blocked} />
            {active ? <button type="button" className="atelier-send" onClick={stop}>Stop response</button> : <button type="submit" className="atelier-send" disabled={blocked || !input.trim() || !csrf}>Send <span aria-hidden="true">↑</span></button>}
          </form>
          <div className="atelier-composer-tools" aria-label="Reference and voice tools">
            <ReferencePanel disabled={blocked || !csrf} visionToken={capability?.available && capability.provider === "gemini" ? csrf : undefined} onSelect={chooseDesign} />
            <button type="button" className="atelier-text-action atelier-voice-toggle" aria-pressed={voiceMode} disabled={blocked && !voiceMode} onClick={toggleVoiceMode}>Voice mode</button>
            {(voiceState === "idle" || voiceState === "speaking") && <button type="button" className="atelier-text-action" disabled={blocked} onClick={startDictation}>{retryDictation ? "Retry dictation" : "Dictate"}</button>}
            {voiceState === "listening" && <button type="button" className="atelier-text-action" onClick={finishDictation}>Finish dictation</button>}
            {(voiceState === "listening" || voiceState === "finalizing") && <button type="button" className="atelier-text-action" onClick={cancelDictation}>Cancel dictation</button>}
            {(voiceState === "checking" || voiceState === "speaking") && <button type="button" className="atelier-text-action" onClick={stopVoice}>Stop voice</button>}
            {installLanguage && voiceState === "idle" && <button type="button" className="atelier-text-action" disabled={blocked} onClick={() => void installVoicePack()}>Install {installLanguage === "ur-PK" ? "Urdu" : "English"} dictation pack</button>}
            {voiceReload && <a className="atelier-text-action" href="/ai-atelier" target="_blank" rel="noopener">Open atelier in a new tab</a>}
            {lastReply && voiceState === "idle" && <button type="button" className="atelier-text-action" disabled={busy} onClick={() => readAloud(lastReply.text, spokenLanguage(lastReply.text))}>Read reply aloud</button>}
          </div>
          {voiceMode && <p className="atelier-voice-hint">Voice replies on · Dictate, review, then send. Speech runs on this device.</p>}
          <p className="auria-disclosure">Private demo. Use fictional details. {capability?.available && capability.provider === "gemini" ? "Google may use free-tier chat content to improve its products." : "Catalogue support is available in this workspace."}</p>
        </div>
      </section>
      <aside className="auria-selection" aria-label="Selected design and quotation">
        <div className="atelier-stage__heading"><span>Design stage</span><span aria-hidden="true">◇</span></div>
        <JewelleryStage key={`${conversationId ?? "new"}:${selected?.id ?? "discovery"}`} discovery={discovery} selected={selected} recommendations={recommendations} pinnedId={shownPin} disabled={busy || !csrf} onSelect={chooseDesign} />
        {selected && <Link className="atelier-vault atelier-stage__vault" href={`/designs?q=${selected.designCode}`}>View in the Design Vault <span aria-hidden="true">↗</span></Link>}
        {conversation && <QuotePanel key={`${conversation.id}-${conversation.draft?.version ?? 0}-${selected?.id ?? "none"}`} draft={conversation.draft} design={selected} budgetPreference={budgetPreference ? budgetFrom(budgetPreference.text) : null} referenceNote={conversation.selectedDesignId === selected?.id ? conversation.referenceNote ?? undefined : undefined} disabled={busy} save={saveDraft} submit={submitDraft} reload={reloadDraft} />}
        {!!csrf && <>
          <CallbackPanel key={`callback-${conversation?.id ?? "new"}-${conversation?.callback?.version ?? 0}`} draft={conversation?.callback} disabled={blocked} save={saveCallback} confirm={submitCallback} />
          <EnquiryLookup key={`lookup-${conversation?.id ?? "new"}`} />
        </>}
      </aside>
    </div>
  </main>;
}

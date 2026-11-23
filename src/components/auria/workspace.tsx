"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { budgetFrom } from "@/lib/auria/demo-intent";

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
    <div className="auria-message-meta"><span>{message.role === "user" ? "You" : message.source === "CATALOGUE_DEMO" ? "Catalogue demo" : "AURIA"}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>
    {message.text && <SafeMessage text={message.text} />}
    {message.state === "FAILED" && <p className="auria-failed-message">{(message.failure ?? savedProviderFailure(message.errorCode)).message}</p>}
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
  const { csrf, capability, history, conversation, selected, view, setView, input, setInput, language, setLanguage, mode, changeMode, error, busy, loading, streaming, notice, retryText, retryAllowed, newReply, updateFollow, jumpToReply, usageCount, scrollRef, inputRef, newConversation, openConversation, selectDesign, send, stop, saveDraft, submitDraft, reloadDraft, saveCallback, submitCallback } = useWorkspace();
  const { state: voiceState, voiceNotice, voiceReload, dictate, stopVoice, readAloud } = useLocalVoice();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dictationLanguage, setDictationLanguage] = useState<DictationLanguage | "auto">("auto");
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
  const [referenceNote, setReferenceNote] = useState<{ id: string; text: string } | null>(null);
  const active = !!(streaming || conversation?.activeTurn);
  const blocked = busy || loading || active;
  const state: CoreState = voiceState === "listening" || voiceState === "speaking" ? voiceState : error ? "attention" : streaming?.text ? "responding" : active || voiceState === "checking" ? "processing" : "idle";
  const hasMessages = !!conversation?.messages.length || !!streaming;
  const budgetPreference = conversation?.messages.findLast((message) => message.role === "user" && budgetFrom(message.text));
  const lastReply = conversation?.messages.findLast((message) => message.role === "assistant" && message.state === "COMPLETE" && message.text);
  function beginConversation() {
    stopVoice();
    setReferenceNote(null);
    if (historyOpen) closeHistory();
    void newConversation();
  }
  function sendFromComposer() { stopVoice(); void send(); }
  return <main id="main-content" ref={scene} className={["auria-workspace", fontClass].filter(Boolean).join(" ")} data-view={view}>
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
        <select id="atelier-dictation-language" value={dictationLanguage} onChange={(event) => setDictationLanguage(event.target.value as DictationLanguage | "auto")}>
          <option value="auto">Follow conversation</option><option value="en-PK">English (Pakistan)</option>
          <option value="en-US">English (US)</option><option value="ur-PK">Urdu (Pakistan)</option>
        </select>
        <div className="auria-history-list">{history.length ? history.map((item) => <button type="button" key={item.id} disabled={blocked} aria-current={conversation?.id === item.id ? "true" : undefined} onClick={() => { stopVoice(); setReferenceNote(null); if (historyOpen) closeHistory(); void openConversation(item.id); }}><span>{item.title}</span><small>{new Date(item.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></button>) : <p className="auria-muted">Your saved conversations will appear here.</p>}</div>
        <p className="auria-history-note">Saved to this browser session for 7 days.<br /><span>{usageCount} provider requests recorded</span></p>
      </aside>
      <section className="auria-chat" aria-label="AURIA conversation">
        <div className="auria-chat-heading">
          <div className="auria-chat-heading-copy"><AtelierCore state={state} compact /><div><h2>Conversation</h2><p>{mode === "catalogue" ? "Local catalogue demo" : capability?.available ? "Gemini free-tier text" : loading ? "Opening your workspace…" : "Live text unavailable"}</p></div></div>
          <button type="button" className="auria-connection" disabled={blocked || !csrf} data-ready={mode === "catalogue" || !!capability?.available} onClick={() => changeMode(mode === "catalogue" ? "live" : "catalogue")}><i aria-hidden="true" />{mode === "catalogue" ? "Use live chat" : "Use catalogue demo"}</button>
        </div>
        <div className="auria-transcript" ref={scrollRef} onScroll={updateFollow} aria-label="Messages" tabIndex={0}>
          {mode === "live" && !capability?.available && !loading && !error && <p className="auria-availability">{capability?.reason} You can switch to the catalogue demo or browse designs.</p>}
          {loading ? <div className="auria-skeleton" role="status">Restoring your atelier…<span /><span /></div> : !hasMessages ? <div className="auria-welcome">
            <span className="atelier-welcome__ornament" aria-hidden="true">✧</span>
            <h2>What do you have in mind?</h2>
            <p>Explore a design, compare pieces or prepare a quotation.</p>
            <div className="auria-suggestions">{suggestions.map(({ label, prompt }) => <button type="button" key={label} onClick={() => { setInput(prompt); inputRef.current?.focus({ preventScroll: true }); }}>{label}<span aria-hidden="true">↗</span></button>)}</div>
          </div> : <div className="atelier-messages">
            {conversation?.messages.map((message) => <Message key={message.id} message={message} busy={busy} selectDesign={selectDesign} />)}
            {streaming && <Message message={streaming} busy={busy} selectDesign={selectDesign} />}
          </div>}
        </div>
        <div className="auria-chat-composer">
          {newReply && <button type="button" className="auria-new-reply atelier-outline" onClick={jumpToReply}>New reply <span aria-hidden="true">↓</span></button>}
          {error && <div className="auria-error auria-composer-error" role="alert">
            <p>{error}</p>
            {retryText && retryAllowed && (mode === "catalogue" || capability?.available) && <button type="button" disabled={blocked} onClick={() => void send(retryText)}>Retry response</button>}
            {mode === "live" && csrf && <button type="button" disabled={blocked} onClick={() => void changeMode("catalogue")}>Switch to catalogue demo</button>}
            {!csrf && <button type="button" onClick={() => window.location.reload()}>Reload workspace</button>}
          </div>}
          <p className="auria-live-status" role="status">{active ? "Writing a response…" : busy ? "Saving or loading your changes…" : voiceState === "checking" ? "Checking local speech support…" : voiceState === "listening" ? "Listening on this device…" : voiceState === "speaking" ? "Reading aloud…" : voiceNotice || notice}</p>
          <form onSubmit={(e) => { e.preventDefault(); sendFromComposer(); }}>
            <label htmlFor="auria-message" className="sr-only">Message AURIA</label>
            <textarea id="auria-message" name="message" ref={inputRef} dir="auto" value={input} maxLength={4000} rows={1} placeholder="Ask about jewellery…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendFromComposer(); } }} disabled={blocked} />
            {active ? <button type="button" className="atelier-send" onClick={stop}>Stop response</button> : <button type="submit" className="atelier-send" disabled={blocked || !input.trim() || (mode === "live" && !capability?.available) || !csrf}>Send <span aria-hidden="true">↑</span></button>}
          </form>
          <div className="atelier-composer-tools" aria-label="Reference and voice tools">
            <ReferencePanel disabled={busy || !csrf} onSelect={(card, note) => { setReferenceNote({ id: card.id, text: note }); void selectDesign(card); }} />
            {voiceState !== "idle" ? <button type="button" className="atelier-text-action" onClick={stopVoice}>Stop voice</button>
              : <button type="button" className="atelier-text-action" disabled={busy} onClick={() => { void dictate(dictationLanguage === "auto" ? language === "ur" ? "ur-PK" : "en-US" : dictationLanguage, (text) => setInput((previous) => `${previous} ${text}`.trim().slice(0, 4000))); }}>Dictate</button>}
            {voiceReload && <a className="atelier-text-action" href="/ai-atelier" target="_blank" rel="noopener">Open atelier in a new tab</a>}
            {lastReply && voiceState === "idle" && <button type="button" className="atelier-text-action" disabled={busy} onClick={() => readAloud(lastReply.text)}>Read reply aloud</button>}
          </div>
          <p className="auria-disclosure">{mode === "catalogue" ? "Private demo. Use fictional details. This mode sends no messages to an AI provider." : "Private demo. Use fictional details. Google may use free-tier chat content to improve its products."}</p>
        </div>
      </section>
      <aside className="auria-selection" aria-label="Selected design and quotation">
        <div className="atelier-stage__heading"><span>Design stage</span><span aria-hidden="true">◇</span></div>
        <JewelleryStage key={selected?.id ?? "discovery"} discovery={discovery} selected={selected} disabled={busy || !csrf} onSelect={selectDesign} />
        {selected && <Link className="atelier-vault atelier-stage__vault" href={`/designs?q=${selected.designCode}`}>View in the Design Vault <span aria-hidden="true">↗</span></Link>}
        {conversation && <QuotePanel key={`${conversation.id}-${conversation.draft?.version ?? 0}-${selected?.id ?? "none"}`} draft={conversation.draft} design={selected} budgetPreference={budgetPreference ? budgetFrom(budgetPreference.text) : null} referenceNote={referenceNote?.id === selected?.id ? referenceNote?.text : undefined} disabled={busy} save={saveDraft} submit={submitDraft} reload={reloadDraft} />}
        {!!csrf && <>
          <CallbackPanel key={`callback-${conversation?.id ?? "new"}-${conversation?.callback?.version ?? 0}`} draft={conversation?.callback} disabled={blocked} save={saveCallback} confirm={submitCallback} />
          <EnquiryLookup key={`lookup-${conversation?.id ?? "new"}`} />
        </>}
      </aside>
    </div>
  </main>;
}

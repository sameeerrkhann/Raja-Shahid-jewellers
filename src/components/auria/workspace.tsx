"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChatMessage, Language } from "@/types/auria";
import type { DesignCardData } from "@/types/catalogue";
import { statusLabels } from "@/config/catalogue";
import { SafeMessage } from "./safe-message";
import { QuotePanel } from "./quote-panel";
import { EnquiryLookup } from "./enquiry-status";
import { AtelierCore, type CoreState } from "./atelier-core";
import { JewelleryPicture, JewelleryStage } from "./jewellery-stage";
import { useWorkspace, type View } from "./use-workspace";
import { ReferencePanel } from "./reference-panel";
import { useLocalVoice } from "./use-local-voice";

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
    {message.text ? <SafeMessage text={message.text} /> : <p className="auria-muted">{message.state === "STREAMING" ? "Preparing your response…" : "No response completed."}</p>}
    {message.cards.length > 0 && <div className="auria-recommendations">
      {message.cards.map((card) => <button type="button" className="auria-design" key={card.id} disabled={busy} onClick={() => selectDesign(card)}>
        <JewelleryPicture media={card.thumbnail} title={card.title} />
        <span><small translate="no">{card.designCode}</small><strong>{card.title}</strong><small>Sample · {statusLabels[card.displayStatus]}</small></span>
      </button>)}
    </div>}
    {message.state !== "COMPLETE" && <p className="auria-message-state">{message.state === "STREAMING" ? "Generating…" : `${message.state === "STOPPED" ? "Stopped" : "Incomplete"} · Partial response`}</p>}
  </article>;
}

export function AuriaWorkspace({ discovery }: { discovery: DesignCardData[] }) {
  const { csrf, capability, history, conversation, selected, view, setView, input, setInput, language, setLanguage, mode, changeMode, error, busy, loading, streaming, notice, retryText, usageCount, scrollRef, inputRef, newConversation, openConversation, selectDesign, send, stop, saveDraft, submitDraft, reloadDraft } = useWorkspace();
  const { state: voiceState, voiceNotice, voiceReload, dictate, stopVoice, readAloud } = useLocalVoice();
  const [referenceNote, setReferenceNote] = useState<{ id: string; text: string } | null>(null);
  const active = !!(streaming || conversation?.activeTurn);
  const state: CoreState = voiceState === "listening" || voiceState === "speaking" ? voiceState : error ? "attention" : streaming?.text ? "responding" : active || loading || voiceState === "checking" ? "processing" : "idle";
  const hasMessages = !!conversation?.messages.length || !!streaming;
  const lastReply = conversation?.messages.findLast((message) => message.role === "assistant" && message.state === "COMPLETE" && message.text);
  function sendFromComposer() { stopVoice(); void send(); }
  return <main id="main-content" className="auria-workspace" data-view={view}>
    <div className="auria-masthead">
      <div className="atelier-identity"><AtelierCore state={state} compact /><div><h1 translate="no">AURIA <span>Jewellery Atelier</span></h1><p>Your personal jewellery concierge</p></div></div>
      <Link href="/designs" className="atelier-vault">Explore the Design Vault <span aria-hidden="true">↗</span></Link>
    </div>
    <nav className="auria-mobile-nav" aria-label="Workspace views">
      {views.map((item) => <button type="button" key={item.id} aria-pressed={view === item.id} onClick={() => setView(item.id)}>{item.label}</button>)}
    </nav>
    <div className="auria-layout">
      <aside className="auria-history" aria-label="Conversation history">
        <AtelierCore state={state} />
        <div className="atelier-history__heading"><h2>Conversations</h2><button type="button" className="auria-new atelier-outline" disabled={busy || !csrf} onClick={() => { stopVoice(); setReferenceNote(null); void newConversation(); }}>＋ New conversation</button></div>
        <label className="auria-label" htmlFor="auria-language">Language for new conversations</label>
        <select id="auria-language" name="language" value={language} onChange={(e) => setLanguage(e.target.value as Language)} disabled={busy}>
          <option value="auto">Follow my language</option><option value="en">English</option><option value="ur">اردو</option><option value="roman-ur">Roman Urdu</option>
        </select>
        <div className="auria-history-list">{history.length ? history.map((item) => <button type="button" key={item.id} disabled={busy} aria-current={conversation?.id === item.id ? "true" : undefined} onClick={() => { stopVoice(); setReferenceNote(null); void openConversation(item.id); }}><span>{item.title}</span><small>{new Date(item.updatedAt).toLocaleDateString()}</small></button>) : <p className="auria-muted">Your saved conversations will appear here.</p>}</div>
        <p className="auria-history-note">Saved to this browser session for 7 days.<br /><span>{usageCount} provider requests recorded</span></p>
      </aside>
      <section className="auria-chat" aria-label="AURIA conversation">
        <div className="auria-chat-heading">
          <div><h2>Conversation</h2><p>{mode === "catalogue" ? "Local catalogue demo" : capability?.available ? "Gemini free-tier text" : loading ? "Opening your workspace…" : "Live text unavailable"}</p></div>
          <button type="button" className="auria-connection" disabled={busy || !csrf} data-ready={mode === "catalogue" || !!capability?.available} onClick={() => changeMode(mode === "catalogue" ? "live" : "catalogue")}><i aria-hidden="true" />{mode === "catalogue" ? "Use live chat" : "Use catalogue demo"}</button>
        </div>
        <div className="auria-transcript" ref={scrollRef} aria-label="Messages" tabIndex={0}>
          {error && <div className="auria-error" role="alert"><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Reload workspace</button>{retryText && (mode === "catalogue" || capability?.available) && <button type="button" disabled={busy} onClick={() => send(retryText)}>Retry response</button>}</div>}
          {mode === "live" && !capability?.available && !loading && !error && <p className="auria-availability">{capability?.reason} You can switch to the catalogue demo or browse designs.</p>}
          {loading ? <div className="auria-skeleton" role="status">Restoring your atelier…<span /><span /></div> : !hasMessages ? <div className="auria-welcome">
            <span className="atelier-welcome__ornament" aria-hidden="true">✧</span>
            <h2>What do you have in mind?</h2>
            <p>Explore a design, compare pieces or prepare a quotation.</p>
            <div className="auria-suggestions">{suggestions.map(({ label, prompt }) => <button type="button" key={label} onClick={() => { setInput(prompt); inputRef.current?.focus(); }}>{label}<span aria-hidden="true">↗</span></button>)}</div>
          </div> : <div className="atelier-messages">
            {conversation?.messages.map((message) => <Message key={message.id} message={message} busy={busy} selectDesign={selectDesign} />)}
            {streaming && <Message message={streaming} busy={busy} selectDesign={selectDesign} />}
          </div>}
        </div>
        <div className="auria-chat-composer">
          <p className="auria-live-status" role="status">{busy ? "Working on your request…" : voiceState === "checking" ? "Checking local speech support…" : voiceState === "listening" ? "Listening on this device…" : voiceState === "speaking" ? "Reading aloud…" : voiceNotice || notice}</p>
          <form onSubmit={(e) => { e.preventDefault(); sendFromComposer(); }}>
            <label htmlFor="auria-message" className="sr-only">Message AURIA</label>
            <textarea id="auria-message" name="message" ref={inputRef} dir="auto" value={input} maxLength={4000} rows={2} placeholder="Ask about a design, style or occasion…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendFromComposer(); } }} disabled={busy} />
            {active ? <button type="button" className="atelier-send" onClick={stop}>Stop response</button> : <button type="submit" className="atelier-send" disabled={busy || !input.trim() || (mode === "live" && !capability?.available) || !csrf}>Send <span aria-hidden="true">↑</span></button>}
          </form>
          <div className="atelier-composer-tools" aria-label="Reference and voice tools">
            <ReferencePanel disabled={busy || !csrf} onSelect={(card, note) => { setReferenceNote({ id: card.id, text: note }); void selectDesign(card); }} />
            {voiceState !== "idle" ? <button type="button" className="atelier-text-action" onClick={stopVoice}>Stop voice</button>
              : <button type="button" className="atelier-text-action" disabled={busy} onClick={() => { void dictate(language === "ur" ? "ur-PK" : "en-US", (text) => setInput((previous) => `${previous} ${text}`.trim().slice(0, 4000))); }}>Dictate</button>}
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
        {conversation && <QuotePanel key={`${conversation.id}-${conversation.draft?.version ?? 0}-${selected?.id ?? "none"}`} draft={conversation.draft} design={selected} referenceNote={referenceNote?.id === selected?.id ? referenceNote?.text : undefined} disabled={busy} save={saveDraft} submit={submitDraft} reload={reloadDraft} />}
        {!!csrf && <EnquiryLookup />}
      </aside>
    </div>
  </main>;
}

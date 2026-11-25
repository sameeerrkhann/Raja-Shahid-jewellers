"use client";

import { useState } from "react";
import type { CallbackDraft } from "@/types/auria";

export function CopyReference({ reference }: { reference: string }) {
  const [notice, setNotice] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(reference); setNotice("Reference copied."); }
    catch { setNotice("Copy the reference from the text above."); }
  }
  return <div className="atelier-reference-copy">
    <button className="atelier-text-action" type="button" onClick={() => void copy()}>Copy reference</button>
    <span role="status">{notice}</span>
  </div>;
}

export function CallbackPanel({ draft, disabled, save, confirm }: {
  draft?: CallbackDraft;
  disabled: boolean;
  save: (input: unknown) => Promise<void>;
  confirm: (version: number, key: string) => Promise<void>;
}) {
  const initial = { topic: draft?.topic ?? "CALLBACK", name: draft?.customer.name ?? "Demo Customer", email: draft?.customer.email ?? "demo@example.invalid", note: draft?.note ?? "" };
  const [form, setForm] = useState(initial);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const dirty = Object.keys(form).some((field) => form[field as keyof typeof form] !== initial[field as keyof typeof initial]);
  function change(field: keyof typeof initial, value: string) { setApproved(false); setForm((current) => ({ ...current, [field]: value })); }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "The request could not be saved."); }
    finally { setBusy(false); }
  }
  return <details id="auria-contact" className="auria-contact" open={draft ? true : undefined}>
    <summary>Contact & visits</summary>
    <p>Record a fictional callback or showroom visit request. The demo sends no message or booking.</p>
    {draft?.status === "SUBMITTED" && draft.reference ? <>
      <p>Demo contact request saved</p>
      <p className="auria-contact-reference">{draft.reference}</p>
      <CopyReference reference={draft.reference} />
    </> : <>
      <form onSubmit={(event) => {
        event.preventDefault();
        void run(() => save({ topic: form.topic, expectedVersion: draft?.version ?? 0, customer: { name: form.name, email: form.email }, note: form.note }));
      }}>
        <label htmlFor="auria-contact-topic">Request type</label>
        <select id="auria-contact-topic" name="topic" value={form.topic} onChange={(event) => change("topic", event.target.value)}>
          <option value="CALLBACK">Callback</option><option value="APPOINTMENT">Showroom visit</option>
        </select>
        <label htmlFor="auria-contact-name">Fictional name</label>
        <input id="auria-contact-name" name="name" value={form.name} onChange={(event) => change("name", event.target.value)} maxLength={80} required autoComplete="off" />
        <label htmlFor="auria-contact-email">Fictional email (.invalid only)</label>
        <input id="auria-contact-email" name="email" type="email" value={form.email} onChange={(event) => change("email", event.target.value)} maxLength={120} required spellCheck={false} autoComplete="off" />
        <label htmlFor="auria-contact-note">Fictional request details</label>
        <textarea id="auria-contact-note" name="note" value={form.note} onChange={(event) => change("note", event.target.value)} maxLength={800} rows={2} />
        <button className="button button--outline" disabled={disabled || busy}>Save contact draft</button>
      </form>
      {draft && <div className="auria-contact-review">
        <p>{dirty ? "Save your edits before confirming." : "Draft saved. Review your fictional details and confirm if they are correct."}</p>
        <label className="auria-consent"><input type="checkbox" disabled={disabled || dirty || busy} checked={approved} onChange={(event) => setApproved(event.target.checked)} />I approve saving this fictional contact request.</label>
        <button className="button button--gold" type="button" disabled={disabled || dirty || busy || !approved} onClick={() => void run(() => confirm(draft.version, key))}>Confirm contact request</button>
      </div>}
    </>}
    {error && <p role="alert">{error}</p>}
  </details>;
}

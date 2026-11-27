"use client";
import { useEffect, useState } from "react";
import type { EnquiryEvent, EnquiryStatus } from "@/types/auria";
import { enquiryStages, unconfirmed } from "@/lib/auria/quotation";
import { CopyReference } from "./callback-panel";
export type EnquiryRecord = { reference: string; status: EnquiryStatus; timeline: EnquiryEvent[]; designCode: string; title: string; recordType: "QUOTATION_ENQUIRY" | "SIMULATED_MANUFACTURING_ORDER" | "CALLBACK_ENQUIRY"; quotedAmountPKR: number | null };
export function EnquiryTimeline({ status, timeline }: { status: EnquiryStatus; timeline: EnquiryEvent[] }) {
  return <ol className="auria-timeline" aria-label="Enquiry timeline">{enquiryStages.map((stage) => {
    const event = timeline.find((e) => e.status === stage.status);
    return <li key={stage.status} data-reached={!!event} aria-current={status === stage.status ? "step" : undefined}><strong>{stage.label}</strong><span>{event ? <><time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time>{event.source === "SERVER_DEMO" && " · Simulated workshop event"}</> : stage.status === "CANCELLED" ? "Alternative outcome" : "Not reached"}</span></li>;
  })}</ol>;
}
export function EnquiryStatusCard({ record }: { record: EnquiryRecord }) {
  if (record.recordType === "CALLBACK_ENQUIRY") return <div className="auria-status-card">
    <p className="eyebrow">{record.title}</p><h4>{record.reference}</h4><CopyReference reference={record.reference} />
    <p>Recorded status: <strong>Submitted</strong></p>
    <p>Fictional request saved in this demo. No message or booking was sent.</p>
  </div>;
  return <div className="auria-status-card"><p className="eyebrow">{record.recordType === "QUOTATION_ENQUIRY" ? "Quotation enquiry" : "Simulated manufacturing order"}</p><h4>{record.reference}</h4><CopyReference reference={record.reference} /><p>{record.designCode} · {record.title}</p><p>Recorded status: <strong>{enquiryStages.find((s) => s.status === record.status)?.label}</strong></p><p>Quoted price: {record.quotedAmountPKR === null ? unconfirmed : `PKR ${record.quotedAmountPKR.toLocaleString()} (demo record)`}</p><p>Weight, making charges & manufacturing deadline: {unconfirmed}</p><EnquiryTimeline status={record.status} timeline={record.timeline} /><p>Fictional demo record. An enquiry is not a confirmed manufacturing order. No notification or payment.</p></div>;
}
export function EnquiryLookup({ requested }: { requested?: { reference: string } }) {
  const [query, setQuery] = useState<{ reference: string; requested?: { reference: string } }>();
  const [input, setInput] = useState<{ text: string; requested?: { reference: string } }>();
  const [result, setResult] = useState<{ query: { reference: string }; record?: EnquiryRecord; error?: string }>();
  const current = query?.requested === requested ? query : requested;
  const reference = input && input.requested === requested ? input.text : requested?.reference ?? "";
  const response = current && result?.query === current ? result : undefined;
  const busy = !!current && !response;
  const error = response?.error;
  const record = response?.record;
  useEffect(() => {
    if (!current) return;
    const controller = new AbortController();
    async function lookup(query: { reference: string }) {
      try {
        const answer = await fetch("/api/ai/enquiries/" + encodeURIComponent(query.reference), { cache: "no-store", signal: controller.signal });
        const payload = await answer.json();
        if (!answer.ok) throw new Error(payload.error?.message || "Enquiry unavailable.");
        if (!controller.signal.aborted) setResult({ query, record: payload.data });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ query, error: (error as Error).message });
      }
    }
    void lookup(current);
    return () => controller.abort();
  }, [current]);
  return <section id="auria-status" tabIndex={-1} className="auria-lookup" aria-label="Find your enquiry"><h3>Your enquiry, at a glance.</h3><p>Look up a saved reference from any conversation in this private browser session.</p>
    <form onSubmit={(event) => { event.preventDefault(); setQuery({ reference: reference.trim().toUpperCase(), requested }); }}>
      <label htmlFor="enquiry-reference">Enquiry reference</label><input id="enquiry-reference" value={reference} onChange={(event) => setInput({ text: event.target.value, requested })} maxLength={39} required placeholder="DEMO-Q-… or DEMO-C-…" spellCheck={false} />
      <button className="button button--outline" disabled={busy || !reference.trim()}>Check recorded status</button>
    </form>
    {busy && <p role="status">Checking recorded status…</p>}
    {error && <p role="alert">{error} Use the browser where the enquiry was saved.</p>}
    {record && <EnquiryStatusCard record={record} />}
  </section>;
}

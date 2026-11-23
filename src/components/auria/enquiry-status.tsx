"use client";
import { useState, type FormEvent } from "react";
import type { EnquiryEvent, EnquiryStatus } from "@/types/auria";
import { enquiryStages, unconfirmed } from "@/lib/auria/quotation";
export type EnquiryRecord = { reference: string; status: EnquiryStatus; timeline: EnquiryEvent[]; designCode: string; title: string; recordType: "QUOTATION_ENQUIRY" | "SIMULATED_MANUFACTURING_ORDER"; quotedAmountPKR: number | null };
export function EnquiryTimeline({ status, timeline }: { status: EnquiryStatus; timeline: EnquiryEvent[] }) {
  return <ol className="auria-timeline" aria-label="Enquiry timeline">{enquiryStages.map((stage) => {
    const event = timeline.find((e) => e.status === stage.status);
    return <li key={stage.status} data-reached={!!event} aria-current={status === stage.status ? "step" : undefined}><strong>{stage.label}</strong><span>{event ? <><time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time>{event.source === "SERVER_DEMO" && " · Simulated workshop event"}</> : stage.status === "CANCELLED" ? "Alternative outcome" : "Not reached"}</span></li>;
  })}</ol>;
}
export function EnquiryStatusCard({ record }: { record: EnquiryRecord }) {
  return <div className="auria-status-card"><p className="eyebrow">{record.recordType === "QUOTATION_ENQUIRY" ? "Quotation enquiry" : "Simulated manufacturing order"}</p><h4>{record.reference}</h4><p>{record.designCode} · {record.title}</p><p>Recorded status: <strong>{enquiryStages.find((s) => s.status === record.status)?.label}</strong></p><p>Quoted price: {record.quotedAmountPKR === null ? unconfirmed : `PKR ${record.quotedAmountPKR.toLocaleString()} (demo record)`}</p><p>Weight, making charges & manufacturing deadline: {unconfirmed}</p><EnquiryTimeline status={record.status} timeline={record.timeline} /><p>Fictional demo record. An enquiry is not a confirmed manufacturing order. No notification or payment.</p></div>;
}
export function EnquiryLookup() {
  const [reference, setReference] = useState(""); const [record, setRecord] = useState<EnquiryRecord | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function lookup(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setRecord(null);
    try { const r = await fetch("/api/ai/enquiries/" + encodeURIComponent(reference.trim().toUpperCase()), { cache: "no-store" }); const p = await r.json(); if (!r.ok) throw new Error(p.error?.message || "Enquiry unavailable."); setRecord(p.data); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="auria-lookup" aria-label="Find your enquiry"><h3>Your enquiry, at a glance.</h3><p>Look up a saved reference from any conversation in this private browser session.</p><form onSubmit={lookup}><label htmlFor="enquiry-reference">Enquiry reference</label><input id="enquiry-reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={39} required placeholder="DEMO-Q-…" /><button className="button button--outline" disabled={busy || !reference.trim()}>Check recorded status</button></form>{error && <p role="alert">{error} Use the browser where the enquiry was saved.</p>}{record && <EnquiryStatusCard record={record} />}</section>;
}

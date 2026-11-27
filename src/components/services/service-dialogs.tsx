"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { contactPreferences, enquiryTopics, shopDetails, visitGroups, visitPurposes, visitTimes } from "@/config/services";

type Service = "visit" | "enquiry";
type Errors = Record<string, string>;
const MOBILE = /^(\+92|0092|0)3\d{9}$/;
const DESIGN = /^RSJ-D\d{3}$/i;
const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();

/* Opens from any button with data-service="visit|enquiry" (and the homepage's older data-home-action
   "appointment"/"enquiry"), so the header, homepage, footer and later pages share one pair of forms. */
export function ServiceDialogs() {
  const [open, setOpen] = useState<Service | null>(null);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-service], button[data-home-action='appointment'], button[data-home-action='enquiry']");
      if (!target) return;
      const kind = target.dataset.service ?? (target.dataset.homeAction === "appointment" ? "visit" : "enquiry");
      if (kind !== "visit" && kind !== "enquiry") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(kind);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return <Modal open={open !== null} onClose={() => setOpen(null)} title={open === "visit" ? "Plan a private visit" : "Jewellery enquiry"} className="service-modal">
    {open === "visit" && <VisitForm onDone={() => setOpen(null)} />}
    {open === "enquiry" && <EnquiryForm onDone={() => setOpen(null)} />}
  </Modal>;
}

function Field({ label, error, children, wide }: { label: string; error?: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`service-field${wide ? " service-field--wide" : ""}`} data-invalid={error ? "" : undefined}>
    <span>{label}</span>{children}{error && <em className="service-field__error">{error}</em>}
  </label>;
}

function ShopFacts() {
  return <dl className="service-facts">
    <div><dt>Showroom</dt><dd>{shopDetails.address ?? "Address shared once the shop confirms it"}</dd></div>
    <div><dt>Hours</dt><dd>{shopDetails.hours ?? "To be confirmed by the shop"}</dd></div>
  </dl>;
}

function Sent({ kind, onDone }: { kind: Service; onDone: () => void }) {
  return <div className="service-sent" role="status">
    <p className="service-sent__title">Your {kind === "visit" ? "visit request" : "enquiry"} is ready.</p>
    <p>Not connected yet: this {kind === "visit" ? "request" : "enquiry"} was not sent. Once the shop approves its contact details, the same form will reach them directly.</p>
    <button type="button" className="button button--gold" onClick={onDone}>Close</button>
  </div>;
}

function contactErrors(data: FormData, errors: Errors) {
  if (clean(data.get("name")).length < 2) errors.name = "Enter your name.";
  if (!MOBILE.test(clean(data.get("mobile")).replace(/[\s-]/g, ""))) errors.mobile = "Enter a Pakistani mobile number, for example 0300 1234567.";
  if (!data.get("consent")) errors.consent = "Please agree so the shop can contact you.";
}

export function validateVisit(data: FormData, today = new Date()) {
  const errors: Errors = {};
  const date = clean(data.get("date"));
  const day = date ? new Date(`${date}T12:00:00`) : null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!day || Number.isNaN(day.getTime())) errors.date = "Choose a date.";
  else if (day < start) errors.date = "Choose today or a later date.";
  if (!clean(data.get("time"))) errors.time = "Choose a time.";
  if (!clean(data.get("purpose"))) errors.purpose = "Tell us what the visit is for.";
  contactErrors(data, errors);
  return errors;
}

export function validateEnquiry(data: FormData) {
  const errors: Errors = {};
  if (!clean(data.get("topic"))) errors.topic = "Choose what the enquiry is about.";
  const design = clean(data.get("design"));
  if (design && !DESIGN.test(design)) errors.design = "Design IDs look like RSJ-D001.";
  if (clean(data.get("message")).length < 10) errors.message = "Write a few words about what you need.";
  contactErrors(data, errors);
  return errors;
}

function useForm(validate: (data: FormData) => Errors) {
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validate(new FormData(event.currentTarget));
    setErrors(next);
    if (Object.keys(next).length) { event.currentTarget.querySelector<HTMLElement>("[data-invalid] :is(input, select, textarea)")?.focus(); return; }
    setSent(true);
  };
  return { errors, sent, submit };
}

function Contact({ errors }: { errors: Errors }) {
  return <>
    <Field label="Your name" error={errors.name}><input name="name" autoComplete="name" /></Field>
    <Field label="Mobile number" error={errors.mobile}><input name="mobile" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" /></Field>
    <Field label="Contact me by"><select name="contact" defaultValue={contactPreferences[0]}>{contactPreferences.map((item) => <option key={item}>{item}</option>)}</select></Field>
    <label className="service-consent service-field--wide" data-invalid={errors.consent ? "" : undefined}><input type="checkbox" name="consent" /><span>I agree that Raja Shahid Jewellers may contact me about this request.</span>{errors.consent && <em className="service-field__error">{errors.consent}</em>}</label>
  </>;
}

function VisitForm({ onDone }: { onDone: () => void }) {
  const { errors, sent, submit } = useForm((data) => validateVisit(data));
  const min = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }, []);
  if (sent) return <Sent kind="visit" onDone={onDone} />;
  return <form className="service-form" noValidate onSubmit={submit}>
    <p className="service-lead">Choose a day and the pieces you want to see. The shop confirms the time with you.</p>
    <ShopFacts />
    <Field label="Preferred date" error={errors.date}><input name="date" type="date" min={min} /></Field>
    <Field label="Preferred time" error={errors.time}><select name="time" defaultValue=""><option value="" disabled>Choose a time</option>{visitTimes.map((item) => <option key={item}>{item}</option>)}</select></Field>
    <Field label="The visit is for" error={errors.purpose}><select name="purpose" defaultValue=""><option value="" disabled>Choose one</option>{visitPurposes.map((item) => <option key={item}>{item}</option>)}</select></Field>
    <Field label="Who is coming"><select name="group" defaultValue={visitGroups[0]}>{visitGroups.map((item) => <option key={item}>{item}</option>)}</select></Field>
    <Field label="Design IDs or notes (optional)" wide><textarea name="notes" rows={3} placeholder="For example RSJ-D001, a bridal set for March" /></Field>
    <Contact errors={errors} />
    <div className="service-actions service-field--wide"><button className="button button--gold" type="submit">Request the visit</button><span>Not connected yet. Nothing is sent.</span></div>
  </form>;
}

function EnquiryForm({ onDone }: { onDone: () => void }) {
  const { errors, sent, submit } = useForm(validateEnquiry);
  if (sent) return <Sent kind="enquiry" onDone={onDone} />;
  return <form className="service-form" noValidate onSubmit={submit}>
    <p className="service-lead">Ask about a design, a custom piece, weight and price, or an exchange. The shop answers personally.</p>
    <Field label="Enquiry about" error={errors.topic}><select name="topic" defaultValue=""><option value="" disabled>Choose one</option>{enquiryTopics.map((item) => <option key={item}>{item}</option>)}</select></Field>
    <Field label="Design ID (optional)" error={errors.design}><input name="design" placeholder="RSJ-D001" autoCapitalize="characters" /></Field>
    <Field label="Your message" error={errors.message} wide><textarea name="message" rows={4} placeholder="Karat, approximate weight or budget, occasion, the date you need it by" /></Field>
    <Contact errors={errors} />
    <div className="service-actions service-field--wide"><button className="button button--gold" type="submit">Send enquiry</button><span>Not connected yet. Nothing is sent.</span></div>
  </form>;
}

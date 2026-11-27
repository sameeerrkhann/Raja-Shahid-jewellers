"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPkr, KARATS, toGrams, type GoldRate, type GoldRateStatus, type Karat } from "@/lib/gold/rates";
import { useGoldRate } from "./use-gold-rate";

const statusText: Record<GoldRateStatus, string> = { live: "Live rate", stale: "May be out of date", sample: "Sample figures, not live", unavailable: "Rate unavailable" };
const purityText = (karat: Karat) => `${((karat / 24) * 100).toFixed(1)}% gold`;
type Unit = "perTola" | "perTenGram" | "perGram";
const units: { key: Unit; label: string; short: string }[] = [{ key: "perTola", label: "Per tola", short: "Tola" }, { key: "perTenGram", label: "Per 10 grams", short: "10 g" }, { key: "perGram", label: "Per gram", short: "Gram" }];

function Status({ status }: { status: GoldRateStatus | null }) {
  return <span className="gold-rates__status"><i aria-hidden="true" />{status ? statusText[status] : "Checking the rate…"}</span>;
}

function Updated({ rate }: { rate: GoldRate }) {
  const stamp = rate.observedAt ?? rate.fetchedAt;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  if (!stamp) return null;
  const date = new Date(stamp), minutes = Math.max(0, Math.round((now - date.getTime()) / 60000));
  const time = date.toLocaleString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return <p className="gold-rates__updated">Last updated <time dateTime={stamp}>{time} PKT</time> · {minutes < 1 ? "just now" : `${minutes} min ago`}{rate.observedAt ? "" : " (fetched)"}</p>;
}

/* Pakistan gold rates by karat. Live data comes only from /api/gold-rate; with no source configured the panel
   says so instead of showing a number. "full" is the /gold-rates table, "compact" the homepage panel. */
export function GoldRates({ initial = null, variant = "full" }: { initial?: GoldRate | null; variant?: "full" | "compact" }) {
  const { rate, failed, status } = useGoldRate(initial);
  const [unit, setUnit] = useState<Unit>("perTola");
  const rows = rate?.rows ?? [];
  const shown = variant === "compact" ? rows.filter((row) => row.karat >= 22) : rows;
  const columns = variant === "compact" ? units.filter((entry) => entry.key !== "perTenGram") : units;
  return <div className={`gold-rates gold-rates--${variant}`} data-status={status ?? "loading"} data-unit={unit} aria-live="polite">
    <div className="gold-rates__head"><Status status={status} />{rate && <Updated rate={rate} />}</div>
    {shown.length > 0 ? <>
      {variant === "full" && <div className="gold-units" role="group" aria-label="Show price per">{units.map((entry) => <button key={entry.key} type="button" aria-pressed={unit === entry.key} onClick={() => setUnit(entry.key)}>{entry.short}</button>)}</div>}
      <table className="gold-rates__table">
        <caption className="sr-only">Gold rate in Pakistan rupees by karat</caption>
        <thead><tr><th scope="col">Karat</th>{columns.map((entry) => <th key={entry.key} scope="col" data-col={entry.key}>{entry.label}</th>)}</tr></thead>
        <tbody>{shown.map((row) => <tr key={row.karat}><th scope="row">{row.karat}K{variant === "full" && <small>{purityText(row.karat)}</small>}</th>{columns.map((entry) => <td key={entry.key} data-col={entry.key}>{formatPkr(row[entry.key])}</td>)}</tr>)}</tbody>
      </table>
      <p className="gold-rates__note">{rate?.note} 21K and 18K are calculated from 24K by purity. 1 tola = 11.664 g.</p>
    </> : <p className="gold-rates__empty">{rate?.note ?? (failed ? "Gold rates are unavailable right now. Please check again shortly." : "Loading the latest rate.")}</p>}
    {rate?.source && <p className="gold-rates__source">Gold prices by <a href={rate.source.url} target="_blank" rel="noreferrer">{rate.source.name}</a></p>}
    {variant === "compact" && <Link className="text-link gold-rates__more" href="/gold-rates" prefetch={false}>All karats and the value calculator</Link>}
  </div>;
}

/* The headline figure in the /gold-rates hero: 24K and 22K per tola, or a plain "unavailable" with no number. */
export function GoldFeature({ initial = null }: { initial?: GoldRate | null }) {
  const { rate, status } = useGoldRate(initial);
  const r24 = rate?.rows.find((row) => row.karat === 24), r22 = rate?.rows.find((row) => row.karat === 22);
  return <aside className="gold-feature" data-status={status ?? "loading"} aria-label="Today's headline gold rate">
    <Status status={status} />
    {r24 && r22 ? <>
      <p className="gold-feature__label">24K gold, per tola</p>
      <p className="gold-feature__value">{formatPkr(r24.perTola)}</p>
      <div className="gold-feature__second"><span>22K per tola</span><strong>{formatPkr(r22.perTola)}</strong></div>
      {rate && <Updated rate={rate} />}
    </> : <p className="gold-feature__empty">{rate?.note ?? "The latest rate will appear here once the source answers."}</p>}
  </aside>;
}

/* Small desktop header chip. Shown only for a live or recently live reading, never for sample or missing data. */
export function GoldRateChip() {
  const { rate, status } = useGoldRate();
  const r24 = rate?.rows.find((row) => row.karat === 24);
  if (!r24 || (status !== "live" && status !== "stale")) return null;
  return <Link className="gold-chip" href="/gold-rates" prefetch={false} data-status={status} aria-label={`24K gold ${formatPkr(r24.perTola)} per tola${status === "stale" ? ", may be out of date" : ""}. See all gold rates`}>
    <i aria-hidden="true" /><span>24K</span>{formatPkr(r24.perTola).replace("PKR ", "Rs ")}<small>/tola</small>
  </Link>;
}

export function GoldCalculator({ initial = null }: { initial?: GoldRate | null }) {
  const { rate } = useGoldRate(initial);
  const [weight, setWeight] = useState("1");
  const [unit, setUnit] = useState<"tola" | "gram">("tola");
  const [karat, setKarat] = useState<Karat>(22);
  const usable = Boolean(rate && rate.rows.length && rate.status !== "unavailable");
  const value = useMemo(() => {
    const grams = toGrams(Number(weight), unit), row = rate?.rows.find((entry) => entry.karat === karat);
    return row && Number.isFinite(grams) && grams > 0 ? grams * row.perGram : null;
  }, [weight, unit, karat, rate]);
  return <form className="gold-calc" onSubmit={(event) => event.preventDefault()} aria-labelledby="gold-calc-title">
    <h2 id="gold-calc-title">Gold value calculator</h2>
    <p className="gold-calc__lead">Work out the metal value of a weight of gold at the rate shown.</p>
    <div className="gold-calc__fields">
      <label>Weight<input type="number" inputMode="decimal" min="0" step="0.01" value={weight} onChange={(event) => setWeight(event.target.value)} disabled={!usable} /></label>
      <label>Unit<select value={unit} onChange={(event) => setUnit(event.target.value as "tola" | "gram")} disabled={!usable}><option value="tola">Tola</option><option value="gram">Gram</option></select></label>
      <label>Karat<select value={karat} onChange={(event) => setKarat(Number(event.target.value) as Karat)} disabled={!usable}>{KARATS.map((entry) => <option key={entry} value={entry}>{entry}K</option>)}</select></label>
    </div>
    <p className="gold-calc__result" aria-live="polite">{usable ? (value ? <><span>Estimated metal value</span><strong>{formatPkr(value)}</strong></> : "Enter a weight above zero.") : "The calculator works once a gold rate is available."}</p>
    <p className="gold-calc__fine">Metal value only{rate?.status === "sample" ? ", at sample figures" : ""}. It excludes making charges, stones and wastage, and is not a quotation or a buying price.</p>
  </form>;
}

"use client";

import { useEffect, useState } from "react";
import type { GoldRate } from "@/lib/gold/rates";

/* One shared client copy of /api/gold-rate, so the header chip, the hero figure, the table and the calculator
   show the same reading and make one request between them. Polls every 5 minutes while the tab is visible. */
const POLL_MS = 5 * 60 * 1000;
const MIN_GAP_MS = 60 * 1000;
type Snapshot = { rate: GoldRate | null; failed: boolean };
let snapshot: Snapshot = { rate: null, failed: false };
let inflight: Promise<void> | null = null;
let lastLoad = 0;
const listeners = new Set<(next: Snapshot) => void>();
const publish = () => listeners.forEach((listener) => listener(snapshot));

function load(force = false) {
  if (inflight) return inflight;
  if (!force && snapshot.rate && Date.now() - lastLoad < MIN_GAP_MS) return Promise.resolve();
  inflight = fetch("/api/gold-rate", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { data: GoldRate };
      snapshot = { rate: body.data, failed: false };
    })
    .catch(() => { snapshot = { rate: snapshot.rate?.status === "unavailable" ? snapshot.rate : null, failed: true }; })
    .finally(() => { inflight = null; lastLoad = Date.now(); publish(); });
  return inflight;
}

export function useGoldRate(initial: GoldRate | null = null) {
  const [state, setState] = useState<Snapshot>(() => (initial ? { rate: initial, failed: false } : snapshot));
  useEffect(() => {
    if (initial && !snapshot.rate) { snapshot = { rate: initial, failed: false }; lastLoad = Date.now(); }
    listeners.add(setState);
    if (!snapshot.rate || snapshot.rate.status === "unavailable") void load(true);
    const tick = () => { if (document.visibilityState === "visible") void load(); };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { listeners.delete(setState); window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
    // Subscribe once per mount; later readings arrive through the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const status = state.rate?.status ?? (state.failed ? "unavailable" : null);
  return { rate: state.rate, failed: state.failed, status };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

export function CatalogueSearch({ query, onSearch, action, hiddenParams = "" }: { query: string; onSearch: (value: string) => void; action: string; hiddenParams?: string }) {
  const [draft, setDraft] = useState({ source: query, value: query });
  const value = draft.source === query ? draft.value : query;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <form action={action} method="get" className="catalogue-search" role="search" aria-label="Search designs" onSubmit={(event) => { event.preventDefault(); if (timer.current) clearTimeout(timer.current); onSearch(value); }}>{Array.from(new URLSearchParams(hiddenParams)).filter(([name]) => name !== "q" && name !== "cursor").map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}<label className="sr-only" htmlFor="design-search">Search designs</label><Icon name="search" /><input id="design-search" name="q" type="search" maxLength={100} value={value} placeholder="A name, a detail, a design ID…" onChange={(event) => { const next = event.target.value; setDraft({ source: query, value: next }); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => onSearch(next), 350); }} /><button type="submit">Search</button></form>;
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { categoryLabel, statusLabels, topCategories } from "@/config/catalogue";
import { activeFilterCount, emptyQuery, parseCatalogueQuery, serializeCatalogueQuery } from "@/lib/catalogue/query";
import type { CatalogueQuery, CatalogueResult, DesignCardData } from "@/types/catalogue";
import { CatalogueSearch } from "./catalogue-search";
import { CatalogueError, CatalogueSkeleton } from "./catalogue-states";
import { DesignCard } from "./design-card";
import { DesignPreview } from "./design-preview";
import { FilterForm } from "./filter-form";

type Props = { initialKey: string; initialResult: CatalogueResult | null; initialError: string | null; basePath: string; fixedCollection?: string; counts: Record<string, number> };

export function CatalogueBrowser({ initialKey, initialResult, initialError, basePath, fixedCollection = "", counts }: Props) {
  const rawKey = useSearchParams().toString();
  const params = new URLSearchParams(rawKey);
  if (fixedCollection) params.set("collection", fixedCollection);
  const apiSearch = params.toString();
  let query: CatalogueQuery;
  try { query = parseCatalogueQuery(params); } catch { query = { ...emptyQuery, collection: fixedCollection }; }
  const [retry, setRetry] = useState(0);
  const requestKey = `${basePath}?${apiSearch}:${retry}`;
  const [response, setResponse] = useState<{ key: string; result?: CatalogueResult; error?: string }>({ key: "" });
  const [drawer, setDrawer] = useState(false);
  const [selected, setSelected] = useState<DesignCardData | null>(null);
  const useInitial = rawKey === initialKey && retry === 0;
  const result = useInitial ? initialResult : response.key === requestKey ? response.result : null;
  const error = useInitial ? initialError : response.key === requestKey ? response.error : null;
  const pending = !result && !error;
  const count = activeFilterCount(query, Boolean(fixedCollection));

  useEffect(() => {
    if (rawKey === initialKey && retry === 0) return;
    const controller = new AbortController();
    fetch(`/api/designs?${apiSearch}`, { signal: controller.signal }).then(async (res) => {
      const body = await res.json();
      if (!res.ok || !Array.isArray(body.data?.items) || typeof body.data?.totalMatching !== "number") throw new Error(body.error?.message || "Please try again. Your selection has not been lost.");
      if (!controller.signal.aborted) setResponse({ key: requestKey, result: body.data });
    }).catch((reason) => { if (!controller.signal.aborted) setResponse({ key: requestKey, error: reason instanceof Error ? reason.message : "The selection could not load." }); });
    return () => controller.abort();
  }, [apiSearch, initialKey, rawKey, requestKey, retry]);

  function href(next: CatalogueQuery) {
    const value = serializeCatalogueQuery(next, Boolean(fixedCollection));
    return `${basePath}${value ? `?${value}` : ""}`;
  }
  function navigate(next: CatalogueQuery, scroll = false) {
    window.history.pushState(null, "", href(next));
    if (scroll) document.getElementById("design-results")?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  function patch(values: Partial<CatalogueQuery>, scroll = false) {
    // Read the latest URL at event time: delayed search must not discard a newly applied facet.
    const current = new URLSearchParams(window.location.search);
    if (fixedCollection) current.set("collection", fixedCollection);
    let previous: CatalogueQuery;
    try { previous = parseCatalogueQuery(current); } catch { previous = { ...emptyQuery }; }
    navigate({ ...previous, cursor: "", ...values, collection: fixedCollection || values.collection || (values.collection === "" ? "" : previous.collection) }, scroll);
  }
  function clear() { navigate({ ...emptyQuery, collection: fixedCollection }); }
  function apply(form: HTMLFormElement) {
    const next = new URLSearchParams();
    for (const [name, value] of new FormData(form)) if (typeof value === "string") next.set(name, value);
    if (fixedCollection) next.set("collection", fixedCollection);
    navigate(parseCatalogueQuery(next));
    setDrawer(false);
  }
  const view = (id: string) => { const item = result?.items.find((design) => design.id === id); if (item) setSelected(item); };
  const chips = (["q", "category", "subcategory", "collection", "status", "karat", "style", "occasion"] as const).filter((name) => query[name] && !(fixedCollection && name === "collection"));
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return <section className="catalogue-browse container" aria-labelledby="browse-title">
    <div className="catalogue-browse-heading"><div><p className="eyebrow">Discover your direction</p><h2 id="browse-title">The design <em>selection.</em></h2></div><p>{total} distinct sample designs.<br />Not a live inventory.</p></div>
    <nav className="catalogue-categories" aria-label="Browse categories"><Link href={href({ ...query, category: "", subcategory: "", cursor: "" })} prefetch={false} aria-current={!query.category ? "page" : undefined} onNavigate={(event) => { event.preventDefault(); patch({ category: "", subcategory: "" }); }}>All designs <span>{total}</span></Link>{topCategories.map((category) => <Link key={category.id} prefetch={false} href={href({ ...query, category: category.slug, subcategory: "", cursor: "" })} aria-current={query.category === category.slug ? "page" : undefined} onNavigate={(event) => { event.preventDefault(); patch({ category: category.slug, subcategory: "" }); }}>{category.label}<span>{counts[category.slug] ?? 0}</span></Link>)}</nav>
    <div className="catalogue-toolbar"><CatalogueSearch query={query.q} action={basePath} hiddenParams={serializeCatalogueQuery(query, Boolean(fixedCollection))} onSearch={(q) => patch({ q })} /><div className="catalogue-toolbar-actions"><button className="catalogue-filter-trigger button button--outline" type="button" aria-haspopup="dialog" aria-expanded={drawer} onClick={() => setDrawer(true)}>Filters{count > 0 ? ` (${count})` : ""} <span aria-hidden="true">☷</span></button><form action={basePath} method="get" className="catalogue-sort" onSubmit={(event) => { event.preventDefault(); patch({ sort: (new FormData(event.currentTarget).get("sort") as CatalogueQuery["sort"]) }); }}>{Array.from(new URLSearchParams(serializeCatalogueQuery({ ...query, cursor: "" }, Boolean(fixedCollection)))).filter(([name]) => name !== "sort").map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}<label htmlFor="design-sort">Sort by</label><select id="design-sort" name="sort" value={query.sort} onChange={(event) => patch({ sort: event.target.value as CatalogueQuery["sort"] })}><option value="featured">Curated order</option><option value="newest">Recently added</option></select><button className="button button--outline catalogue-native-sort" type="submit">Sort designs</button></form></div></div>
    {chips.length > 0 && <div className="catalogue-active-filters"><ul aria-label="Applied filters">{chips.map((name) => { const label = name === "category" || name === "subcategory" ? categoryLabel(query[name]) : name === "status" ? statusLabels[query.status as keyof typeof statusLabels] : name === "karat" ? `${query.karat}K option` : query[name]; return <li key={name}><button type="button" aria-label={`Remove ${name} filter: ${label}`} onClick={() => patch({ [name]: "", ...(name === "category" ? { subcategory: "" } : {}) })}>{label}<span aria-hidden="true">×</span></button></li>; })}</ul><button className="text-link" type="button" onClick={clear}>Clear all</button></div>}
    <div className="catalogue-layout"><aside className="catalogue-sidebar" aria-label="Refine your selection"><p className="eyebrow">Refine the selection</p><FilterForm key={`${apiSearch}:desktop`} query={query} fixedCollection={Boolean(fixedCollection)} action={basePath} onApply={apply} onClear={clear} /></aside>
      <div className="catalogue-results" id="design-results" aria-busy={pending}><div className="catalogue-result-summary"><p role="status" aria-live="polite" aria-atomic="true">{pending ? "Updating the selection…" : error ? "Selection unavailable" : `${result?.totalMatching ?? 0} sample ${result?.totalMatching === 1 ? "design" : "designs"} found`}</p><span>{fixedCollection ? "An editorial collection" : "Your personal point of view"}</span></div>
        {pending ? <CatalogueSkeleton /> : error ? <CatalogueError message={error} onRetry={() => setRetry((value) => value + 1)} onClear={clear} /> : result?.items.length ? <><div className="design-grid">{result.items.map((design) => <DesignCard key={design.id} design={design} onView={view} />)}</div>{(result.nextCursor || result.pageNumber > 1) && <nav className="catalogue-pagination" aria-label="Design pages">{result.pageNumber > 1 ? <Link className="button button--outline" prefetch={false} href={href({ ...query, cursor: result.previousCursor || "" })} onNavigate={(event) => { event.preventDefault(); patch({ cursor: result.previousCursor || "" }, true); }}>Previous designs</Link> : <span />}<span>Page {result.pageNumber}</span>{result.nextCursor ? <Link className="button button--outline" prefetch={false} href={href({ ...query, cursor: result.nextCursor })} onNavigate={(event) => { event.preventDefault(); patch({ cursor: result.nextCursor! }, true); }}>Next designs <Icon name="arrow" /></Link> : <span />}</nav>}</> : <div className="catalogue-message"><p className="eyebrow">There is always another direction</p><h3>A different detail, <em>perhaps.</em></h3><p>{query.category && !counts[query.category] ? "No image-backed samples are published in this category yet. This does not mean the shop cannot make or supply these designs." : "Nothing in this sample selection matches every detail. Try a broader search or remove a filter."}</p><button className="button button--gold" type="button" onClick={clear}>Clear all filters</button></div>}
        <p className="catalogue-bottom-note">Designs and physical items are separate. Zero stock does not rule out manufacture. All availability here is synthetic; real options, feasibility, price and timing require shop confirmation.</p>
      </div></div>
    <Modal open={drawer} onClose={() => setDrawer(false)} title="Refine your selection" className="catalogue-filter-modal"><p className="caption">Combine the details that matter. Every availability option is a demo fixture.</p><FilterForm key={`${apiSearch}:mobile`} query={query} fixedCollection={Boolean(fixedCollection)} action={basePath} onApply={apply} onClear={() => { clear(); setDrawer(false); }} /></Modal>
    {selected && <DesignPreview key={selected.id} card={selected} onClose={() => setSelected(null)} />}
    <noscript><style>{`.catalogue-filter-trigger, .catalogue-active-filters, .catalogue-filters .text-link, .catalogue-message button { display:none !important; } .catalogue-sidebar { display:block !important; position:static !important; } .catalogue-layout { display:block !important; } .catalogue-native-sort { display:inline-flex !important; }`}</style><p className="catalogue-nojs">Browse using category links and native search/filter forms. Design-image links open an individual selection; the enlarged preview requires JavaScript. <a href={basePath}>Reset all filters</a>.</p></noscript>
  </section>;
}

"use client";

import { useId, type FormEvent } from "react";
import { catalogueCategories, occasionOptions, purityOptions, statusLabels, styleOptions, topCategories } from "@/config/catalogue";
import { collectionSlugs } from "@/lib/catalogue/query";
import type { CatalogueQuery } from "@/types/catalogue";

export function FilterForm({ query, fixedCollection, action, onApply, onClear }: { query: CatalogueQuery; fixedCollection: boolean; action: string; onApply: (form: HTMLFormElement) => void; onClear: () => void }) {
  const id = useId();
  const changeCategory = (event: FormEvent<HTMLSelectElement>) => {
    const form = event.currentTarget.form;
    const subcategory = form?.elements.namedItem("subcategory") as HTMLSelectElement | null;
    if (!subcategory) return;
    subcategory.value = "";
    const parent = topCategories.find((item) => item.slug === event.currentTarget.value);
    for (const option of Array.from(subcategory.options)) if (option.value) option.hidden = catalogueCategories.find((item) => item.slug === option.value)?.parentId !== parent?.id;
  };
  const select = (name: "category" | "subcategory" | "collection" | "status" | "karat" | "style" | "occasion", label: string, options: { value: string; label: string; hidden?: boolean }[], onChange?: (event: FormEvent<HTMLSelectElement>) => void) => <div className="catalogue-filter" key={name}><label htmlFor={`${id}-${name}`}>{label}</label><select id={`${id}-${name}`} name={name} defaultValue={query[name]} onChange={onChange}><option value="">All {name === "status" ? "availability" : name === "karat" ? "options" : name === "category" ? "categories" : name === "subcategory" ? "subcategories" : name === "collection" ? "collections" : `${name}s`}</option>{options.map((option) => <option key={option.value} value={option.value} hidden={option.hidden}>{option.label}</option>)}</select></div>;
  return <form className="catalogue-filters" action={action} method="get" onSubmit={(event) => { event.preventDefault(); onApply(event.currentTarget); }}>
    {query.q && <input type="hidden" name="q" value={query.q} />}{query.sort !== "featured" && <input type="hidden" name="sort" value={query.sort} />}{query.limit !== 12 && <input type="hidden" name="limit" value={query.limit} />}
    {select("category", "Category", topCategories.map((item) => ({ value: item.slug, label: item.label })), changeCategory)}
    {select("subcategory", "Subcategory", catalogueCategories.filter((item) => item.parentId).map((item) => ({ value: item.slug, label: item.label, hidden: item.parentId !== topCategories.find((parent) => parent.slug === query.category)?.id })))}
    {!fixedCollection && select("collection", "Collection", collectionSlugs.map((value) => ({ value, label: value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) })))}
    {select("status", "Sample availability", Object.entries(statusLabels).map(([value, label]) => ({ value, label })))}
    {select("style", "Jewellery style", styleOptions.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })))}
    {select("occasion", "Occasion", occasionOptions.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })))}
    {select("karat", "Sample purity option", purityOptions.map((value) => ({ value: String(value), label: `${value}K option` })))}
    <p className="catalogue-filter-note">Purities are sample options, not assays. Budget and weight filters are not offered without verified values.</p>
    <button type="submit" className="button button--gold">Apply filters</button><button type="button" className="text-link" onClick={onClear}>Clear all filters</button>
  </form>;
}

"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { categoryLabel, statusLabels } from "@/config/catalogue";
import type { DesignCardData, PublicDesign } from "@/types/catalogue";
import { CatalogueImage } from "./catalogue-image";

export function DesignPreview({ card, onClose }: { card: DesignCardData; onClose: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const key = `${card.id}:${attempt}`;
  const [response, setResponse] = useState<{ key: string; design?: PublicDesign; error?: string }>({ key: "" });
  const [imageIndex, setImageIndex] = useState(0);
  const loading = response.key !== key;
  const design = !loading ? response.design : undefined;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/designs/${encodeURIComponent(card.id)}`, { signal: controller.signal }).then(async (result) => {
      const body = await result.json();
      if (!result.ok || !body.data?.images?.length) throw new Error(body.error?.message || "This design preview could not load.");
      if (!controller.signal.aborted) setResponse({ key, design: body.data });
    }).catch((error) => { if (!controller.signal.aborted) setResponse({ key, error: error instanceof Error ? error.message : "Please try again." }); });
    return () => controller.abort();
  }, [card.id, key]);
  return <Modal open onClose={onClose} title={card.title} className="design-preview-modal">
    <div className="design-preview-grid"><div><CatalogueImage media={design?.images[imageIndex] ?? card.thumbnail} sizes="(max-width: 767px) 90vw, 500px" eager /><p className="catalogue-image-caption">AI-generated concept / Not shop photography</p>{design && design.images.length > 1 && <div className="design-preview-thumbnails" aria-label="Concept images">{design.images.map((media, index) => <button key={media.id} type="button" aria-pressed={index === imageIndex} onClick={() => setImageIndex(index)}>Image {index + 1}</button>)}</div>}</div>
      <div className="design-preview-copy"><p className="eyebrow">{categoryLabel(card.categorySlug)} / {card.designCode}</p><p>{card.description}</p><p className="availability-badge" data-status={card.displayStatus}>Sample: {statusLabels[card.displayStatus]}</p><p className="catalogue-preview-disclosure">This is synthetic demo data. No physical stock, purity, weight or manufacturing feasibility is verified by this image.</p>
        {loading ? <p role="status">Loading design information…</p> : response.error ? <div role="alert"><p>{response.error}</p><button type="button" className="text-link" onClick={() => setAttempt((value) => value + 1)}>Retry design information</button></div> : design && <><dl className="design-specs"><div><dt>Sample purity options</dt><dd>{design.variants.filter((variant) => variant.karat !== null).map((variant) => `${variant.karat}K`).join(" / ") || "Workshop review required"}<small>Preference options, not a metal assay</small></dd></div><div><dt>Weight &amp; price</dt><dd>Not verified · Quotation required</dd></div><div><dt>Customisation</dt><dd>{design.customizationAvailable ? "Subject to workshop review" : "Fixed concept study"}</dd></div><div><dt>Manufacturing time</dt><dd>No lead time configured</dd></div></dl>{design.variants.length > 1 && <p className="caption">Sample option availability: {design.variants.map((variant) => `${variant.karat ?? "Review"}K: ${statusLabels[design.variantStatuses.find((item) => item.variantId === variant.id)!.displayStatus]}`).join("; ")}. These are synthetic fixtures, not physical stock.</p>}</>}
        <div className="design-preview-enquiry"><p>Enquiries arrive in a later phase.</p><small>This preview does not reserve a piece, send a request or promise delivery. Full product options and quotation flows are not enabled yet.</small></div>
      </div></div>
  </Modal>;
}

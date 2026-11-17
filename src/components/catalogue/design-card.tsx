"use client";

import { categoryLabel, statusLabels } from "@/config/catalogue";
import type { DesignCardData } from "@/types/catalogue";
import { Icon } from "@/components/ui/icon";
import { CatalogueImage } from "./catalogue-image";
import Link from "next/link";

export function DesignCard({ design, onView }: { design: DesignCardData; onView: (id: string) => void }) {
  const target = `/designs?q=${encodeURIComponent(design.designCode)}`;
  return <article className="design-card" data-design-id={design.designCode}>
    <Link href={target} prefetch={false} className="design-card__image" onNavigate={(event) => { event.preventDefault(); onView(design.id); }} aria-label={`${design.newArrival ? "New edit / " : ""}AI concept / Sample design — A closer look: ${design.title}`} aria-haspopup="dialog"><CatalogueImage media={design.thumbnail} /><span className="design-card__origin">AI concept / Sample design</span>{design.newArrival && <span className="design-card__new">New edit</span>}<span className="design-card__view" aria-hidden="true">A closer look <Icon name="arrow" /></span></Link>
    <div className="design-card__details"><p className="design-card__category">{categoryLabel(design.categorySlug)} <span>{design.designCode}</span></p><h3>{design.title}</h3><p className="availability-badge" data-status={design.displayStatus}><span aria-hidden="true">◦</span>Sample: {statusLabels[design.displayStatus]}</p><p className="design-card__quote">Quotation required <span>· {design.customizationAvailable ? "Customisation subject to review" : "Fixed concept study"}</span></p><Link href={target} prefetch={false} className="text-link" onNavigate={(event) => { event.preventDefault(); onView(design.id); }} aria-label={`View design — ${design.title} information`}>View design <Icon name="arrow" /></Link></div>
  </article>;
}

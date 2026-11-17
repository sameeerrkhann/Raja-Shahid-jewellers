"use client";

import Image from "next/image";
import type { ReferenceStudy } from "@/config/preview-studies";
import { Icon } from "@/components/ui/icon";

export function ProductCard({ study, onView }: { study: ReferenceStudy; onView: (study: ReferenceStudy) => void }) {
  return <article className="product-card" id={study.id}>
    <button className="product-card__image" type="button" onClick={() => onView(study)} aria-label={`Editorial reference — View study: ${study.title}`}>
      <Image src={study.image} alt={study.alt} fill sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 31vw" quality={85} style={{ objectPosition: study.position }} />
      <span className="image-label">Editorial reference</span><span className="product-card__expand" aria-hidden="true">↗</span>
    </button>
    <div className="product-card__meta"><p className="eyebrow">{study.category}</p><h3>{study.title}</h3><button type="button" className="text-link" onClick={() => onView(study)}>View the study <Icon name="arrow" /></button></div>
  </article>;
}

"use client";

import Image from "next/image";
import { useState } from "react";
import { referenceStudies, type ReferenceStudy } from "@/config/preview-studies";
import { ProductCard } from "@/components/catalogue/product-card";
import { Section, SectionHeading } from "@/components/ui/section";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";

export function ReferenceGallery() {
  const [selected, setSelected] = useState<ReferenceStudy | null>(null);
  return <>
    <Section id="selection" className="selection-section"><SectionHeading eyebrow="01 / The selection" title={<>Extraordinary, in <em>every detail.</em></>}><p>Warmth. Intricacy. A certain quiet confidence.<br />Three editorial studies in a shared visual language.</p></SectionHeading>
      <div className="product-grid">{referenceStudies.map((study) => <ProductCard key={study.id} study={study} onView={setSelected} />)}</div><p className="section-footnote">AI-generated images for visual review. No stock, purity, price or manufacturing availability is asserted.</p>
    </Section>
    <Section id="collections" className="collections-section"><SectionHeading eyebrow="02 / The editorial collections" title={<>For a moment.<br /><em>For a lifetime.</em></>}><p>Distinct moods, brought together<br />by a considered eye.</p></SectionHeading>
      <div className="collection-grid">
        <button className="collection-card collection-card--large" type="button" onClick={() => setSelected(referenceStudies[0])}><Image src={referenceStudies[0].image} alt={referenceStudies[0].alt} fill sizes="(max-width: 767px) 100vw, 60vw" quality={85} /><span className="collection-card__content"><span className="eyebrow">The occasion edit · Reference study</span><span className="collection-card__title">A beautiful<br /><em>beginning.</em></span><span className="collection-card__action">Explore the mood <Icon name="arrow" /></span></span></button>
        <button className="collection-card collection-card--small" type="button" onClick={() => setSelected(referenceStudies[2])}><Image src={referenceStudies[2].image} alt={referenceStudies[2].alt} fill sizes="(max-width: 767px) 100vw, 40vw" quality={85} /><span className="collection-card__content"><span className="eyebrow">The everyday edit · Reference study</span><span className="collection-card__title">Little things.<br /><em>Deeply felt.</em></span><span className="collection-card__action">Explore the mood <Icon name="arrow" /></span></span></button>
      </div>
    </Section>
    <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.title ?? "Reference study"} className="study-modal">
      {selected && <><figure className="study-figure"><div className="study-figure__image"><Image src={selected.image} alt={selected.alt} fill sizes="(max-width: 767px) 90vw, 800px" quality={90} /></div><figcaption>AI-generated image ({selected.photographer}) · Not shop stock</figcaption></figure><p>{selected.description}</p><p className="caption">Not a catalogue entry or an item offered for sale.</p>{selected.sourceUrl && <a className="text-link" href={selected.sourceUrl} target="_blank" rel="noreferrer">View the original <Icon name="arrow" /></a>}</>}
    </Modal>
  </>;
}

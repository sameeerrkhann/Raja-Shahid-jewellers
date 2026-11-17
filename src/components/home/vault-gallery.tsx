"use client";

import { useRef } from "react";
import { homeCategories } from "@/config/home";
import { referenceStudies } from "@/config/preview-studies";
import { Icon } from "@/components/ui/icon";
import { JewelleryDrawing } from "./jewellery-drawing";
import { EditorialImage } from "./editorial-image";
import Link from "next/link";
import type { CategorySamples } from "@/lib/catalogue/showcase";

export function VaultGallery({ samples }: { samples: Record<string, CategorySamples> }) {
  const viewport = useRef<HTMLDivElement>(null);
  function move(direction: number) {
    const element = viewport.current;
    if (!element) return;
    if (element.closest("[data-vault-pin]")?.getAttribute("data-pinned") === "true") {
      element.dispatchEvent(new CustomEvent("rsj:gallery-step", { bubbles: true, detail: direction }));
    } else {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "true";
      element.scrollBy({ left: direction * element.clientWidth * .85, behavior: reduced ? "instant" : "smooth" });
    }
  }
  return <>
    <noscript><style>{`.vault-viewport, .vault-controls { display: none !important; }`}</style><ul className="vault-nojs-list">{homeCategories.map((category) => <li key={category.id}><h3>{category.title}</h3><p>{category.subtitle}</p><Link href={`/designs?category=${category.id}`} prefetch={false}>Browse sample designs →</Link></li>)}</ul><p className="container home-reference-note">Category directions only. The Design Vault is a synthetic sample catalogue, not real stock.</p></noscript>
    <div className="vault-viewport" ref={viewport} tabIndex={0} role="region" aria-label="Jewellery category directions" data-vault-viewport>
      <ul className="vault-track" data-vault-track>{homeCategories.map((category) => { const sample = samples[category.id]; return <li className={`vault-card vault-card--${category.id}`} key={category.id} data-vault-card>
        <button type="button" className="vault-card__button" data-home-action={category.id}>
          {"image" in category ? <EditorialImage src={category.image} alt={referenceStudies.find((study) => study.id === category.study)!.alt} fill sizes="(max-width: 767px) 80vw, 38vw" quality={85} className="vault-card__photo" /> : <div className="vault-card__drawing"><JewelleryDrawing kind={category.illustration} /></div>}
          <span className="vault-card__copy"><span className="vault-card__title">{category.title}</span><span className="vault-card__subtitle">{category.subtitle}</span>
            <span className="vault-card__facts">{sample ? `${sample.count} sample ${sample.count === 1 ? "design" : "designs"}: ${sample.subcategories.join(", ")}` : "Sample designs for this category are still being prepared"}</span>
            <span className="vault-card__link">Explore {category.title.toLowerCase()} <Icon name="arrow" /></span></span>
        </button>
        {sample && <span className="vault-card__samples">{sample.images.map((image) => <Link key={image.href} href={image.href} prefetch={false} aria-label={`Open ${image.title} in the Design Vault`} title={image.title}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 480px catalogue derivative */}
          <img src={image.src} alt="" width={160} height={160} loading="lazy" decoding="async" />
        </Link>)}</span>}
      </li>; })}</ul>
    </div>
    <div className="vault-gallery-footer"><p>Reference imagery &amp; illustrated studies. Not stock.<br /><span>Availability will be confirmed by the catalogue and workshop.</span></p><div className="vault-controls"><button className="icon-button" type="button" aria-label="Previous collection" onClick={() => move(-1)}><Icon name="arrow" className="arrow-back" /></button><span aria-hidden="true">{homeCategories.length} categories</span><button className="icon-button" type="button" aria-label="Next collection" onClick={() => move(1)}><Icon name="arrow" /></button></div></div>
  </>;
}

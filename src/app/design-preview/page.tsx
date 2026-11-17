import type { Metadata } from "next";
import Image from "next/image";
import { ReferenceGallery } from "@/components/preview/reference-gallery";
import { AuriaConcept } from "@/components/preview/auria-concept";
import { DesignLanguage } from "@/components/preview/design-language";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Design Preview", robots: { index: false, follow: false } };

export default function DesignPreview() {
  return <main id="main-content"><div id="top" className="preview-notice"><span>THE VISUAL ATELIER</span><span>Design preview · 02</span></div>
    <section className="preview-hero" data-tone="dark" aria-labelledby="hero-title"><div className="preview-hero__image"><Image src="/images/editorial/floral-necklace.jpg" alt="Ornate warm-toned necklace with violet accents, photographed by Vaibhav Nagare" fill sizes="(max-width: 767px) 100vw, 72vw" quality={90} priority /></div>
      <div className="container preview-hero__content"><p className="eyebrow">The art of personal adornment</p><h1 id="hero-title">An expression.<br />An <em>heirloom.</em></h1><p className="hero-intro">For the moments you keep.<br />For the person you are.</p><div className="hero-actions"><ButtonLink href="#selection">Discover the visual language <Icon name="arrow" /></ButtonLink><a className="hero-secondary" href="#auria">Meet AURIA</a></div></div>
      <div className="container hero-bottom"><span>Raja Shahid Jewellers / A new perspective</span><span>Editorial reference · Not shop inventory</span></div>
    </section>
    <div className="editorial-intro container"><span className="editorial-intro__index">I.</span><p>Some pieces catch the light.<br /><em>Others hold a little of your story.</em></p><span className="editorial-intro__note">An original visual direction,<br />rooted in a love of detail.</span></div>
    <ReferenceGallery /><AuriaConcept /><DesignLanguage />
  </main>;
}

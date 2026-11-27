import type { Metadata } from "next";
import { HomeExperience } from "@/components/home/home-experience";
import { EditorialImage } from "@/components/home/editorial-image";
import { VaultGallery } from "@/components/home/vault-gallery";
import { ScrollShowcase, type ShowcasePiece } from "@/components/home/scroll-showcase";
import { TryOn } from "@/components/home/try-on";
import { GoldRates } from "@/components/gold/gold-rates";
import "./gold.css";
import { BridalBox, type BridalPiece } from "@/components/home/bridal-box";
import { showcase } from "@/config/showcase";
import { sampleDesigns } from "@/data/demo/catalogue";
import { categorySamples } from "@/lib/catalogue/showcase";
import { categoryLabel } from "@/config/catalogue";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import "./home.css";
import "lenis/dist/lenis.css";
import "./showcase.css";
/* eslint-disable @next/next/no-img-element -- 32px category thumbnails in the closing pills */

export const metadata: Metadata = {
  title: { absolute: "Raja Shahid Jewellers — Beyond the Moment" },
  description: "The provisional Royal Gold Atelier: turn a concept ring with your scroll, look closer at sample designs, see pieces on a model, then browse sample jewellery, bridal inspiration and the future AURIA atelier. Customer website demo with concept imagery, not actual stock.",
  robots: { index: false, follow: false },
};

export default function Home() {
  const samples = categorySamples();
  const total = Object.values(samples).reduce((sum, entry) => sum + entry.count, 0);
  // Only categories with published sample images; the last pill is the whole vault.
  const collections = [
    ...Object.entries(samples).map(([slug, entry]) => ({ href: `/designs?category=${slug}`, title: categoryLabel(slug), count: entry.count, image: entry.images[0]?.src ?? null })),
    { href: "/designs", title: "All designs", count: total, image: null },
  ];
  // Facts come from the catalogue record so the homepage can never claim more than the Design Vault does.
  const record = (code: string) => { const design = sampleDesigns.find((entry) => entry.designCode === code); if (!design) throw new Error(`Design ${code} is missing from the catalogue`); return design; };
  const karatText = (code: string) => { const karats = record(code).variants.map((variant) => variant.karat).filter((karat): karat is number => karat !== null); return karats.length ? `${karats.join("K or ")}K gold` : "Purity under review"; };
  const number = (code: string) => code.slice(-3);
  const pieces: ShowcasePiece[] = showcase.map((entry) => { const design = record(entry.code); return {
    code: entry.code, title: design.title, kind: entry.kind, focus: entry.focus, notes: entry.notes, href: `/designs?q=${encodeURIComponent(entry.code)}`,
    photo: `/images/catalogue/design-${number(entry.code)}.webp`, cutout: `/images/catalogue/cut/design-${number(entry.code)}.webp`,
    facts: [karatText(entry.code), design.customizationAvailable ? "Personalisation on request" : "Made as shown", "Weight and price on request"] }; });
  const bridal: BridalPiece[] = ["RSJ-D001", "RSJ-D002", "RSJ-D003", "RSJ-D004"].map((code) => ({ code, title: record(code).title, cutout: `/images/catalogue/cut/${code === "RSJ-D001" || code === "RSJ-D002" ? "design" : "wear"}-${number(code)}.webp` }));
  return <HomeExperience>
    <ScrollShowcase pieces={pieces} />
    <TryOn />
    <BridalBox pieces={bridal} />
    <section className="begin" aria-labelledby="begin-title"><h2 id="begin-title">Where would you like to begin?</h2>
      <ul>{collections.map((entry) => <li key={entry.href}><a href={entry.href}>{entry.image ? <img src={entry.image} alt="" loading="lazy" /> : <span className="begin__more" aria-hidden="true">→</span>}<strong>{entry.title}</strong><em>{entry.count}</em></a></li>)}</ul>
    </section>
    <section id="vault" className="home-vault home-scene" data-scene="06" data-vault-pin aria-labelledby="vault-title"><div className="container home-vault__heading"><div><h2 id="vault-title" data-home-reveal>A world of <em>possibility.</em></h2></div><p>Six ways into the Design Vault.<br />Each shows the sample designs published so far.</p></div><VaultGallery samples={categorySamples()} /></section>
    <section id="auria" className="auria home-scene" data-scene="07" data-tone="dark" aria-labelledby="auria-title"><div className="container auria__grid">
      <div className="auria__copy">
        <p className="auria__badge"><Icon name="sparkle" />AURIA · in development</p>
        <h2 id="auria-title" data-home-reveal>Describe it.<br /><em>We will find it.</em></h2>
        <p data-home-reveal>AURIA will be your jewellery concierge: tell it the occasion, the feeling or a photo you love, and it suggests pieces from the Design Vault or starts a custom request with our team.</p>
        <ul className="auria__abilities">
          <li><strong>Ideas into pieces</strong><span>From a few words to designs you can open.</span></li>
          <li><strong>Custom requests</strong><span>Shape a made-to-order idea before you visit.</span></li>
          <li><strong>Voice, later</strong><span>Speak instead of typing, when it is ready.</span></li>
        </ul>
        <div className="auria__actions"><Button data-home-action="auria">Preview AURIA <Icon name="arrow" /></Button><Button data-home-action="appointment" variant="outline">Talk to our team <Icon name="arrow" /></Button></div>
        <p className="auria__note">Not connected yet. No message, photo or voice leaves this page.</p>
      </div>
      <div className="auria__device" aria-label="Illustrative AURIA conversation, not connected" role="img">
        <div className="auria__orb" aria-hidden="true" />
        <div className="auria__thread" aria-hidden="true">
          <p className="auria__msg auria__msg--you">A bridal set in 22K, light enough for a long day.</p>
          <p className="auria__msg auria__msg--auria"><span className="auria__typing"><i /><i /><i /></span><span className="auria__reply">Three directions from the Design Vault, each lighter at the back:</span></p>
          <div className="auria__picks"><img src="/images/catalogue/cut/design-001.webp" alt="" loading="lazy" /><img src="/images/catalogue/cut/design-002.webp" alt="" loading="lazy" /><img src="/images/catalogue/cut/wear-003.webp" alt="" loading="lazy" /></div>
          <div className="auria__chips"><span>Something for my mother</span><span>Match my outfit</span><span>A ring with a story</span></div>
          <div className="auria__input"><span>Ask AURIA…</span><Icon name="sparkle" /></div>
        </div>
        <span className="auria__label">Illustrative conversation · not connected</span>
      </div>
    </div></section>
    <section id="gold" className="home-gold home-scene" data-scene="08" data-tone="dark" aria-labelledby="gold-title"><div className="container">
      <div className="home-gold__intro"><div><h2 id="gold-title" data-home-reveal>Precious, in<br /><em>every sense.</em></h2><p>The beauty of a piece is personal.<br />Its material value deserves clarity.</p></div><GoldRates variant="compact" /></div>
      <div className="home-finale"><div className="home-finale__copy"><h3 data-home-reveal>Some things<br />become <em>part of you.</em></h3><p>Begin with a little inspiration.<br />Let the rest be a conversation.</p><div className="home-finale__actions"><Button data-home-action="appointment">Plan a private visit <Icon name="arrow" /></Button><Button data-home-action="enquiry" variant="outline">A jewellery enquiry <Icon name="arrow" /></Button></div><p className="home-reference-note">Service previews only. Requests are not connected;<br />official shop details and appointment policies await approval.</p></div><div className="home-finale__image"><EditorialImage src="/images/editorial/jhumkas.webp" alt="AI-generated image of gold jhumka earrings on a dark stand; not shop stock" fill sizes="(max-width: 767px) 85vw, 34vw" quality={85} /><span>AI-generated image / A certain radiance</span></div></div>
    </div></section>
  </HomeExperience>;
}

import type { Metadata } from "next";
import { HomeExperience } from "@/components/home/home-experience";
import { EditorialImage } from "@/components/home/editorial-image";
import { JewelleryDrawing } from "@/components/home/jewellery-drawing";
import { VaultGallery } from "@/components/home/vault-gallery";
import { ScrollShowcase, type ShowcasePiece } from "@/components/home/scroll-showcase";
import { TryOn, type TryOnItem } from "@/components/home/try-on";
import { showcase, tryOnCatalogue } from "@/config/showcase";
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
  const tryOnItems: TryOnItem[] = tryOnCatalogue.map((entry) => { const design = record(entry.code); return {
    code: entry.code, title: design.title, slot: entry.slot, wearers: entry.wearers, cutout: `/images/catalogue/cut/wear-${number(entry.code)}.webp`,
    group: { neck: "Necklaces and sets", long: "Necklaces and sets", finger: "Rings", wrist: "Bangles and karas", ears: "Earrings", forehead: "Tikkas" }[entry.slot],
    facts: `${entry.code} · ${karatText(entry.code)} · weight and price on request` }; });
  return <HomeExperience>
    <ScrollShowcase pieces={pieces} />
    <TryOn items={tryOnItems} />
    <section className="begin" aria-labelledby="begin-title"><h2 id="begin-title">Where would you like to begin?</h2>
      <ul>{collections.map((entry) => <li key={entry.href}><a href={entry.href}>{entry.image ? <img src={entry.image} alt="" loading="lazy" /> : <span className="begin__more" aria-hidden="true">→</span>}<strong>{entry.title}</strong><em>{entry.count}</em></a></li>)}</ul>
    </section>
    <section id="bridal" className="home-bridal home-scene" data-scene="05" data-tone="dark" aria-labelledby="bridal-title">
      <div className="home-bridal__image-wrap"><EditorialImage src="/images/editorial/floral-necklace.jpg" alt="Floral necklace used as bridal mood reference rather than an offered product" fill sizes="(max-width: 767px) 100vw, 65vw" quality={85} className="home-bridal__photo" data-bridal-media /><span className="home-bridal__arch" aria-hidden="true" /></div>
      <div className="container home-bridal__content"><div><h2 id="bridal-title" data-home-reveal>A promise.<br /><em>Beautifully</em><br />kept.</h2><p className="home-bridal__intro" data-home-reveal>For the beginning of a new story.<br />For everything you carry into it.</p><a className="home-underlined-link" href="#vault">Explore the bridal direction <Icon name="arrow" /></a></div><p className="home-bridal__caption">Reference styling only. No bridal inventory,<br />heritage date or manufacturing promise is asserted.</p></div><span className="home-bridal__folio" aria-hidden="true">III</span>
    </section>
    <section id="vault" className="home-vault home-scene" data-scene="06" data-vault-pin aria-labelledby="vault-title"><div className="container home-vault__heading"><div><h2 id="vault-title" data-home-reveal>A world of <em>possibility.</em></h2></div><p>Six ways into the Design Vault.<br />Each shows the sample designs published so far.</p></div><VaultGallery samples={categorySamples()} /></section>
    <section id="auria" className="home-auria home-scene" data-scene="07" aria-labelledby="auria-title"><div className="container">
      <div className="home-auria__heading"><p className="home-status-label"><span aria-hidden="true" />Visual introduction / Not connected</p></div>
      <div className="home-auria__grid"><div className="home-concept-study"><div className="home-concept-study__stage"><div className="home-concept-study__sketch"><JewelleryDrawing kind="necklace" /><span>01 / Sketch study</span></div><div className="home-concept-study__photo" data-concept-photo><EditorialImage src="/images/editorial/floral-necklace.jpg" alt="Reference necklace photograph beside an original line illustration; not an AI-generated result" fill sizes="(max-width: 767px) 100vw, 50vw" quality={85} /><span className="home-concept-study__reference-label">02 / Reference</span></div><span className="home-concept-study__crosshair" aria-hidden="true">+</span></div><p className="home-reference-note">Hand-authored illustration → reference photograph.<br />A visual metaphor, not AI output, CAD or a manufacturing guarantee.</p></div>
        <div className="home-auria__copy"><h2 id="auria-title" data-home-reveal>First, a thought.<br /><em>Then, something</em><br />entirely you.</h2><p data-home-reveal>A future space for your inspiration. A conversation about a feeling, a silhouette, a piece that could be yours.</p><div className="home-auria__interface"><div><Icon name="sparkle" /><span>AURIA</span><small>Interface study</small></div><p>“Something meaningful.<br /><em>Something like no other.”</em></p><span>Illustrative prompt / No messages can be sent</span></div><Button data-home-action="auria">Design with AURIA <Icon name="arrow" /></Button><p className="home-reference-note">AI chat, generation and voice are not connected.</p></div>
      </div>
    </div></section>
    <section id="gold" className="home-gold home-scene" data-scene="08" data-tone="dark" aria-labelledby="gold-title"><div className="container">
      <div className="home-gold__intro"><div><h2 id="gold-title" data-home-reveal>Precious, in<br /><em>every sense.</em></h2><p>The beauty of a piece is personal.<br />Its material value deserves clarity.</p></div><div className="home-rate-study"><p className="eyebrow">Illustrative rate preview · Not live</p><div><span>24K / Per gram</span><strong>PKR 30,000</strong></div><p>Arbitrary demonstration figure—not a current market rate, shop price, valuation or financing offer. No market timestamp or live feed.</p><span className="home-rate-study__rule">Gold services arrive in a later phase.</span></div></div>
      <div className="home-finale"><div className="home-finale__copy"><h3 data-home-reveal>Some things<br />become <em>part of you.</em></h3><p>Begin with a little inspiration.<br />Let the rest be a conversation.</p><div className="home-finale__actions"><Button data-home-action="appointment">Plan a private visit <Icon name="arrow" /></Button><Button data-home-action="enquiry" variant="outline">A jewellery enquiry <Icon name="arrow" /></Button></div><p className="home-reference-note">Service previews only. Requests are not connected;<br />official shop details and appointment policies await approval.</p></div><div className="home-finale__image"><EditorialImage src="/images/editorial/drop-earrings.jpg" alt="Round stud earrings on a hand; editorial reference by PRAHANT STUDIO, not actual shop stock" fill sizes="(max-width: 767px) 85vw, 34vw" quality={85} /><span>Reference study / A certain radiance</span></div></div>
    </div></section>
  </HomeExperience>;
}

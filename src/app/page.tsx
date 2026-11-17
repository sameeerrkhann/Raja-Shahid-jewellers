import type { Metadata } from "next";
import { HomeExperience } from "@/components/home/home-experience";
import { EditorialImage } from "@/components/home/editorial-image";
import { JewelleryDrawing } from "@/components/home/jewellery-drawing";
import { VaultGallery } from "@/components/home/vault-gallery";
import { ShowcaseHero } from "@/components/home/showcase-hero";
import { showcaseItems } from "@/lib/catalogue/showcase";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import "./home.css";
import "./showcase.css";

export const metadata: Metadata = {
  title: { absolute: "Raja Shahid Jewellers — Beyond the Moment" },
  description: "The provisional Royal Gold Atelier: turn through sample jewellery designs, bridal inspiration and the future AURIA atelier. Customer website demo with concept imagery, not actual stock.",
  robots: { index: false, follow: false },
};

export default function Home() {
  return <HomeExperience>
    <ShowcaseHero items={showcaseItems()} />
    <section id="craft" className="home-craft home-scene" data-scene="02" aria-labelledby="craft-title"><div className="home-craft__frame container" data-craft-pin>
      <div className="home-craft__copy"><p className="eyebrow" data-home-reveal>02 / The art of craftsmanship</p><h2 id="craft-title" data-home-reveal>Beauty begins<br />with <em>the detail.</em></h2><p data-home-reveal>A curve. A setting. The rhythm of a thousand little decisions. Look closer, and a piece becomes a world of its own.</p><a className="text-link" href="#bridal">The language of celebration <Icon name="arrow" /></a><div className="craft-notation" aria-hidden="true"><span>Form</span><span>Light</span><span>Feeling</span></div><p className="home-reference-note">A photographic study of ornament—not a claim about the shop’s workshop or making techniques.</p></div>
      <figure className="home-craft__figure"><div className="home-craft__image-frame"><EditorialImage src="/images/editorial/pendant-detail.jpg" alt="Close-up of a circular pendant and beaded necklace; reference photography by Vaibhav Nagare" fill sizes="(max-width: 767px) 100vw, 52vw" quality={85} className="home-craft__photo" data-craft-media /></div><figcaption><span>Study Nº 02 / Ornament, considered</span><span className="craft-coordinate" aria-hidden="true">22° / A closer perspective</span></figcaption><span className="craft-frame-line" aria-hidden="true" /></figure>
    </div></section>
    <section id="bridal" className="home-bridal home-scene" data-scene="03" data-tone="dark" aria-labelledby="bridal-title">
      <div className="home-bridal__image-wrap"><EditorialImage src="/images/editorial/floral-necklace.jpg" alt="Floral necklace used as bridal mood reference rather than an offered product" fill sizes="(max-width: 767px) 100vw, 65vw" quality={85} className="home-bridal__photo" data-bridal-media /><span className="home-bridal__arch" aria-hidden="true" /></div>
      <div className="container home-bridal__content"><div><p className="eyebrow" data-home-reveal>03 / Bridal heritage · An editorial direction</p><h2 id="bridal-title" data-home-reveal>A promise.<br /><em>Beautifully</em><br />kept.</h2><p className="home-bridal__intro" data-home-reveal>For the beginning of a new story.<br />For everything you carry into it.</p><a className="home-underlined-link" href="#vault">Explore the bridal direction <Icon name="arrow" /></a></div><p className="home-bridal__caption">Reference styling only. No bridal inventory,<br />heritage date or manufacturing promise is asserted.</p></div><span className="home-bridal__folio" aria-hidden="true">III</span>
    </section>
    <section id="vault" className="home-vault home-scene" data-scene="04" data-vault-pin aria-labelledby="vault-title"><div className="container home-vault__heading"><div><p className="eyebrow">04 / The Design Vault</p><h2 id="vault-title" data-home-reveal>A world of <em>possibility.</em></h2></div><p>Find your direction.<br />The piece comes next.</p></div><VaultGallery /></section>
    <section id="auria" className="home-auria home-scene" data-scene="05" aria-labelledby="auria-title"><div className="container">
      <div className="home-auria__heading"><p className="eyebrow">05 / AURIA · The jewellery atelier, imagined</p><p className="home-status-label"><span aria-hidden="true" />Visual introduction / Not connected</p></div>
      <div className="home-auria__grid"><div className="home-concept-study"><div className="home-concept-study__stage"><div className="home-concept-study__sketch"><JewelleryDrawing kind="necklace" /><span>01 / Sketch study</span></div><div className="home-concept-study__photo" data-concept-photo><EditorialImage src="/images/editorial/floral-necklace.jpg" alt="Reference necklace photograph beside an original line illustration; not an AI-generated result" fill sizes="(max-width: 767px) 100vw, 50vw" quality={85} /><span className="home-concept-study__reference-label">02 / Reference</span></div><span className="home-concept-study__crosshair" aria-hidden="true">+</span></div><p className="home-reference-note">Hand-authored illustration → reference photograph.<br />A visual metaphor, not AI output, CAD or a manufacturing guarantee.</p></div>
        <div className="home-auria__copy"><h2 id="auria-title" data-home-reveal>First, a thought.<br /><em>Then, something</em><br />entirely you.</h2><p data-home-reveal>A future space for your inspiration. A conversation about a feeling, a silhouette, a piece that could be yours.</p><div className="home-auria__interface"><div><Icon name="sparkle" /><span>AURIA</span><small>Interface study</small></div><p>“Something meaningful.<br /><em>Something like no other.”</em></p><span>Illustrative prompt / No messages can be sent</span></div><Button data-home-action="auria">Design with AURIA <Icon name="arrow" /></Button><p className="home-reference-note">AI chat, generation and voice are not connected.</p></div>
      </div>
    </div></section>
    <section id="gold" className="home-gold home-scene" data-scene="06" data-tone="dark" aria-labelledby="gold-title"><div className="container">
      <div className="home-gold__intro"><div><p className="eyebrow">06 / Gold, value &amp; a personal connection</p><h2 id="gold-title" data-home-reveal>Precious, in<br /><em>every sense.</em></h2><p>The beauty of a piece is personal.<br />Its material value deserves clarity.</p></div><div className="home-rate-study"><p className="eyebrow">Illustrative rate preview · Not live</p><div><span>24K / Per gram</span><strong>PKR 30,000</strong></div><p>Arbitrary demonstration figure—not a current market rate, shop price, valuation or financing offer. No market timestamp or live feed.</p><span className="home-rate-study__rule">Gold services arrive in a later phase.</span></div></div>
      <div className="home-finale"><div className="home-finale__copy"><p className="eyebrow">A story worth making your own</p><h3 data-home-reveal>Some things<br />become <em>part of you.</em></h3><p>Begin with a little inspiration.<br />Let the rest be a conversation.</p><div className="home-finale__actions"><Button data-home-action="appointment">Plan a private visit <Icon name="arrow" /></Button><Button data-home-action="enquiry" variant="outline">A jewellery enquiry <Icon name="arrow" /></Button></div><p className="home-reference-note">Service previews only. Requests are not connected;<br />official shop details and appointment policies await approval.</p></div><div className="home-finale__image"><EditorialImage src="/images/editorial/drop-earrings.jpg" alt="Round stud earrings on a hand; editorial reference by PRAHANT STUDIO, not actual shop stock" fill sizes="(max-width: 767px) 85vw, 34vw" quality={85} /><span>Reference study / A certain radiance</span></div></div>
    </div></section>
  </HomeExperience>;
}

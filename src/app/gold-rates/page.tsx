import type { Metadata } from "next";
import Link from "next/link";
import { GoldCalculator, GoldFeature, GoldRates } from "@/components/gold/gold-rates";
import { PageMotion } from "@/components/motion/page-motion";
import { getGoldRate } from "@/lib/server/gold-rate";
import "../catalogue.css";
import "../gold.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gold rates in Pakistan", description: "24K, 22K, 21K and 18K gold rates in PKR per tola, 10 grams and gram, with the time of the last update and a metal value calculator.", alternates: { canonical: "/gold-rates" } };

export default async function GoldRatesPage() {
  const rate = await getGoldRate();
  return <main id="main-content" className="gold-page">
    <PageMotion page="gold" />
    <header className="gold-hero catalogue-hero--vault" data-tone="dark"><div className="container gold-hero__grid"><div>
      <nav aria-label="Breadcrumb"><Link href="/" prefetch={false}>Home</Link><span aria-hidden="true">/</span><span aria-current="page">Gold rates</span></nav>
      <h1><span>Gold rates,</span> <em>in the open.</em></h1>
      <p>Today&apos;s gold price in Pakistan rupees by karat, with the time it was last updated. Rates refresh through the day.</p>
    </div><GoldFeature initial={rate} /></div></header>
    <section className="gold-page__body container" aria-labelledby="gold-table-title">
      <div className="gold-page__table"><h2 id="gold-table-title">Rates by karat</h2><GoldRates initial={rate} /></div>
      <div className="gold-page__calc"><GoldCalculator initial={rate} /></div>
    </section>
    <section className="gold-page__notes container" aria-labelledby="gold-notes-title">
      <h2 id="gold-notes-title">How to read these rates</h2>
      <ul>
        <li>The 24K figure is the international gold price converted to PKR. 22K, 21K and 18K are worked out from it by purity (22/24, 21/24, 18/24).</li>
        <li>A tola is 11.664 grams. 10-gram figures are shown because many bills use them.</li>
        <li>Bazaar and shop rates can differ from this reference. For a piece, ask the shop for a quotation.</li>
      </ul>
      <Link className="button button--gold" href="/designs" prefetch={false}>Browse the Design Vault</Link>
    </section>
  </main>;
}

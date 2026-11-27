import type { Metadata } from "next";
import { CatalogueHero } from "@/components/catalogue/catalogue-hero";
import { CatalogueBrowser } from "@/components/catalogue/catalogue-browser";
import { CollectionCards } from "@/components/catalogue/collection-cards";
import { categoryCounts, collections } from "@/lib/server/catalogue";
import { initialCatalogue, type PageQuery } from "@/lib/server/catalogue-page";
import { PageMotion } from "@/components/motion/page-motion";
import "../catalogue.css";

export const metadata: Metadata = { title: "The Design Vault", description: "A curated synthetic jewellery design library. Browse categories, styles and sample availability; not real shop inventory.", alternates: { canonical: "/designs" } };

export default async function DesignsPage({ searchParams }: { searchParams: Promise<PageQuery> }) {
  const initial = initialCatalogue(await searchParams);
  return <main id="main-content" className="catalogue-page"><PageMotion page="designs" /><CatalogueHero media={collections[0].hero} /><CatalogueBrowser {...initial} basePath="/designs" counts={categoryCounts} /><section className="catalogue-related container" aria-labelledby="edits-title"><div className="catalogue-related__heading"><div><p className="eyebrow">Another way to discover</p><h2 id="edits-title">The editorial <em>edits.</em></h2></div></div><CollectionCards collections={collections} compact /></section></main>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { collections } from "@/lib/server/catalogue";
import { CollectionChapters, type ChapterDesign } from "@/components/catalogue/collection-chapters";
import { sampleDesigns } from "@/data/demo/catalogue";
import { PageMotion } from "@/components/motion/page-motion";
import "../catalogue.css";

export const metadata: Metadata = { title: "Collections — Editorial Edits", description: "Original sample jewellery concepts, curated by mood and silhouette. Synthetic imagery, not actual shop collections.", alternates: { canonical: "/collections" } };

const designsByCollection: Record<string, ChapterDesign[]> = Object.fromEntries(collections.map((collection) => [collection.slug,
  sampleDesigns.filter((design) => design.publicationState === "PUBLISHED" && design.collectionSlugs.includes(collection.slug) && design.images[0])
    .map((design) => ({ slug: design.slug, title: design.title, thumbnail: design.images[0] }))]));

export default function CollectionsPage() {
  return <main id="main-content" className="catalogue-page"><PageMotion page="collections" /><header id="top" className="collections-index-heading collections-index-heading--vault" data-tone="dark"><div className="container"><nav aria-label="Breadcrumb"><Link href="/" prefetch={false}>Home</Link><span aria-hidden="true">/</span><span aria-current="page">Collections</span></nav><h1>Different moods.<br /><em>One enduring feeling.</em></h1><p>Follow a silhouette, a detail, an occasion. Four edits of the Design Vault, each with its own mood.</p></div></header><section className="collections-chapters" aria-label="Editorial collections"><CollectionChapters collections={collections} designs={designsByCollection} /></section><div className="catalogue-index-return container"><Link href="/designs" prefetch={false} className="button button--gold">Explore the entire Design Vault →</Link></div></main>;
}

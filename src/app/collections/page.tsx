import type { Metadata } from "next";
import Link from "next/link";
import { collections } from "@/lib/server/catalogue";
import { CollectionCards } from "@/components/catalogue/collection-cards";
import { catalogueDisclosure } from "@/config/catalogue";
import { PageMotion } from "@/components/motion/page-motion";
import "../catalogue.css";

export const metadata: Metadata = { title: "Collections — Editorial Edits", description: "Original sample jewellery concepts, curated by mood and silhouette. Synthetic imagery, not actual shop collections.", alternates: { canonical: "/collections" } };

export default function CollectionsPage() {
  return <main id="main-content" className="catalogue-page"><PageMotion page="collections" /><header id="top" className="collections-index-heading collections-index-heading--vault" data-tone="dark"><div className="container"><nav aria-label="Breadcrumb"><Link href="/" prefetch={false}>Home</Link><span aria-hidden="true">/</span><span aria-current="page">Collections</span></nav><h1>Different moods.<br /><em>One enduring feeling.</em></h1><p>Follow a silhouette, a detail, an occasion. Four editorial selections bring the sample Design Vault into focus.</p></div></header><div className="catalogue-disclosure container"><span aria-hidden="true">◇</span><p>{catalogueDisclosure}</p></div><section className="collections-index container" aria-label="Editorial collections"><CollectionCards collections={collections} /></section><div className="catalogue-index-return container"><Link href="/designs" prefetch={false} className="button button--gold">Explore the entire Design Vault →</Link></div></main>;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogueHero } from "@/components/catalogue/catalogue-hero";
import { CatalogueBrowser } from "@/components/catalogue/catalogue-browser";
import { countsForCollection, collections } from "@/lib/server/catalogue";
import { initialCatalogue, type PageQuery } from "@/lib/server/catalogue-page";
import "../../catalogue.css";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<PageQuery> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = collections.find((item) => item.slug === slug);
  return { title: collection?.title ?? "Collection not found", description: collection?.description, alternates: { canonical: `/collections/${encodeURIComponent(slug)}` } };
}
export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const collection = collections.find((item) => item.slug === slug);
  if (!collection) notFound();
  const initial = initialCatalogue(await searchParams, slug);
  return <main id="main-content" className="catalogue-page"><CatalogueHero media={collection.hero} collection={collection} /><CatalogueBrowser {...initial} basePath={`/collections/${slug}`} fixedCollection={slug} counts={countsForCollection(slug)} /></main>;
}

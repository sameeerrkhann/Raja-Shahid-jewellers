import Link from "next/link";
import { catalogueDisclosure } from "@/config/catalogue";
import { CatalogueImage } from "./catalogue-image";
import type { CatalogueCollection, CatalogueMedia } from "@/types/catalogue";

export function CatalogueHero({ media, collection }: { media: CatalogueMedia; collection?: CatalogueCollection }) {
  return <>
    <div id="top" className="catalogue-notice"><span>Royal Gold Atelier / The Design Vault</span><span>Customer-facing demo</span></div>
    <header data-tone={!collection || collection.tone !== "ivory" ? "dark" : "light"} className={`catalogue-hero ${collection ? `catalogue-hero--${collection.tone}` : "catalogue-hero--vault"}`}>
      <div className="container catalogue-hero__grid"><div className="catalogue-hero__copy"><nav aria-label="Breadcrumb"><Link href="/" prefetch={false}>Home</Link><span aria-hidden="true">/</span><Link href={collection ? "/collections" : "/designs"} prefetch={false}>{collection ? "Collections" : "Design Vault"}</Link>{collection && <><span aria-hidden="true">/</span><span aria-current="page">{collection.title}</span></>}</nav><h1>{collection ? collection.title : <>Find a piece.<br /><em>Find a feeling.</em></>}</h1><p>{collection ? collection.description : "A language of curves, light and possibility. Explore a considered selection of jewellery designs, each an invitation to imagine something personal."}</p><a href="#browse-title" className="text-link">Explore the selection <span aria-hidden="true">↓</span></a></div><div className="catalogue-hero__art"><span className="catalogue-hero__folio" aria-hidden="true">{collection ? "EDIT" : "RS"}</span><div className="catalogue-hero__image"><CatalogueImage media={media} sizes="(max-width: 767px) 75vw, 36vw" eager /></div><p>Original concept study <span>AI-generated / Not shop stock</span></p></div></div>
    </header><div className="catalogue-disclosure container"><span aria-hidden="true">◇</span><p>{catalogueDisclosure}</p></div>
  </>;
}

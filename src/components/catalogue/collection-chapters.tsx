import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { CatalogueCollection, CatalogueMedia } from "@/types/catalogue";
import { CatalogueImage } from "./catalogue-image";

export type ChapterDesign = { slug: string; title: string; thumbnail: CatalogueMedia };

/* Collections as full-height chapters. On wide screens each one is sticky, the next slides over it, and the one
   underneath settles back (page-motion.tsx). Every chapter shows its count and a few of its sample designs. */
export function CollectionChapters({ collections, designs }: { collections: CatalogueCollection[]; designs: Record<string, ChapterDesign[]> }) {
  return <div className="chapters">
    {collections.map((collection, index) => {
      const items = designs[collection.slug] ?? [];
      return <article className={`chapter chapter--${collection.tone}`} key={collection.id} style={{ zIndex: index + 1 }} aria-labelledby={`chapter-${collection.slug}`} data-chapter-card>
        <div className="chapter__inner">
          <div className="chapter__media" data-chapter-media><CatalogueImage media={collection.hero} sizes="(max-width: 860px) 92vw, 50vw" eager={index === 0} /></div>
          <div className="chapter__copy" data-chapter-copy>
            <p className="chapter__subtitle">{collection.subtitle}</p>
            <h2 id={`chapter-${collection.slug}`}>{collection.title}</h2>
            <p className="chapter__description">{collection.description}</p>
            {items.length > 0 && <ul className="chapter__designs" aria-label={`Designs in ${collection.title}`}>
              {items.slice(0, 3).map((design) => <li key={design.slug}><Link href={`/designs?q=${encodeURIComponent(design.title)}`} prefetch={false}><CatalogueImage media={design.thumbnail} sizes="120px" /><span>{design.title}</span></Link></li>)}
            </ul>}
            <div className="chapter__foot">
              <Link className="button button--gold" href={`/collections/${collection.slug}`} prefetch={false}>Open the collection <Icon name="arrow" /></Link>
              <span>{items.length} {items.length === 1 ? "design" : "designs"}</span>
            </div>
          </div>
        </div>
      </article>;
    })}
  </div>;
}

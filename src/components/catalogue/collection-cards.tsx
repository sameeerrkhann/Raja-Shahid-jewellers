import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { CatalogueCollection } from "@/types/catalogue";
import { CatalogueImage } from "./catalogue-image";

export function CollectionCards({ collections, compact = false }: { collections: CatalogueCollection[]; compact?: boolean }) {
  return <div className={`vault-collection-grid${compact ? " vault-collection-grid--compact" : ""}`}>{collections.map((collection, index) => <Link className={`vault-collection-card vault-collection-card--${collection.tone}`} href={`/collections/${collection.slug}`} prefetch={false} key={collection.id}><div className="vault-collection-card__image"><CatalogueImage media={collection.hero} sizes={compact ? "(max-width:767px) 42vw, 24vw" : "(max-width:767px) 90vw, 45vw"} /><span>0{index + 1} / An editorial selection</span></div><div className="vault-collection-card__copy"><p className="eyebrow">{collection.subtitle}</p><h2>{collection.title}</h2><p>{collection.description}</p><span className="text-link">Explore collection <Icon name="arrow" /></span><small>Synthetic concept imagery</small></div></Link>)}</div>;
}

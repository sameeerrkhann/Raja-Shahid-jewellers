// Homepage showcase projection. Pure and server-safe: reads the same SAMPLE fixtures as the Design Vault.
import { sampleDesigns, sampleStock } from "@/data/demo/catalogue";
import { displayStatus } from "@/lib/catalogue/domain";
import { categoryLabel, statusLabels } from "@/config/catalogue";

export type ShowcaseItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  status: string;
  small: string;
  large: string;
  alt: string;
  href: string;
};

// Necklaces and sets lead (the dramatic pieces), then bangles and rings alternate for rhythm.
const ORDER = ["RSJ-D001", "RSJ-D002", "RSJ-D003", "RSJ-D004", "RSJ-D010", "RSJ-D005", "RSJ-D007", "RSJ-D011", "RSJ-D006", "RSJ-D008", "RSJ-D009"];

export function showcaseItems(): ShowcaseItem[] {
  const published = sampleDesigns.filter((design) => design.publicationState === "PUBLISHED" && design.images.length);
  const rank = (code: string) => { const index = ORDER.indexOf(code); return index === -1 ? ORDER.length : index; };
  return [...published].sort((a, b) => rank(a.designCode) - rank(b.designCode)).map((design) => {
    const image = design.images[0];
    return {
      id: design.id,
      code: design.designCode,
      title: design.title,
      description: design.description,
      category: categoryLabel(design.categorySlug),
      subcategory: categoryLabel(design.subcategorySlug),
      status: statusLabels[displayStatus(design, sampleStock)],
      small: image.url.replace(/\.webp$/, "-480.webp"),
      large: image.url,
      alt: image.alt,
      href: `/designs?q=${encodeURIComponent(design.designCode)}`,
    };
  });
}

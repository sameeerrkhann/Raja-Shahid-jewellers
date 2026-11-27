import type { CatalogueCategory, DisplayStatus } from "@/types/catalogue";

const roots = [
  ["bridal", "Bridal", ["collars", "long-sets", "chokers", "layered-sets"]],
  ["rings", "Rings", ["floral-rings", "sculptural-rings", "lattice-rings", "signet-rings", "wrap-rings"]],
  ["bangles", "Bangles", ["cuffs", "karas", "bangle-pairs", "openwork-bangles"]],
  ["necklaces", "Necklaces", ["pendants", "torques", "floral-chains"]],
  ["earrings", "Earrings", ["jhumkas", "hoops", "drops", "studs"]],
  ["mens", "Men’s Jewellery", ["signets", "mens-karas", "chains", "bands"]],
] as const;
const titleCase = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
export const catalogueCategories: CatalogueCategory[] = roots.flatMap(([slug, label, children], index) => [
  { id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, slug, label, rank: index, parentId: null },
  ...children.map((child, childIndex) => ({ id: `21000000-0000-4000-8000-${String(index * 100 + childIndex + 1).padStart(12, "0")}`, slug: child, label: titleCase(child), rank: childIndex, parentId: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}` })),
]);
export const topCategories = catalogueCategories.filter((item) => !item.parentId);
export const styleOptions = ["floral", "heritage", "minimal", "sculptural", "geometric", "botanical"] as const;
export const occasionOptions = ["bridal", "celebration", "everyday", "gifting"] as const;
export const purityOptions = [18, 22] as const;
export const statusLabels: Record<DisplayStatus, string> = { IN_STOCK: "In Stock", MADE_TO_ORDER: "Available to Craft", CUSTOM_DESIGN: "Custom Enquiry Required", UNAVAILABLE: "Unavailable" };
export const catalogueNavigation = [{ label: "Design Vault", href: "/designs" }, { label: "Collections", href: "/collections" }, { label: "Gold rates", href: "/gold-rates" }, { label: "The story", href: "/#entrance" }, { label: "AURIA", href: "/#auria" }] as const;
export const catalogueDisclosure = "Synthetic demo catalogue. AI-generated concept imagery; sample availability is not real shop stock or a manufacturing promise.";
export function categoryLabel(slug: string) { return catalogueCategories.find((item) => item.slug === slug)?.label ?? slug; }

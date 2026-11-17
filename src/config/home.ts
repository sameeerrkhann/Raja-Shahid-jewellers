// Editorial category directions, not catalogue records or stock assertions.
export const homeCategories = [
  { id: "bridal", title: "Bridal", subtitle: "For a beautiful beginning", image: "/images/editorial/floral-necklace.jpg", study: "floral-study", medium: "Reference photograph" },
  { id: "rings", title: "Rings", subtitle: "A circle. An entire world.", illustration: "ring", medium: "Illustrated category study" },
  { id: "bangles", title: "Bangles", subtitle: "Grace, in every gesture", illustration: "bangle", medium: "Illustrated category study" },
  { id: "necklaces", title: "Necklaces", subtitle: "Something close to the heart", image: "/images/editorial/pendant-detail.jpg", study: "pendant-study", medium: "Reference photograph" },
  { id: "earrings", title: "Earrings", subtitle: "A quiet kind of radiance", image: "/images/editorial/drop-earrings.jpg", study: "earring-study", medium: "Reference photograph" },
  { id: "mens", title: "Men’s Jewellery", subtitle: "Character, without a word", illustration: "signet", medium: "Illustrated category study" },
] as const;

export const homeNavigation = [
  { label: "The craft", href: "/#craft" },
  { label: "Design Vault", href: "/designs" },
  { label: "Category directions", href: "/#vault" },
  { label: "Bridal heritage", href: "/#bridal" },
  { label: "AURIA", href: "/#auria" },
  { label: "Gold & value", href: "/#gold" },
] as const;

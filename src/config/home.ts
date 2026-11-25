// Editorial category directions, not catalogue records or stock assertions.
export const homeCategories = [
  { id: "bridal", title: "Bridal", subtitle: "For a beautiful beginning", image: "/images/editorial/bridal-set.webp", study: "floral-study", medium: "AI-generated image" },
  { id: "rings", title: "Rings", subtitle: "A circle. An entire world.", illustration: "ring", medium: "Illustrated category study" },
  { id: "bangles", title: "Bangles", subtitle: "Grace, in every gesture", illustration: "bangle", medium: "Illustrated category study" },
  { id: "necklaces", title: "Necklaces", subtitle: "Something close to the heart", image: "/images/editorial/rani-haar.webp", study: "pendant-study", medium: "AI-generated image" },
  { id: "earrings", title: "Earrings", subtitle: "A quiet kind of radiance", image: "/images/editorial/jhumkas.webp", study: "earring-study", medium: "AI-generated image" },
  { id: "mens", title: "Men’s Jewellery", subtitle: "Character, without a word", illustration: "signet", medium: "Illustrated category study" },
] as const;

export const homeNavigation = [
  { label: "Design Vault", href: "/designs" },
  { label: "Category directions", href: "/#vault" },
  { label: "See it on", href: "/#try-on" },
  { label: "Bridal", href: "/#bridal" },
  { label: "AURIA", href: "/#auria" },
  { label: "Gold & value", href: "/#gold" },
] as const;

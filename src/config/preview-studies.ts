export type ReferenceStudy = {
  id: string;
  title: string;
  category: string;
  image: string;
  alt: string;
  description: string;
  photographer: string;
  sourceUrl: string;
  position: string;
};

// Editorial images only (AI-generated): not catalogue records, stock or product specifications.
export const referenceStudies: readonly ReferenceStudy[] = [
  {
    id: "floral-study",
    title: "An ode to ornament",
    category: "The bridal study",
    image: "/images/editorial/bridal-set.webp",
    alt: "AI-generated image of a gold bridal necklace set with jhumkas on a charcoal velvet bust",
    description: "A study in ornament, layered silhouettes and the warmth of gold. An AI-generated image: it does not establish materials, purity or availability.",
    photographer: "Figma AI",
    sourceUrl: "",
    position: "50% 50%",
  },
  {
    id: "pendant-study",
    title: "A little extraordinary",
    category: "The necklace study",
    image: "/images/editorial/rani-haar.webp",
    alt: "AI-generated image of a long layered gold necklace draped over charcoal silk",
    description: "Small details, considered closely. An AI-generated image for the visual language, not a design manufactured or stocked by Raja Shahid Jewellers.",
    photographer: "Figma AI",
    sourceUrl: "",
    position: "50% 48%",
  },
  {
    id: "earring-study",
    title: "Light, beautifully held",
    category: "The earring study",
    image: "/images/editorial/jhumkas.webp",
    alt: "AI-generated image of a pair of gold jhumka earrings on a dark display stand",
    description: "An exploration of balance, light and movement. An AI-generated image; metal purity and finish are illustrative.",
    photographer: "Figma AI",
    sourceUrl: "",
    position: "50% 50%",
  },
];

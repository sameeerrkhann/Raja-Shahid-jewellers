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

// Editorial references only: not catalogue records, stock or product specifications.
export const referenceStudies: readonly ReferenceStudy[] = [
  {
    id: "floral-study",
    title: "An ode to ornament",
    category: "The necklace study",
    image: "/images/editorial/floral-necklace.jpg",
    alt: "Ornate necklace with violet-toned accents photographed against a dark surface",
    description: "A study in floral rhythm, intricate silhouettes and the warmth of gold tones. Reference photography does not establish materials, purity or availability.",
    photographer: "Vaibhav Nagare",
    sourceUrl: "https://unsplash.com/photos/gold-and-silver-beaded-necklace-62sDgpfljOI",
    position: "50% 50%",
  },
  {
    id: "pendant-study",
    title: "A little extraordinary",
    category: "The pendant study",
    image: "/images/editorial/pendant-detail.jpg",
    alt: "Detailed circular pendant and beaded necklace in warm metallic tones",
    description: "Small details, considered closely. An editorial reference for the visual language, not a design manufactured or stocked by Raja Shahid Jewellers.",
    photographer: "Vaibhav Nagare",
    sourceUrl: "https://unsplash.com/photos/gold-and-silver-beaded-necklace-VUwYKqNB3-s",
    position: "50% 48%",
  },
  {
    id: "earring-study",
    title: "Light, beautifully held",
    category: "The earring study",
    image: "/images/editorial/drop-earrings.jpg",
    alt: "Pair of round stud earrings with pale stones and warm metallic detailing, resting on a hand",
    description: "An exploration of balance, light and a circular silhouette. Photography is licensed for the preview; gemstone identity and metal purity are unverified.",
    photographer: "PRAHANT STUDIO",
    sourceUrl: "https://unsplash.com/photos/a-pair-of-gold-and-diamond-earrings-Eko2hYivl-s",
    position: "50% 50%",
  },
];

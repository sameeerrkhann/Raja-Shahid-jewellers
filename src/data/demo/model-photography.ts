// Reference model photography for the design demo. These are free stock photographs from Pexels
// (Pexels License: free to use, commercial use allowed, attribution not required but given here).
// They show people wearing jewellery that is NOT from Raja Shahid Jewellers: label them as reference
// photography on the site and replace them with the shop's own photographs before launch.
export type ModelPhoto = { id: string; audience: "women" | "men"; small: string; large: string; width: number; height: number; alt: string; photographer: string; source: string };

const photo = (id: string, audience: ModelPhoto["audience"], height: number, alt: string, photographer: string, source: string): ModelPhoto =>
  ({ id, audience, small: `/images/models/${id}-640.webp`, large: `/images/models/${id}-1200.webp`, width: 1200, height, alt, photographer, source });

export const modelPhotography: ModelPhoto[] = [
  photo("women-bride-portrait", "women", 1432, "A bride in a gold maang tikka, jhumkas and a layered gold necklace, eyes lowered", "Prajakt Rebeloma", "https://www.pexels.com/photo/woman-wearing-gold-accessories-3221176/"),
  photo("women-choker-closeup", "women", 1698, "Close view of a gold bead choker with an emerald centre, worn with matching earrings", "Arif khan", "https://www.pexels.com/photo/golden-necklace-and-earring-on-woman-17298688/"),
  photo("women-bride-red", "women", 1800, "A bride in a red lehenga with a gold necklace set, bangles and a maang tikka", "aman ajimal", "https://www.pexels.com/photo/photo-of-a-woman-wearing-red-and-gold-traditional-clothes-10214422/"),
  photo("men-suit-watch", "men", 1800, "A man in a black suit wearing a gold watch and a fine gold chain", "Jozef Fusung", "https://www.pexels.com/photo/fashion-man-people-woman-4165197/"),
  photo("men-blazer-chain", "men", 1800, "A man in an open brown blazer wearing a gold chain", "_brunovisual", "https://www.pexels.com/photo/confident-young-man-with-curly-hair-and-gold-chain-28424543/"),
  photo("men-fedora-chain", "men", 1812, "A man in a black fedora and blazer holding a long gold chain", "Frank K", "https://www.pexels.com/photo/man-in-black-blazer-and-black-hat-holding-his-gold-necklace-1851252/"),
];

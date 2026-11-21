/* The homepage showcase: which sample designs appear, where the camera dives into each one,
   and what the notes point at. Notes describe only what is visible in the concept image. */

export type ShowcaseNote = { x: number; y: number; side: "left" | "right"; title: string; text: string };
export type ShowcaseEntry = { code: string; kind: string; focus: { x: number; y: number }; notes: ShowcaseNote[] };

export const ringFilm = {
  frames: 95,
  desktop: (index: number) => `/images/hero/ring/r${String(index + 1).padStart(3, "0")}.webp`,
  mobile: (index: number) => `/images/hero/ring/m${String(index + 1).padStart(3, "0")}.webp`,
  label: "Concept video made with Google Flow. Not shop stock.",
};

export const showcase: ShowcaseEntry[] = [
  { code: "RSJ-D001", kind: "Bridal collar", focus: { x: 50, y: 62 }, notes: [
    { x: 50, y: 60, side: "right", title: "Floral relief", text: "Petals and leaves raised across the front." },
    { x: 24, y: 70, side: "left", title: "Scalloped edge", text: "Half-moon scallops beaded along the lower edge." },
    { x: 47, y: 12, side: "right", title: "Hook clasp", text: "A simple hook closure at the nape." },
  ] },
  { code: "RSJ-D002", kind: "Bridal long set", focus: { x: 52, y: 76 }, notes: [
    { x: 52, y: 75, side: "right", title: "Three medallions", text: "Graduated crescents, one below the other." },
    { x: 24, y: 32, side: "left", title: "Floral links", text: "A long trail of small floral links." },
  ] },
  { code: "RSJ-D005", kind: "Floral ring", focus: { x: 47, y: 32 }, notes: [
    { x: 44, y: 22, side: "left", title: "Five petals", text: "Softly sculpted, each with its own curve." },
    { x: 49, y: 33, side: "right", title: "Polished centre", text: "A round bead where the petals meet." },
    { x: 70, y: 70, side: "right", title: "Fine band", text: "A slim band below the flower." },
  ] },
  { code: "RSJ-D007", kind: "Lattice ring", focus: { x: 48, y: 32 }, notes: [
    { x: 48, y: 32, side: "right", title: "Openwork arch", text: "Elongated diamonds in an arched window." },
    { x: 49, y: 13, side: "left", title: "Pointed top", text: "The arch rises to a point." },
    { x: 30, y: 74, side: "left", title: "Slim band", text: "A plain band beneath the arch." },
  ] },
  { code: "RSJ-D011", kind: "Kada", focus: { x: 48, y: 56 }, notes: [
    { x: 50, y: 56, side: "right", title: "Lotus motifs", text: "Raised lotus petals repeat around the kada." },
    { x: 30, y: 40, side: "left", title: "Beaded border", text: "A fine row of beads along each edge." },
  ] },
];

/* See it on. Reference photographs of people wearing jewellery (Pexels, credited). Each spot is where a
   piece sits in the photo (x, y in % of the photo); choosing it moves the camera there. The pieces in these
   photos are not shop stock; each spot links to the matching search in the Design Vault. Swap in the shop's
   own shoot (or Google Flow photos of the actual pieces) by changing src, size and spots. */
export type Wearer = "women" | "men";
export type WornSpot = { name: string; x: number; y: number; zoom: number; search: string; vault: string };
export type WornLook = { id: string; title: string; src: string; thumb: string; width: number; height: number; alt: string; credit: string; spots: WornSpot[] };

const look = (id: string, title: string, size: [number, number], alt: string, credit: string, spots: WornSpot[]): WornLook =>
  ({ id, title, src: `/images/models/${id}-1200.webp`, thumb: `/images/models/${id}-640.webp`, width: size[0], height: size[1], alt, credit, spots });

export const wornLooks: Record<Wearer, WornLook[]> = {
  women: [
    look("women-bride-red", "Wedding day", [1200, 1800], "A bride in red wearing a gold necklace set, maang tikka and bangles", "aman ajimal", [
      { name: "Maang tikka", x: 51, y: 8, zoom: 3, search: "tikka", vault: "Tikkas" },
      { name: "Necklace set", x: 52, y: 30, zoom: 2.4, search: "necklace", vault: "Necklaces and sets" },
      { name: "Bangles", x: 21, y: 48, zoom: 2.8, search: "bangle", vault: "Bangles and karas" },
    ]),
    look("women-bride-portrait", "Bridal portrait", [1200, 1432], "A bride wearing a maang tikka, jhumkas and a layered necklace", "Prajakt Rebeloma", [
      { name: "Maang tikka", x: 46, y: 21, zoom: 2.8, search: "tikka", vault: "Tikkas" },
      { name: "Jhumkas", x: 30, y: 63, zoom: 3, search: "jhumka", vault: "Earrings and jhumkas" },
      { name: "Layered necklace", x: 58, y: 88, zoom: 2.4, search: "necklace", vault: "Necklaces and sets" },
    ]),
    look("women-choker-closeup", "Evening choker", [1200, 1698], "A close portrait of a woman wearing a beaded choker and earrings", "Arif khan", [
      { name: "Choker", x: 74, y: 55, zoom: 2.4, search: "choker", vault: "Necklaces and sets" },
      { name: "Earrings", x: 62, y: 21, zoom: 3, search: "earring", vault: "Earrings and jhumkas" },
    ]),
  ],
  men: [
    look("men-suit-watch", "Formal", [1200, 1800], "A man in a suit wearing a watch and a fine chain", "Jozef Fusung", [
      { name: "Watch", x: 56, y: 58, zoom: 3, search: "men", vault: "Men's jewellery" },
      { name: "Fine chain", x: 47, y: 45, zoom: 3, search: "chain", vault: "Chains" },
    ]),
    look("men-blazer-chain", "Everyday chain", [1200, 1800], "A man in a blazer wearing a gold chain", "_brunovisual", [
      { name: "Gold chain", x: 50, y: 37, zoom: 2.6, search: "chain", vault: "Chains" },
    ]),
    look("men-fedora-chain", "Statement chain", [1200, 1812], "A man in a fedora wearing a long gold chain", "Frank K", [
      { name: "Long chain", x: 46, y: 71, zoom: 2.6, search: "chain", vault: "Chains" },
    ]),
  ],
};

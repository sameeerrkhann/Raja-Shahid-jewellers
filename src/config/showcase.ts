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

/* Try it on. One photograph per audience; each product has the place it is worn. Where a piece is
   placed on the photo (x, y, w in % of the photo; r in degrees) and where the camera focuses.
   `overlay: true` composites the cut-out piece (current photos show no jewellery). When the Google Flow
   photos that already show each piece arrive, set overlay to false and point x/y at the worn piece. */
export type Wearer = "women" | "men";
export type TryOnSlot = "neck" | "long" | "finger" | "wrist" | "ears" | "forehead";
export type TryOnPlacement = { x: number; y: number; w: number; r?: number; zoom: number };

export const tryOnPhotos: Record<Wearer, { src: string; front?: string; alt: string; overlay: boolean }> = {
  women: { src: "/images/models/tryon/woman.webp", front: "/images/models/tryon/woman-hand.webp", alt: "AI-generated model, a woman in a maroon off-shoulder top", overlay: true },
  men: { src: "/images/models/tryon/man.webp", alt: "AI-generated model, a man in a black kurta", overlay: true },
};

export const tryOnSlots: Record<Wearer, Partial<Record<TryOnSlot, TryOnPlacement>>> = {
  women: { neck: { x: 50, y: 59, w: 36, zoom: 1.9 }, long: { x: 50.5, y: 63, w: 28, zoom: 1.7 }, finger: { x: 40, y: 51.5, w: 7, r: -18, zoom: 3.2 }, wrist: { x: 25.5, y: 67, w: 15, r: 4, zoom: 2.6 } },
  men: { finger: { x: 58.5, y: 75, w: 6.5, r: 28, zoom: 3.2 }, wrist: { x: 38, y: 86, w: 15, r: -32, zoom: 2.4 } },
};

export const tryOnCatalogue: { code: string; slot: TryOnSlot; wearers: Wearer[] }[] = [
  { code: "RSJ-D001", slot: "neck", wearers: ["women"] },
  { code: "RSJ-D002", slot: "long", wearers: ["women"] },
  { code: "RSJ-D003", slot: "neck", wearers: ["women"] },
  { code: "RSJ-D004", slot: "long", wearers: ["women"] },
  { code: "RSJ-D005", slot: "finger", wearers: ["women"] },
  { code: "RSJ-D006", slot: "finger", wearers: ["women", "men"] },
  { code: "RSJ-D007", slot: "finger", wearers: ["women"] },
  { code: "RSJ-D008", slot: "finger", wearers: ["women", "men"] },
  { code: "RSJ-D009", slot: "finger", wearers: ["women"] },
  { code: "RSJ-D010", slot: "wrist", wearers: ["women", "men"] },
  { code: "RSJ-D011", slot: "wrist", wearers: ["women", "men"] },
];

export const tryOnComing: Record<Wearer, string[]> = { women: ["Tikkas", "Earrings and jhumkas"], men: ["Chains", "Men's karas", "Watches"] };

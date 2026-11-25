/* The homepage showcase: which sample designs appear, where the camera dives into each one,
   and what the notes point at. Notes describe only what is visible in the concept image. */

export type ShowcaseNote = { x: number; y: number; side: "left" | "right"; title: string; text: string };
export type ShowcaseEntry = { code: string; kind: string; focus: { x: number; y: number }; notes: ShowcaseNote[] };

/* Hero film: the vault descent and the unveiling. Two Google Flow shots joined frame to frame and graded with
   scripts/hero-film-grade.py; scrubbed by scroll as a frame sequence. Each segment folder holds r### (desktop)
   and m### (mobile) frames. Chapters are caption bands over frame ranges of the whole chain; each band has its
   own entrance, echoing what the footage does at that moment, and its own scrim placement. */
export type FilmSegment = { dir: string; frames: number };
export type FilmChapter = { id: string; label: string; from: number; to: number; place: "center" | "left" | "split"; entrance: "drift" | "punch" | "blur" | "rise"; eyebrow?: string; title?: string; body?: string };
const segments: FilmSegment[] = [
  { dir: "/images/hero/vault", frames: 190 },
];
const total = segments.reduce((sum, segment) => sum + segment.frames, 0);
const frameAt = (index: number, kind: "r" | "m") => {
  let i = Math.max(0, Math.min(total - 1, index));
  for (const segment of segments) { if (i < segment.frames) return `${segment.dir}/${kind}${String(i + 1).padStart(3, "0")}.webp`; i -= segment.frames; }
  return "";
};
export const heroFilm = {
  frames: total,
  segments,
  desktop: (index: number) => frameAt(index, "r"),
  mobile: (index: number) => frameAt(index, "m"),
  /* Scroll distance per frame (px): about 2,700px for the 16 second film, so it moves at normal scroll speed and each band still holds through a few flicks. */
  scrollPerFrame: 14,
  chapters: [
    { id: "descent", label: "Descent", from: 0, to: 30, place: "center", entrance: "drift" },
    { id: "light", label: "Light", from: 30, to: 70, place: "center", entrance: "punch", title: "Gold, in every sense." },
    { id: "promise", label: "Promise", from: 70, to: 124, place: "left", entrance: "blur", eyebrow: "Bridal", title: "Every set begins as a promise.", body: "Keep scrolling. The silk comes down." },
    { id: "unveiled", label: "Unveiled", from: 124, to: 190, place: "split", entrance: "rise", eyebrow: "The Design Vault", title: "Bridal gold, unveiled.", body: "Sample designs to browse, compare and ask about." },
  ] as FilmChapter[],
  label: "Concept film made with Google Flow. Not shop stock.",
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

export type Wearer = "women" | "men";
export type WornSpot = { name: string; note: string; x: number; y: number; zoom: number; search: string; vault: string };
export type Model = { src: string; width: number; height: number; alt: string; spots: WornSpot[] };
/* See it on: one AI-generated model each, wearing every kind of piece we show. Spots are % of the photograph. */
export const models: Record<Wearer, Model> = {
  women: { src: "/images/models/rsj-woman.webp", width: 1024, height: 1536,
    alt: "AI-generated model in a maroon lehenga wearing a gold maang tikka, jhumkas, a layered necklace set, bangles and rings",
    spots: [
      { name: "Maang tikka", note: "Sits at the parting", x: 43.3, y: 6.8, zoom: 3.2, search: "tikka", vault: "tikkas" },
      { name: "Jhumkas", note: "Frames the face", x: 53.6, y: 13.4, zoom: 3, search: "jhumka", vault: "earrings" },
      { name: "Choker", note: "Close at the collarbone", x: 51.2, y: 18.4, zoom: 2.8, search: "choker", vault: "chokers" },
      { name: "Rani haar", note: "Falls to the waist", x: 45.9, y: 27.3, zoom: 2.4, search: "necklace", vault: "necklace sets" },
      { name: "Bangles", note: "Stacked on both wrists", x: 35, y: 27.6, zoom: 3, search: "bangle", vault: "bangles" },
      { name: "Rings", note: "Worn with the set", x: 40.2, y: 19.9, zoom: 3.4, search: "ring", vault: "rings" },
    ] },
  men: { src: "/images/models/rsj-man.webp", width: 1024, height: 1536,
    alt: "AI-generated model in a black kurta and waistcoat wearing a gold chain, a gold watch, a gold kada and a gold ring",
    spots: [
      { name: "Gold chain", note: "Fine, at the open collar", x: 50.3, y: 22.3, zoom: 3, search: "chain", vault: "chains" },
      { name: "Watch", note: "Gold on the left wrist", x: 57.8, y: 38.7, zoom: 3.2, search: "men", vault: "men's pieces" },
      { name: "Signet ring", note: "One bold ring", x: 49.2, y: 40.7, zoom: 3.6, search: "ring", vault: "rings" },
      { name: "Kada", note: "Solid, on the right wrist", x: 34.7, y: 46.9, zoom: 3.2, search: "kada", vault: "kadas" },
    ] },
};

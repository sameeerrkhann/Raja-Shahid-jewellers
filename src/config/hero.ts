// The piece the homepage hero assembles. To feature another design, change `designCode`, supply a
// transparent cut-out of its catalogue image (same square framing, 640 and 960px WebP) and re-plot
// the notes: x/y are percentages of that square, `labelY` is where the label sits beside it.
// Notes must describe only what is visible in the image; sales facts come from the catalogue record.
export type HeroNote = { id: string; x: number; y: number; side: "left" | "right"; labelY: number; title: string; text: string };

export const heroPiece = {
  designCode: "RSJ-D001",
  cutout: { small: "/images/hero/mehr-collar-640.webp", large: "/images/hero/mehr-collar-960.webp" },
  alt: "Mehr Crescent Collar: a wide gold collar of floral filigree with a scalloped, beaded edge",
  notes: [
    { id: "clasp", x: 50, y: 11, side: "right", labelY: 12, title: "Hook clasp", text: "A simple hook closure at the nape." },
    { id: "crescent", x: 91, y: 47, side: "right", labelY: 47, title: "Crescent silhouette", text: "Widest at the front, tapering to a fine chain." },
    { id: "relief", x: 44, y: 63, side: "left", labelY: 56, title: "Floral relief", text: "Petals and leaves raised across the front." },
    { id: "edge", x: 27, y: 73, side: "left", labelY: 80, title: "Scalloped edge", text: "Half-moon scallops beaded along the lower edge." },
  ] satisfies HeroNote[],
} as const;

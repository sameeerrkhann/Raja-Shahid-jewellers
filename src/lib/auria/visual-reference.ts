import { z } from "zod";
import type { DesignCardData } from "@/types/catalogue";

export const maxReferenceBytes = 1_048_576;
export const maxReferenceEdge = 1024;

const categories = ["ring", "bangle", "necklace", "earrings", "bridal-set", "unclear"] as const;
const tones = ["yellow", "white", "rose", "mixed", "unclear"] as const;
const stones = ["clear", "red", "green", "blue", "pink", "purple", "black", "pearl-like", "none visible", "unclear"] as const;
const shapes = ["round", "oval", "square", "pear", "marquise", "geometric", "unclear"] as const;
const features = ["floral", "filigree", "halo", "solitaire", "layered", "chain", "choker", "drop", "hoop", "engraved", "beaded", "minimal", "geometric", "sculptural"] as const;

// Restrict the model to visible characteristics and a bounded vocabulary.
export const visualObservation = z.strictObject({
  type: z.enum(categories),
  tone: z.enum(tones),
  stones: z.array(z.enum(stones)).max(4),
  shapes: z.array(z.enum(shapes)).max(3),
  features: z.array(z.enum(features)).max(6),
});
export type VisualObservation = z.infer<typeof visualObservation>;
export type VisualReferenceResult = { observation: VisualObservation; matches: DesignCardData[] };

export function describeObservation(value: VisualObservation) {
  const label = value.type === "unclear" ? "Jewellery type unclear" : value.type.replace("-", " ");
  return [
    label,
    value.tone !== "unclear" ? `${value.tone} metal appearance` : "",
    value.stones.length ? `stone appearance: ${value.stones.join(", ")}` : "",
    value.shapes.length ? `shapes: ${value.shapes.join(", ")}` : "",
    value.features.length ? `details: ${value.features.join(", ")}` : "",
  ].filter(Boolean).join(" · ");
}

const groups: Record<Exclude<VisualObservation["type"], "unclear">, readonly string[]> = {
  ring: ["rings", "mens"],
  bangle: ["bangles"],
  necklace: ["necklaces", "bridal"],
  earrings: ["earrings"],
  "bridal-set": ["bridal"],
};
const featureKeywords: Partial<Record<VisualObservation["features"][number], string>> = {
  filigree: "filigree|lattice|openwork",
  minimal: "minimal|delicate|simple|slim",
  floral: "floral|flower|petal|rosette",
  layered: "layered|tiered|multi strand",
  drop: "drop|dangl|jhumka",
  geometric: "geometric|angular|hexagon|square|lattice|diamond pattern|jali",
};

export function rankVisualMatches(value: VisualObservation, cards: DesignCardData[]): DesignCardData[] {
  if (value.type === "unclear") return [];
  const categoriesForImage = groups[value.type];
  return cards.flatMap((card) => {
    const group = categoriesForImage.indexOf(card.categorySlug);
    if (group < 0 || (card.categorySlug === "mens" && !card.subcategorySlug.includes("rings"))) return [];
    const catalogueText = [card.title, card.description, card.subcategorySlug].join(" ").toLowerCase().replaceAll("-", " ");
    const featureScore = value.features.reduce((score, feature) => score + (new RegExp(featureKeywords[feature] ?? feature).test(catalogueText) ? 3 : 0), 0);
    const shapeScore = value.shapes.filter((shape) => shape !== "unclear" && catalogueText.includes(shape)).length;
    return [{ card, score: 3 - group + featureScore + shapeScore }];
  }).sort((a, b) => b.score - a.score).slice(0, 3).map(({ card }) => card);
}

// Read the encoded dimensions before transmitting the image. The browser emits baseline JPEG.
export function referenceJpegSize(bytes: Uint8Array) {
  if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return null;
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 2; offset + 8 < bytes.length;) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) return null;
    const length = data.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length) return null;
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (length < 8) return null;
      return { height: data.getUint16(offset + 5), width: data.getUint16(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

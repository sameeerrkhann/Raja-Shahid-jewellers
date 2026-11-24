import { z } from "zod";
import type { DesignCardData } from "@/types/catalogue";

const categories = ["ring", "bangle", "bracelet", "necklace", "pendant", "earrings", "bridal-set", "other jewellery", "not jewellery", "unclear"] as const;
const tones = ["yellow", "white", "rose", "mixed", "unclear"] as const;
const stones = ["clear", "red", "green", "blue", "pink", "purple", "black", "pearl-like", "none visible", "unclear"] as const;
const shapes = ["round", "oval", "square", "pear", "marquise", "geometric", "arch", "crescent", "wave", "organic", "unclear"] as const;
const settings = ["prong", "bezel", "channel", "pavé", "cluster", "flush", "unclear"] as const;
const patterns = ["openwork", "floral", "beaded", "twisted", "engraved", "smooth", "faceted", "textured"] as const;
const features = ["floral", "filigree", "halo", "solitaire", "layered", "chain", "choker", "drop", "hoop", "engraved", "beaded", "minimal", "geometric", "sculptural"] as const;

// Restrict the model to visible characteristics and a bounded vocabulary.
export const visualObservation = z.strictObject({
  type: z.enum(categories),
  tone: z.enum(tones),
  stones: z.array(z.enum(stones)).max(4),
  shapes: z.array(z.enum(shapes)).max(3),
  settings: z.array(z.enum(settings)).max(3).optional(),
  patterns: z.array(z.enum(patterns)).max(4).optional(),
  features: z.array(z.enum(features)).max(6),
});
export type VisualObservation = z.infer<typeof visualObservation>;
export type VisualReferenceResult = { observation: VisualObservation; matches: DesignCardData[]; reasons?: Record<string, string[]> };

export function describeObservation(value: VisualObservation) {
  const label = value.type === "unclear" ? "Jewellery type unclear" : value.type.replace("-", " ");
  return [
    label,
    value.tone !== "unclear" ? `${value.tone} metal appearance` : "",
    value.stones.length ? `stone appearance: ${value.stones.join(", ")}` : "",
    value.shapes.length ? `shapes: ${value.shapes.join(", ")}` : "",
    value.settings?.length ? `setting appearance: ${value.settings.join(", ")}` : "",
    value.patterns?.length ? `patterns: ${value.patterns.join(", ")}` : "",
    value.features.length ? `details: ${value.features.join(", ")}` : "",
  ].filter(Boolean).join(" · ");
}

const groups: Partial<Record<VisualObservation["type"], readonly string[]>> = {
  ring: ["rings", "mens"],
  bangle: ["bangles"],
  bracelet: ["bangles"],
  necklace: ["necklaces", "bridal"],
  pendant: ["necklaces"],
  earrings: ["earrings"],
  "bridal-set": ["bridal"],
};
const terms: Record<string, string> = {
  arch: "arch(?:ed)?",
  round: "round|circular",
  pear: "pear|teardrop",
  wave: "wave|undulating",
  organic: "organic|botanical|veined",
  openwork: "openwork|lattice|jali|filigree",
  filigree: "openwork|lattice|jali|filigree",
  minimal: "minimal|delicate|simple|restrained|slim",
  floral: "floral|flower|petals?|rosette|lotus|jasmine",
  layered: "layered|tiered|graduated|multi strand",
  drop: "drops?|dangl\\w*|jhumkas?",
  geometric: "geometric|angular|hexagon|square|lattice|openwork",
  textured: "textured|brushed|ribbed|satin",
  "pearl-like": "pearls?|pearl like",
  pavé: "pavé|pave",
};
function catalogueMentions(text: string, trait: string) {
  return trait !== "unclear" && new RegExp(`(?:^|[^a-z])(?:${terms[trait] ?? trait})(?:$|[^a-z])`, "i").test(text);
}

/** Rank within catalogue taxonomy using supported appearance cues. Numerical weights are internal ordering only. */
export function rankVisualMatches(value: VisualObservation, cards: DesignCardData[]) {
  const categoriesForImage = groups[value.type] ?? [];
  const candidates = cards.flatMap((card) => {
    const group = categoriesForImage.indexOf(card.categorySlug);
    if (group < 0 || (card.categorySlug === "mens" && !card.subcategorySlug.includes("rings"))) return [];
    if (value.type === "pendant" && card.subcategorySlug !== "pendants") return [];
    const appearance = [card.title, card.description, card.subcategorySlug].join(" ").replaceAll("-", " ");
    const cues = new Map<string, { label: string; weight: number }>();
    const addCue = (trait: string, label: string, weight: number) => {
      const key = trait === "filigree" ? "openwork" : trait;
      if (!cues.has(key)) cues.set(key, { label, weight });
    };
    for (const shape of value.shapes) if (catalogueMentions(appearance, shape)) addCue(shape, `${shape} shape`, 3);
    for (const setting of value.settings ?? []) if (catalogueMentions(card.description, setting)) addCue(setting, `${setting} setting described`, 4);
    for (const pattern of value.patterns ?? []) if (catalogueMentions(appearance, pattern)) addCue(pattern, `${pattern} pattern`, 4);
    for (const feature of value.features) if (catalogueMentions(appearance, feature)) addCue(feature, feature === "filigree" ? "openwork detail" : `${feature} detail`, 2);
    for (const stone of value.stones) {
      // A colour word or a diamond-shaped lattice does not establish a stone.
      const described = stone === "pearl-like" ? catalogueMentions(card.description, stone)
        : /^(clear|red|green|blue|pink|purple|black)$/.test(stone) && new RegExp(`\\b${stone}[- ](?:colou?red )?(?:stones?|gems?|crystals?)\\b`, "i").test(card.description);
      if (described) addCue(stone, `${stone} stone appearance described`, 3);
    }
    const labels = [...cues.values()].sort((a, b) => b.weight - a.weight);
    return [{ card, group, score: 4 - group + labels.reduce((score, cue) => score + cue.weight, 0), labels }];
  }).sort((a, b) => b.score - a.score || a.group - b.group).slice(0, 3);
  return {
    matches: candidates.map(({ card }) => card),
    reasons: Object.fromEntries(candidates.map(({ card, labels, group }) => [card.id, labels.length
      ? labels.slice(0, 3).map(({ label }) => label)
      : [group || value.type === "bracelet" ? "Related catalogue category" : "Same jewellery category"]])) as Record<string, string[]>,
  };
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

import type { CatalogueResult } from "@/types/catalogue";
import { maxReferenceBytes, maxReferenceEdge } from "./reference-limits";

const allowed = ["image/jpeg", "image/png", "image/webp"];
const limit = 5 * 1024 * 1024;

export async function validateReference(file: File) {
  if (!allowed.includes(file.type)) throw new Error("Choose a JPEG, PNG or WebP image.");
  if (!file.size || file.size > limit) throw new Error("Choose a non-empty image up to 5 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const matches = (signature: number[], offset = 0) => signature.every((byte, i) => bytes[offset + i] === byte);
  const realType = matches([255, 216, 255]) ? "image/jpeg" : matches([137, 80, 78, 71, 13, 10, 26, 10]) ? "image/png" : matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8) ? "image/webp" : null;
  if (file.type !== realType) throw new Error("The image format could not be verified. Export a new JPEG, PNG or WebP.");
}

export async function prepareReferenceJpeg(source: Blob) {
  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.min(1, maxReferenceEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Photo preparation is unavailable in this browser.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .8));
    if (result?.type !== "image/jpeg" || result.size > maxReferenceBytes) throw new Error("This photo could not be prepared. Try a smaller image.");
    return result;
  } finally { bitmap.close(); }
}

export type ImageColors = readonly [red: number, green: number, blue: number, contrast: number];
export async function sampleColors(source: Blob): Promise<ImageColors> {
  const bitmap = await createImageBitmap(source, { resizeWidth: 32, resizeHeight: 32, resizeQuality: "medium" });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image sampling is unavailable in this browser.");
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(4, 4, 24, 24).data;
    let red = 0, green = 0, blue = 0, spread = 0, count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) continue;
      red += pixels[i]; green += pixels[i + 1]; blue += pixels[i + 2];
      const light = .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
      spread += light * light;
      count++;
    }
    if (!count) throw new Error("The image is transparent in the center. Try another photo.");
    const mean = (.2126 * red + .7152 * green + .0722 * blue) / count;
    return [Math.round(red / count), Math.round(green / count), Math.round(blue / count), Math.sqrt(Math.max(0, spread / count - mean * mean))];
  } finally {
    bitmap.close();
  }
}
export function paletteDistance(a: ImageColors, b: ImageColors) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], 1.3 * (a[3] - b[3]));
}

// Measured with sampleColors from the public rsj-synthetic-v1 thumbnails.
// A later dataset version samples its own images on demand.
const samplePalettes: Readonly<Record<string, ImageColors>> = {
  "/images/catalogue/design-001.webp": [204, 164, 118, 33.28],
  "/images/catalogue/design-002.webp": [222, 193, 158, 20.89],
  "/images/catalogue/design-003.webp": [220, 184, 141, 16.78],
  "/images/catalogue/design-004.webp": [226, 197, 163, 13.96],
  "/images/catalogue/design-005.webp": [217, 187, 150, 21.11],
  "/images/catalogue/design-006.webp": [207, 173, 131, 31.82],
  "/images/catalogue/design-007.webp": [218, 186, 144, 17.31],
  "/images/catalogue/design-008.webp": [211, 185, 156, 17.02],
  "/images/catalogue/design-009.webp": [218, 191, 159, 14.66],
  "/images/catalogue/design-010.webp": [209, 177, 137, 27.86],
  "/images/catalogue/design-011.webp": [208, 167, 117, 35.78],
};

export async function cataloguePalettes(catalogue: CatalogueResult, signal: AbortSignal) {
  const palettes = new Map<string, ImageColors>();
  const missing = catalogue.items.filter((card) => {
    const palette = catalogue.datasetVersion === "rsj-synthetic-v1" ? samplePalettes[card.thumbnail.url] : undefined;
    if (palette) palettes.set(card.id, palette);
    return !palette;
  });
  for (let i = 0; i < missing.length; i += 3) {
    signal.throwIfAborted();
    await Promise.allSettled(missing.slice(i, i + 3).map(async (card) => {
      // Only same-origin catalogue artwork is fetched during local processing.
      const url = new URL(card.thumbnail.url, location.origin);
      if (url.origin !== location.origin) return;
      const image = await fetch(url, { signal });
      if (image.ok) palettes.set(card.id, await sampleColors(await image.blob()));
    }));
  }
  signal.throwIfAborted();
  return palettes;
}

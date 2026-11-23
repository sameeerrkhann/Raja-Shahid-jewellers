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

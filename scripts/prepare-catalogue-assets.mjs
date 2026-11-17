import { createRequire } from "node:module";
import { readFile, mkdir, access, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require(require.resolve("sharp", { paths: [path.dirname(require.resolve("next/package.json"))] }));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = process.argv[2];
if (!generatedRoot) throw new Error("Pass the existing built-in generated-image folder as the first argument. No API or credentials are used.");
const manifest = JSON.parse(await readFile(path.join(root, "src/data/demo/catalogue-assets.json"), "utf8"));
const exists = async (file) => { try { await access(file); return true; } catch { return false; } };
const audit = [];
for (const asset of manifest.assets) {
  if (!/^exec-[a-f0-9-]+\.png$/.test(asset.generatedFile) || !/^\d{3}$/.test(asset.id)) throw new Error("Unexpected generated asset name.");
  const input = path.resolve(generatedRoot, asset.generatedFile);
  const source = await readFile(input);
  const metadata = await sharp(source).metadata();
  const outputs = [];
  for (const size of [480, 960]) {
    const output = path.join(root, "public/images/catalogue", `design-${asset.id}${size === 480 ? "-480" : ""}.webp`);
    await mkdir(path.dirname(output), { recursive: true });
    if (!(await exists(output))) await sharp(source).resize(size, size, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86, effort: 5 }).toFile(output);
    const bytes = await readFile(output);
    const derivative = await sharp(bytes).metadata();
    if (derivative.width !== size || derivative.height !== size) throw new Error("Derivative geometry does not match the catalogue contract.");
    outputs.push({ path: path.relative(root, output).replaceAll("\\", "/"), width: size, height: size, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  audit.push({ id: asset.id, sourceWidth: metadata.width, sourceHeight: metadata.height, sourceSha256: createHash("sha256").update(source).digest("hex"), outputs });
}
// Same permitted original, prebuilt responsive variants: no runtime AVIF transform on the LCP path.
for (const width of [768, 1280, 1920]) {
  const output = path.join(root, "public/images/editorial/derivatives", `home-hero-${width}.webp`);
  await mkdir(path.dirname(output), { recursive: true });
  if (!(await exists(output))) await sharp(path.join(root, "public/images/editorial/floral-necklace.jpg")).resize({ width }).webp({ quality: 85, effort: 5 }).toFile(output);
  const buffer = await readFile(output);
  audit.push({ heroWidth: width, bytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex") });
}
await mkdir(path.join(root, "artifacts/phase04"), { recursive: true });
await writeFile(path.join(root, "artifacts/phase04/asset-checks.json"), JSON.stringify(audit, null, 2));
console.log(JSON.stringify({ assets: manifest.assets.length, derivatives: manifest.assets.length * 2, heroVariants: 3, totalCatalogueBytes: audit.flatMap((item) => item.outputs || []).reduce((sum, item) => sum + item.bytes, 0), hero: audit.filter((item) => item.heroWidth) }));

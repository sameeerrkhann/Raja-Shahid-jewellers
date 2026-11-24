"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { categoryLabel } from "@/config/catalogue";
import type { CatalogueResult, DesignCardData } from "@/types/catalogue";
import type { ImageColors } from "@/lib/auria/reference-image";
import type { VisualReferenceResult } from "@/lib/auria/visual-reference";
import { JewelleryPicture } from "./jewellery-stage";

type ReferenceResult = { file: File; url: string; colors: ImageColors };
type PaletteMatch = { card: DesignCardData; distance: number };

export function ReferencePanel({ onSelect, disabled, visionToken }: { onSelect: (card: DesignCardData, note: string) => void; disabled: boolean; visionToken?: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ReferenceResult | null>(null);
  const [localState, setLocalState] = useState<"idle" | "opening" | "matching">("idle");
  const [matches, setMatches] = useState<PaletteMatch[]>([]);
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [vision, setVision] = useState<(VisualReferenceResult & { caption: string }) | null>(null);
  const [checking, setChecking] = useState(false);
  const [visionError, setVisionError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const local = useRef<AbortController | null>(null);
  const hosted = useRef<AbortController | null>(null);
  const preview = useRef("");
  const preparedPhoto = useRef<Blob | null>(null);

  useEffect(() => () => {
    local.current?.abort();
    hosted.current?.abort();
    if (preview.current) URL.revokeObjectURL(preview.current);
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(0), cooldown * 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function clear() {
    local.current?.abort();
    hosted.current?.abort();
    local.current = null;
    hosted.current = null;
    preparedPhoto.current = null;
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = "";
    setResult(null);
    setLocalState("idle");
    setCategory("");
    setMatches([]);
    setError("");
    setVision(null);
    setVisionError("");
    setChecking(false);
  }

  async function analyze(file: File) {
    clear();
    const controller = new AbortController();
    local.current = controller;
    setLocalState("opening");
    try {
      const { validateReference, sampleColors, paletteDistance, cataloguePalettes } = await import("@/lib/auria/reference-image");
      await validateReference(file);
      const colors = await sampleColors(file);
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(file);
      preview.current = url;
      setResult({ file, url, colors });
      setLocalState("matching");
      const response = await fetch("/api/designs?limit=48", { signal: controller.signal });
      if (!response.ok) throw new Error("The sample catalogue could not be loaded. You can still open the Design Vault.");
      const { data } = await response.json() as { data: CatalogueResult };
      const palettes = await cataloguePalettes(data, controller.signal);
      controller.signal.throwIfAborted();
      setMatches(data.items.flatMap((card) => {
        const palette = palettes.get(card.id);
        return palette ? [{ card, distance: paletteDistance(colors, palette) }] : [];
      }).sort((a, b) => a.distance - b.distance));
    } catch (problem) {
      if (!controller.signal.aborted) setError(problem instanceof DOMException ? "The image could not be decoded. Try another photo." : problem instanceof Error ? problem.message : "The image could not be read.");
    } finally {
      if (local.current === controller) { local.current = null; setLocalState("idle"); }
    }
  }

  async function analyzeWithGemini(file: File, token: string) {
    if (hosted.current || cooldown) return;
    const controller = new AbortController();
    hosted.current = controller;
    setChecking(true);
    setVisionError("");
    try {
      const { prepareReferenceJpeg } = await import("@/lib/auria/reference-image");
      const prepared = preparedPhoto.current ?? await prepareReferenceJpeg(file);
      controller.signal.throwIfAborted();
      preparedPhoto.current = prepared;
      const response = await fetch("/api/ai/reference", {
        method: "POST", body: prepared, signal: controller.signal, cache: "no-store",
        headers: { "Content-Type": "image/jpeg", "X-CSRF-Token": token, "X-Auria-Reference-Consent": "1" },
      });
      const { data, error } = await response.json() as { data?: VisualReferenceResult; error?: { message: string } };
      if (!response.ok || !data) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        if (response.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) setCooldown(Math.min(retryAfter, 60));
        throw new Error(error?.message ?? "Photo analysis is unavailable. Browse the catalogue below.");
      }
      const { describeObservation, visualObservation } = await import("@/lib/auria/visual-reference");
      controller.signal.throwIfAborted();
      setVision({ ...data, caption: describeObservation(visualObservation.parse(data.observation)) });
    } catch (problem) {
      if (!controller.signal.aborted) setVisionError(problem instanceof Error ? problem.message : "Photo analysis is unavailable.");
    } finally {
      if (hosted.current === controller) { hosted.current = null; setChecking(false); }
    }
  }

  function choose(card: DesignCardData, note: string) {
    onSelect(card, note);
    clear();
    setOpen(false);
  }

  const categories = [...new Set(matches.map(({ card }) => card.categorySlug))].sort();
  const visible = matches.filter(({ card }) => !category || card.categorySlug === category).slice(0, 3);
  return <>
    <button type="button" className="atelier-text-action" disabled={disabled} onClick={() => setOpen(true)}>Add reference image</button>
    {open && <Modal open={open} onClose={() => { clear(); setOpen(false); }} title="Jewellery reference" className="atelier-inspector atelier-reference">
      <p>Bring a reference to the atelier. Local color matching keeps your photo on this device.</p>
      <label htmlFor="atelier-reference-file">{result ? "Replace reference photo" : "Choose JPEG, PNG or WebP"} (up to 5 MB)</label>
      <input type="file" id="atelier-reference-file" name="reference" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void analyze(file); event.target.value = ""; }} />
      {localState === "opening" && <p role="status">Opening your photo… <button type="button" onClick={clear} className="atelier-text-action">Cancel</button></p>}
      {error && <p role="alert">{error}</p>}
      {result && <div className="atelier-reference__result">
        <Image className="atelier-reference__preview" src={result.url} alt="Your local reference preview" width={320} height={240} unoptimized />
        <div className="atelier-reference__caption">
          <div className="atelier-reference__sample"><span aria-hidden="true" style={{ backgroundColor: `rgb(${result.colors.slice(0, 3).join(" ")})` }} /> Average color near the center</div>
          <button type="button" onClick={clear} className="atelier-text-action">Remove reference</button>
        </div>
        {visionToken && !vision && <section className="atelier-reference__vision" aria-label="Gemini photo analysis">
          <h3>Look for shapes and details</h3>
          <p id="atelier-photo-privacy">Analyze with Gemini sends a resized copy to Google. Google may use Free-tier inputs to improve its products. Choose a photo without personal details.</p>
          {checking ? <p role="status">Interpreting the photo… <button type="button" className="atelier-text-action" onClick={() => hosted.current?.abort()}>Cancel analysis</button></p>
            : <button type="button" className="atelier-outline" aria-describedby="atelier-photo-privacy" disabled={!!cooldown} onClick={() => void analyzeWithGemini(result.file, visionToken)}>Analyze with Gemini</button>}
          {visionError && <p role="alert">{visionError}</p>}
          {!!cooldown && <p>Wait up to a minute before retrying. You can browse by jewellery type below.</p>}
        </section>}
        {vision && <section className="atelier-reference__vision" aria-label="Visual observations">
          <h3>Gemini’s visual observations</h3>
          <p>{vision.caption}.</p>
          <p>Appearance only. A photo cannot verify purity, stones, weight or availability.</p>
          {vision.matches.length ? <ul className="atelier-reference__matches">{vision.matches.map((card) => <li key={card.id}>
            <button type="button" className="atelier-outline" onClick={() => choose(card, `Photo appearance reference: ${vision.caption}. Visual suggestion only. The photo itself is not attached.`)}>
              <JewelleryPicture media={card.thumbnail} title={card.title} />
              {card.title} <small translate="no">{card.designCode} · sample design</small>
              {!!vision.reasons?.[card.id]?.length && <small className="atelier-reference__reason">{vision.reasons[card.id].join(" · ")}</small>}
            </button>
          </li>)}</ul> : <p>No sample designs match these observations. Explore the available catalogue below.</p>}
        </section>}

        {localState === "matching" ? <p role="status">Matching colors on this device…</p> : <section className="atelier-reference__vision" aria-label="Local catalogue matches">
          <h3>Closest color matches</h3>
          <p>Browse sample designs by category. Color and contrast can include the photo’s background.</p>
          {!!categories.length && <label className="atelier-reference__filter">Jewellery type
            <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All jewellery</option>{categories.map((slug) => <option value={slug} key={slug}>{categoryLabel(slug)}</option>)}</select>
          </label>}
          {visible.length ? <ul>{visible.map(({ card }) => <li key={card.id}><button type="button" className="atelier-outline" onClick={() => {
            const [r, g, b] = result.colors;
            choose(card, `Photo color reference: RGB ${r}, ${g}, ${b}. Please review the requested tone with the jeweller. The photo itself is not attached.`);
          }}>{card.title} <small translate="no">{card.designCode}</small></button></li>)}</ul> : <p>No local color matches could be loaded.</p>}
        </section>}
      </div>}
      <p className="atelier-reference__vault"><Link className="atelier-text-action" href="/designs">Browse the Design Vault</Link></p>
    </Modal>}
  </>;
}

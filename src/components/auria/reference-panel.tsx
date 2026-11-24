"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import type { CatalogueResult, DesignCardData } from "@/types/catalogue";
import type { VisualReferenceResult } from "@/lib/auria/visual-reference";
import { JewelleryPicture } from "./jewellery-stage";

type ReferenceResult = { file: File; url: string; colors: readonly [number, number, number, number]; matches: DesignCardData[] };

export function ReferencePanel({ onSelect, disabled, visionToken }: { onSelect: (card: DesignCardData, note: string) => void; disabled: boolean; visionToken?: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ReferenceResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [vision, setVision] = useState<(VisualReferenceResult & { caption: string }) | null>(null);
  const [checking, setChecking] = useState(false);
  const [visionError, setVisionError] = useState("");
  const active = useRef<AbortController | null>(null);
  const preview = useRef("");
  useEffect(() => () => { active.current?.abort(); if (preview.current) URL.revokeObjectURL(preview.current); }, []);

  function clear() { active.current?.abort(); setVision(null); setChecking(false); setVisionError(""); if (preview.current) URL.revokeObjectURL(preview.current); preview.current = ""; setResult(null); setError(""); setPending(false); }
  async function analyze(file: File) {
    clear();
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    try {
      const { validateReference, sampleColors, paletteDistance } = await import("@/lib/auria/reference-image");
      await validateReference(file);
      const colors = await sampleColors(file);
      controller.signal.throwIfAborted();
      const response = await fetch("/api/designs?limit=12", { signal: controller.signal });
      if (!response.ok) throw new Error("The sample catalogue could not be loaded. Try again.");
      const { data } = await response.json() as { data: CatalogueResult };
      const ranked = await Promise.allSettled(data.items.map(async (card) => {
        const image = await fetch(card.thumbnail.url, { signal: controller.signal });
        if (!image.ok) throw new Error("Sample image unavailable.");
        return { card, distance: paletteDistance(colors, await sampleColors(await image.blob())) };
      }));
      controller.signal.throwIfAborted();
      const matches = ranked.flatMap((item) => item.status === "fulfilled" ? [item.value] : []).sort((a, b) => a.distance - b.distance).slice(0, 3).map(({ card }) => card);
      const url = URL.createObjectURL(file);
      preview.current = url;
      setResult({ file, url, colors, matches });
    } catch (problem) {
      if (!controller.signal.aborted) setError(problem instanceof DOMException ? "The image could not be decoded. Try another photo." : problem instanceof Error ? problem.message : "The image could not be read.");
    } finally {
      if (active.current === controller && !controller.signal.aborted) setPending(false);
    }
  }
  async function analyzeWithGemini(file: File, token: string) {
    const controller = new AbortController();
    active.current?.abort();
    active.current = controller;
    setChecking(true);
    setVisionError("");
    try {
      const { prepareReferenceJpeg } = await import("@/lib/auria/reference-image");
      const prepared = await prepareReferenceJpeg(file);
      controller.signal.throwIfAborted();
      const response = await fetch("/api/ai/reference", {
        method: "POST", body: prepared, signal: controller.signal, cache: "no-store",
        headers: { "Content-Type": "image/jpeg", "X-CSRF-Token": token, "X-Auria-Reference-Consent": "1" },
      });
      const { data, error } = await response.json() as { data?: VisualReferenceResult; error?: { message: string } };
      if (!response.ok || !data) throw new Error(error?.message ?? "Photo analysis is unavailable. Try the local color matches.");
      const { describeObservation, visualObservation } = await import("@/lib/auria/visual-reference");
      controller.signal.throwIfAborted();
      setVision({ ...data, caption: describeObservation(visualObservation.parse(data.observation)) });
    } catch (problem) {
      if (!controller.signal.aborted) setVisionError(problem instanceof Error ? problem.message : "Photo analysis is unavailable.");
    } finally { if (active.current === controller) setChecking(false); }
  }
  function choose(card: DesignCardData, note: string) {
    onSelect(card, note);
    clear();
    setOpen(false);
  }
  return <>
    <button type="button" className="atelier-text-action" disabled={disabled} onClick={() => setOpen(true)}>Add reference image</button>
    {open && <Modal open={open} onClose={() => { clear(); setOpen(false); }} title="Jewellery reference" className="atelier-inspector atelier-reference">
      <p>Compare a photo’s colors and contrast with sample designs. Local matching keeps the photo in this tab. Matching considers the whole image, including its background.</p>
      <label htmlFor="atelier-reference-file">{result ? "Replace reference photo" : "Choose JPEG, PNG or WebP"} (up to 5 MB)</label>
      <input key={result ? "chosen" : "empty"} type="file" id="atelier-reference-file" name="reference" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void analyze(file); event.target.value = ""; }} />
      {pending && <p role="status">Matching colors… <button type="button" onClick={clear} className="atelier-text-action">Cancel</button></p>}
      {error && <p role="alert">{error}</p>}
      {result && <div className="atelier-reference__result">
        <Image className="atelier-reference__preview" src={result.url} alt="Your local reference preview" width={320} height={240} unoptimized />
        <div className="atelier-reference__sample"><span aria-hidden="true" style={{ backgroundColor: `rgb(${result.colors.slice(0, 3).join(" ")})` }} /> Average color near the center</div>
        <button type="button" onClick={clear} className="atelier-text-action">Remove reference</button>
        {visionToken && <section className="atelier-reference__vision" aria-label="Gemini photo analysis">
          <p>Recognize visible jewellery details with Gemini. Selecting Analyze with Gemini sends a resized copy to Google. Free-tier requests may be used to improve Google products. Use a sample photo without personal information.</p>
          {!vision && (checking ? <p role="status">Interpreting the photo… <button type="button" className="atelier-text-action" onClick={() => active.current?.abort()}>Cancel analysis</button></p> : <button type="button" className="atelier-outline" onClick={() => void analyzeWithGemini(result.file, visionToken)}>Analyze with Gemini</button>)}
          {visionError && <p role="alert">{visionError}</p>}
        </section>}
        {vision && <section className="atelier-reference__vision" aria-label="Visual observations">
          <h3>Gemini’s visual observations</h3>
          <p>{vision.caption}.</p>
          <p>Appearance only. A photo cannot verify purity, stones, weight or availability.</p>
          {vision.matches.length ? <ul className="atelier-reference__matches">{vision.matches.map((card) => <li key={card.id}>
            <button type="button" className="atelier-outline" onClick={() => choose(card, `Photo appearance reference: ${vision.caption}. Visual suggestion only. The photo itself is not attached.`)}>
              <JewelleryPicture media={card.thumbnail} title={card.title} />
              {card.title} <small translate="no">{card.designCode} · sample design</small>
            </button>
          </li>)}</ul> : <p>No confident jewellery type or matching sample designs. Try the color matches or choose a design from the vault.</p>}
        </section>}
        <h3>Closest color matches</h3>
        {result.matches.length ? <ul>{result.matches.map((card) => <li key={card.id}><button type="button" className="atelier-outline" onClick={() => {
          const [r, g, b] = result.colors;
          choose(card, `Photo color reference: RGB ${r}, ${g}, ${b}. Please review the requested tone with the jeweller. The photo itself is not attached.`);
        }}>{card.title} <small translate="no">{card.designCode}</small></button></li>)}</ul> : <p>No sample images could be compared. You can still choose a design from the stage.</p>}
      </div>}
    </Modal>}
  </>;
}

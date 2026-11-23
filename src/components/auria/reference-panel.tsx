"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import type { CatalogueResult, DesignCardData } from "@/types/catalogue";

type ReferenceResult = { url: string; colors: readonly [number, number, number, number]; matches: DesignCardData[] };

export function ReferencePanel({ onSelect, disabled }: { onSelect: (card: DesignCardData, note: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ReferenceResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const preview = useRef("");
  useEffect(() => () => { active.current?.abort(); if (preview.current) URL.revokeObjectURL(preview.current); }, []);

  function clear() { active.current?.abort(); if (preview.current) URL.revokeObjectURL(preview.current); preview.current = ""; setResult(null); setError(""); setPending(false); }
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
      setResult({ url, colors, matches });
    } catch (problem) {
      if (!controller.signal.aborted) setError(problem instanceof DOMException ? "The image could not be decoded. Try another photo." : problem instanceof Error ? problem.message : "The image could not be read.");
    } finally {
      if (active.current === controller && !controller.signal.aborted) setPending(false);
    }
  }
  return <>
    <button type="button" className="atelier-text-action" disabled={disabled} onClick={() => setOpen(true)}>Add reference image</button>
    {open && <Modal open={open} onClose={() => { clear(); setOpen(false); }} title="Jewellery reference" className="atelier-inspector atelier-reference">
      <p>Compare a photo’s colors and contrast with sample designs. The photo stays in this browser tab. Matching considers the whole image, including its background.</p>
      <label htmlFor="atelier-reference-file">Choose JPEG, PNG or WebP (up to 5 MB)</label>
      <input key={result ? "chosen" : "empty"} type="file" id="atelier-reference-file" name="reference" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void analyze(file); event.target.value = ""; }} />
      {pending && <p role="status">Matching colors… <button type="button" onClick={clear} className="atelier-text-action">Cancel</button></p>}
      {error && <p role="alert">{error}</p>}
      {result && <div className="atelier-reference__result">
        <Image className="atelier-reference__preview" src={result.url} alt="Your local reference preview" width={320} height={240} unoptimized />
        <div className="atelier-reference__sample"><span aria-hidden="true" style={{ backgroundColor: `rgb(${result.colors.slice(0, 3).join(" ")})` }} /> Average color near the center</div>
        <button type="button" onClick={clear} className="atelier-text-action">Remove reference</button>
        <h3>Closest color matches</h3>
        {result.matches.length ? <ul>{result.matches.map((card) => <li key={card.id}><button type="button" className="atelier-outline" onClick={() => {
          const [r, g, b] = result.colors;
          onSelect(card, `Photo color reference: RGB ${r}, ${g}, ${b}. Please review the requested tone with the jeweller. The photo itself is not attached.`);
          clear(); setOpen(false);
        }}>{card.title} <small translate="no">{card.designCode}</small></button></li>)}</ul> : <p>No sample images could be compared. You can still choose a design from the stage.</p>}
      </div>}
    </Modal>}
  </>;
}

"use client";

import Image from "next/image";
import { useState } from "react";
import type { CatalogueMedia } from "@/types/catalogue";

export function CatalogueImage({ media, sizes = "(max-width: 479px) 90vw, (max-width: 1023px) 45vw, 24vw", eager = false }: { media: CatalogueMedia; sizes?: string; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return <div className="design-media" data-image-failed={failedSource === media.url || undefined}>
    {failedSource !== media.url ? <picture><source type="image/webp" srcSet={`${media.url.replace(".webp", "-480.webp")} 480w, ${media.url} 960w`} sizes={sizes} /><Image src={media.url} alt={media.alt} fill unoptimized loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} onError={() => setFailedSource(media.url)} /></picture> : <div className="design-media__fallback" role="img" aria-label={`${media.alt} Image unavailable.`}><span aria-hidden="true">◇</span><p>A little imagination.</p><small>Concept image unavailable.<br />Design information is still available.</small></div>}
  </div>;
}

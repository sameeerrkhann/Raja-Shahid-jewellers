"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

export function EditorialImage({ className = "", alt, sources, ...props }: ImageProps & { sources?: { media: string; srcSet: string }[] }) {
  const [failed, setFailed] = useState(false);
  return <div className={`editorial-image ${className}`} data-media-failed={failed || undefined}>
    {!failed ? sources ? <picture>{sources.map((source) => <source key={source.media} type="image/webp" {...source} />)}<Image {...props} alt={alt} onError={() => setFailed(true)} /></picture> : <Image {...props} alt={alt} onError={() => setFailed(true)} /> : <div className="editorial-image__fallback" role="img" aria-label={`${alt}. Reference image unavailable.`}><span className="eyebrow">Raja Shahid Jewellers</span><span>A study in<br /><em>quiet beauty.</em></span><small>Reference photograph unavailable</small></div>}
  </div>;
}

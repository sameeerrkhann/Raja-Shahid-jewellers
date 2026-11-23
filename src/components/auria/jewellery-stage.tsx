"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import type { CatalogueMedia, DesignCardData, PublicDesign } from "@/types/catalogue";
import { statusLabels } from "@/config/catalogue";
import { useImageZoom } from "./use-image-zoom";

export function JewelleryPicture({ media, title, className = "", sizes = "180px" }: { media: CatalogueMedia; title: string; className?: string; sizes?: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={`auria-product-image ${className}`}>
    {failed ? <span>Image unavailable<br />{title}</span> : <Image src={media.url} alt={media.alt} fill sizes={sizes} onError={() => setFailed(true)} />}
  </div>;
}

export function JewelleryStage({ discovery, selected, disabled, onSelect }: { discovery: DesignCardData[]; selected: PublicDesign | null; disabled: boolean; onSelect: (design: DesignCardData) => void }) {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [frame, setFrame] = useState(0);
  const [open, setOpen] = useState(false);
  const { scale, viewport, reset, start, move, finish, adjust } = useImageZoom(open);
  const featured = discovery[featuredIndex];
  const design = selected ?? featured;
  const gallery = selected?.images ?? (featured ? [featured.thumbnail] : []);
  const media = gallery[frame] ?? gallery[0];
  if (!design || !media) return <p className="auria-muted">No sample images are available.</p>;
  const cycle = (direction: number) => {
    if (selected) setFrame((current) => (current + direction + gallery.length) % gallery.length);
    else setFeaturedIndex((current) => (current + direction + discovery.length) % discovery.length);
    reset();
  };
  const count = selected ? gallery.length : discovery.length;
  const position = selected ? frame + 1 : featuredIndex + 1;
  return <>
    <div className="atelier-stage__image">
      <button type="button" className="atelier-stage__open" onClick={() => { reset(); setOpen(true); }} aria-label={`Inspect image of ${design.title}`}>
        <JewelleryPicture key={media.id} media={media} title={design.title} className="atelier-stage__picture" sizes="(max-width: 900px) 92vw, 59vw" />
        <span className="atelier-stage__expand" aria-hidden="true">↗</span>
      </button>
      <span className="atelier-stage__origin">Sample design · Concept image</span>
    </div>
    <div className="atelier-stage__details">
      <div className="atelier-stage__code" translate="no">{design.designCode}</div>
      <h2>{design.title}</h2>
      <p className="atelier-stage__availability">Sample · {statusLabels[design.displayStatus]}</p>
      {selected && <p className="atelier-stage__description">{selected.description}</p>}
      <div className="atelier-stage__actions">
        <div className="auria-discovery">{!selected && <button type="button" className="atelier-outline" disabled={disabled} onClick={() => onSelect(featured)}>Select design</button>}</div>
        {count > 1 && <div className="atelier-stage__pagination" aria-label="Preview controls"><button type="button" onClick={() => cycle(-1)} aria-label="Previous design image">‹</button><span aria-live="polite">{position} / {count}</span><button type="button" onClick={() => cycle(1)} aria-label="Next design image">›</button></div>}
      </div>
    </div>
    {open && <Modal open={open} onClose={() => setOpen(false)} title={design.title} className="atelier-inspector">
      <div ref={viewport} className="atelier-inspector__image" data-zoom={scale > 1} role="region" aria-label="Jewellery photo" tabIndex={0}
        onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
        <Image draggable={false} src={media.url} alt={media.alt} width={media.width} height={media.height} sizes="(max-width: 640px) 90vw, 650px" style={{ width: `${scale * 100}%` }} />
      </div>
      <div className="atelier-inspector__controls">
        {count > 1 && <button type="button" className="atelier-outline" onClick={() => cycle(-1)}>Previous image</button>}
        <button type="button" className="atelier-outline" onClick={() => adjust(.5)} disabled={scale >= 3}>Zoom in</button>
        {scale > 1 && <>
          <button type="button" className="atelier-outline" onClick={() => adjust(-.5)}>Zoom out</button>
          <button type="button" className="atelier-outline" onClick={reset}>Reset zoom</button>
        </>}
        {count > 1 && <button type="button" className="atelier-outline" onClick={() => cycle(1)}>Next image</button>}
      </div>
      <p>Catalogue concept photography</p>
    </Modal>}
  </>;
}

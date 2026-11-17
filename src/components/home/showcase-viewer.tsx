"use client";

import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import Link from "next/link";
import type { ShowcaseItem } from "@/lib/catalogue/showcase";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";

/** "Look closer": a full-size image the customer can zoom into and pan around with pointer or touch. */
function ZoomFrame({ item }: { item: ShowcaseItem }) {
  const frame = useRef<HTMLButtonElement>(null);
  const [zoomed, setZoomed] = useState(false);

  function aim(clientX: number, clientY: number) {
    const element = frame.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    element.style.setProperty("--zoom-x", `${x}%`);
    element.style.setProperty("--zoom-y", `${y}%`);
  }
  function toggle(event: MouseEvent<HTMLButtonElement>) {
    // Keyboard activation reports detail 0 and no pointer position: zoom into the centre.
    if (event.detail === 0) { frame.current?.style.setProperty("--zoom-x", "50%"); frame.current?.style.setProperty("--zoom-y", "50%"); }
    else aim(event.clientX, event.clientY);
    setZoomed((current) => !current);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (zoomed) aim(event.clientX, event.clientY);
  }

  return <figure className="showcase-zoom">
    <button ref={frame} type="button" className="showcase-zoom__frame" data-zoomed={zoomed || undefined} aria-pressed={zoomed} aria-label={zoomed ? "Zoom out" : "Zoom in to look closer"} onClick={toggle} onPointerMove={move}>
      {/* eslint-disable-next-line @next/next/no-img-element -- pre-built 960px WebP, shown at native size for zoom */}
      <img src={item.large} width={960} height={960} alt={item.alt} draggable={false} />
      <span className="showcase-zoom__badge" aria-hidden="true"><Icon name={zoomed ? "close" : "search"} />{zoomed ? "Move to explore · tap to exit" : "Tap or click to zoom"}</span>
    </button>
    <figcaption>AI-generated concept image · not a photograph of shop stock</figcaption>
  </figure>;
}

export function ShowcaseViewer({ items, index, onClose, onStep }: { items: ShowcaseItem[]; index: number | null; onClose: () => void; onStep: (direction: number) => void }) {
  const item = index === null ? null : items[index];
  return <Modal open={item !== null} onClose={onClose} title={item?.title ?? "Design"} className="showcase-viewer">
    {item && index !== null ? <div className="showcase-viewer__body">
      <ZoomFrame key={item.id} item={item} />
      <div className="showcase-viewer__info">
        <p className="eyebrow">{item.code} · {item.category} / {item.subcategory}</p>
        <p className="showcase-viewer__description">{item.description}</p>
        <dl className="showcase-viewer__facts">
          <div><dt>Sample status</dt><dd>{item.status}</dd></div>
          <div><dt>Purity, weight &amp; price</dt><dd>Confirmed by the shop on enquiry</dd></div>
        </dl>
        <p className="caption">Synthetic demo record. Availability is a sample, not real stock or a manufacturing promise.</p>
        <div className="showcase-viewer__nav">
          <button type="button" className="icon-button" aria-label="Previous design" onClick={() => onStep(-1)}><Icon name="arrow" className="arrow-back" /></button>
          <span>{String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
          <button type="button" className="icon-button" aria-label="Next design" onClick={() => onStep(1)}><Icon name="arrow" /></button>
        </div>
        <Link className="text-link" prefetch={false} href={item.href} onClick={onClose}>Find it in the Design Vault <Icon name="arrow" /></Link>
      </div>
    </div> : null}
  </Modal>;
}

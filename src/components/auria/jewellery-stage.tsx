"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import type { CatalogueMedia, DesignCardData, PublicDesign } from "@/types/catalogue";
import { statusLabels } from "@/config/catalogue";
import { useImageZoom } from "./use-image-zoom";
import { JewelleryStudy } from "./jewellery-study";

export function JewelleryPicture({ media, title, className = "", sizes = "180px" }: { media: CatalogueMedia; title: string; className?: string; sizes?: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={`auria-product-image ${className}`}>
    {failed ? <span>Image unavailable<br />{title}</span> : <Image src={media.url} alt={media.alt} fill sizes={sizes} onError={() => setFailed(true)} />}
  </div>;
}

export type RecommendationGroup = { id: string; createdAt: string; cards: DesignCardData[] };

const recommendationTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

function purityLabel(values: readonly number[]) {
  return values.length ? values.map((value) => value + "K").join(" · ") : "To be confirmed by the jeweller";
}

export function JewelleryStage({ discovery, selected, recommendations, pinnedId, archiveId, disabled, onGroupChange, onSelect }: {
  discovery: DesignCardData[];
  selected: PublicDesign | null;
  recommendations: RecommendationGroup[];
  pinnedId?: string;
  archiveId?: string;
  onGroupChange: (id?: string) => void;
  disabled: boolean;
  onSelect: (design: DesignCardData) => void;
}) {
  const [cursor, setCursor] = useState({ key: "", index: 0 });
  const [browsing, setBrowsing] = useState(false);
  const [overlay, setOverlay] = useState<"photo" | "study" | "compare" | null>(null);
  const { scale, viewport, reset, start, move, finish, adjust } = useImageZoom(overlay === "photo");
  const latest = recommendations[0];
  const earlier = recommendations.find((entry) => entry !== latest && entry.id === archiveId);
  const group = earlier ?? latest;
  const cards = group?.cards ?? discovery;
  const selectedInStage = selected && !earlier && (!group || pinnedId === selected.id || cards.some(({ id }) => id === selected.id)) ? selected : null;
  const scope = selectedInStage ? `design:${selectedInStage.id}` : group?.id ?? "discovery";
  const index = cursor.key === scope ? cursor.index : 0;
  const chosen = cards[index] ?? cards[0];
  const design = selectedInStage ?? chosen;
  const gallery = selectedInStage?.images;
  const media = gallery ? gallery[index] ?? gallery[0] : chosen?.thumbnail;
  const study = overlay === "study" && <Modal open onClose={() => setOverlay(null)} title="3D jewellery study" className="atelier-inspector atelier-study">
    <JewelleryStudy onClose={() => setOverlay(null)} />
  </Modal>;
  if (!group && !selected && !browsing) return <div className="atelier-stage__empty">
    <span aria-hidden="true">◇</span>
    <h2>Your design preview</h2>
    <p>Designs you discover in conversation will appear here.</p>
    <button type="button" className="atelier-outline" onClick={() => setBrowsing(true)}>Browse sample designs</button>
    <p>Independent ring demonstration</p>
    <button type="button" className="atelier-text-action" onClick={() => setOverlay("study")}>Open 3D study</button>
    {study}
  </div>;
  if (!design || !media) return <p className="auria-muted">No sample images are available.</p>;
  const unit = gallery ? "photo" : "design";
  const count = gallery?.length ?? cards.length;
  const purity = selectedInStage ? [...new Set(selectedInStage.variants.flatMap((variant) => variant.karat ?? []))] : chosen.purityOptions;
  const comparison = group?.cards.slice(0, 3) ?? [];
  const cycle = (direction: number) => {
    setCursor({ key: scope, index: (index + direction + count) % count });
    reset();
  };
  return <>
    <div className="atelier-stage__image">
      <button type="button" className="atelier-stage__open" onClick={() => { reset(); setOverlay("photo"); }} aria-label={`Inspect image of ${design.title}`}>
        <JewelleryPicture key={media.id} media={media} title={design.title} className="atelier-stage__picture atelier-stage__arrival" sizes="(max-width: 900px) 92vw, 34vw" />
        <span className="atelier-stage__expand" aria-hidden="true">↗</span>
      </button>
      <button type="button" className="atelier-outline atelier-stage__study-open" onClick={() => setOverlay("study")}>Open 3D study</button>
      <span className="atelier-stage__origin">Sample design · Concept image</span>
    </div>
    <div className="atelier-stage__details">
      <p className="atelier-stage__context">{selectedInStage ? "Selected design" : earlier ? "Earlier recommendations" : group ? "Current recommendations" : "Sample browse"}</p>
      <div className="atelier-stage__code" translate="no">{design.designCode}</div>
      <h2>{design.title}</h2>
      <p className="atelier-stage__availability">Sample · {statusLabels[design.displayStatus]} <span aria-hidden="true">·</span> {purityLabel(purity)}</p>
      {selectedInStage && <p className="atelier-stage__description">{selectedInStage.description}</p>}
      <div className="atelier-stage__actions">
        <div className="auria-discovery">{!selectedInStage && <button type="button" className="atelier-outline" disabled={disabled} onClick={() => onSelect(chosen)}>Select design</button>}</div>
        {count > 1 && <div className="atelier-stage__pagination" aria-label="Preview controls"><button type="button" onClick={() => cycle(-1)} aria-label={`Previous ${unit}`}>‹</button><span aria-live="polite">{index + 1} / {count}</span><button type="button" onClick={() => cycle(1)} aria-label={`Next ${unit}`}>›</button></div>}
      </div>
      {selected && !selectedInStage && <p className="atelier-stage__description">Quotation selection <strong>{selected.title}</strong></p>}
      {(comparison.length > 1 || recommendations.length > 1) && <div className="atelier-stage__tools">
        {comparison.length > 1 && <button type="button" className="atelier-outline" onClick={() => setOverlay("compare")}>Compare designs</button>}
        {recommendations.length > 1 && <label className="atelier-stage__history">Recommendation history
          <select value={group?.id ?? ""} onChange={(event) => {
            onGroupChange(event.target.value === latest.id ? undefined : event.target.value);
            setCursor({ key: "", index: 0 });
          }}>{recommendations.map(({ id, cards, createdAt }, order) => <option key={id} value={id}>
            {order === 0 ? "Latest" : recommendationTime.format(new Date(createdAt))} · {cards.length} {cards.length === 1 ? "design" : "designs"}
          </option>)}</select>
        </label>}
      </div>}
    </div>
    {overlay === "photo" && <Modal open onClose={() => setOverlay(null)} title={design.title} className="atelier-inspector">
      <div ref={viewport} className="atelier-inspector__image" data-zoom={scale > 1} role="region" aria-label="Jewellery photo" tabIndex={0}
        onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
        <Image draggable={false} src={media.url} alt={media.alt} width={media.width} height={media.height} sizes="(max-width: 640px) 90vw, 650px" style={{ width: `${scale * 100}%` }} />
      </div>
      <div className="atelier-inspector__controls">
        {count > 1 && <button type="button" className="atelier-outline" onClick={() => cycle(-1)}>Previous {unit}</button>}
        <button type="button" className="atelier-outline" onClick={() => adjust(.5)} disabled={scale >= 3}>Zoom in</button>
        {scale > 1 && <>
          <button type="button" className="atelier-outline" onClick={() => adjust(-.5)}>Zoom out</button>
          <button type="button" className="atelier-outline" onClick={reset}>Reset zoom</button>
        </>}
        {count > 1 && <button type="button" className="atelier-outline" onClick={() => cycle(1)}>Next {unit}</button>}
      </div>
      <p>Catalogue concept photography</p>
    </Modal>}
    {study}
    {overlay === "compare" && <Modal open onClose={() => setOverlay(null)} title="Compare recommended designs" className="atelier-inspector atelier-comparison">
      <ul className="atelier-comparison__cards">{comparison.map((card) => <li key={card.id}>
        <JewelleryPicture media={card.thumbnail} title={card.title} className="atelier-comparison__image" sizes="(max-width: 580px) 80vw, 190px" />
        <small translate="no">{card.designCode}</small>
        <h3>{card.title}</h3>
        <dl>
          <div><dt>Sample availability</dt><dd>{statusLabels[card.displayStatus]}</dd></div>
          <div><dt>Catalogue purity</dt><dd>{purityLabel(card.purityOptions)}</dd></div>
        </dl>
        <button className="atelier-outline" type="button" disabled={disabled} onClick={() => { setOverlay(null); onGroupChange(); onSelect(card); }}>Select {card.title}</button>
      </li>)}</ul>
    </Modal>}
  </>;
}

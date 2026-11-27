"use client";
/* eslint-disable @next/next/no-img-element -- the photograph and loupe follow the selected piece. */

import { useRef, useState, type CSSProperties } from "react";
import { useNear } from "./use-near";
import type { Wearer, WornSpot } from "@/config/showcase";
import { models } from "@/config/showcase";

export type TryOnDesign = { title: string; slug: string; category: string; subcategory: string; image: string; alt: string };
const PUSH = 1.45;
const LOUPE = 2.8;

const matchesFor = (spot: WornSpot, designs: TryOnDesign[]) => designs.filter((design) => {
  const text = `${design.title} ${design.subcategory}`.toLowerCase();
  return text.includes(spot.search) || (spot.category ? design.category === spot.category : false);
}).slice(0, 3);

/* See it on: one model for women and one for men, each wearing every kind of piece. Choosing a piece gives the
   photograph a gentle push towards it, a round loupe shows the piece up close, and the side panel describes it
   with matching sample designs. The whole look stays in view. */
export function TryOn({ designs = [] }: { designs?: TryOnDesign[] }) {
  const [wearer, setWearer] = useState<Wearer>("women");
  const [spotIndex, setSpotIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null), frame = useRef<HTMLDivElement>(null);
  const near = useNear(sectionRef);
  const model = models[wearer], spot = spotIndex === null ? null : model.spots[spotIndex];
  const push = spot ? Math.min(spot.zoom, PUSH) : 1;
  const matches = spot ? matchesFor(spot, designs) : [];

  const pickWearer = (next: Wearer) => { setWearer(next); setSpotIndex(null); };
  const pickSpot = (index: number) => {
    setSpotIndex((current) => (current === index ? null : index));
    const box = frame.current?.getBoundingClientRect();
    if (box && window.innerWidth <= 860 && box.top < 0) frame.current!.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <section ref={sectionRef} id="try-on" className="tryon" data-scene="04" data-tone="dark" aria-labelledby="try-on-title">
    <div className="tryon__frame" ref={frame} style={{ aspectRatio: `${model.width} / ${model.height}` }} data-selected={spot ? "true" : undefined}>
      <div className="tryon__camera" style={{ "--z": push, transform: `scale(${push})`, transformOrigin: spot ? `${spot.x}% ${spot.y}%` : "50% 40%" } as CSSProperties}>
        {near && <img key={wearer} className="tryon__photo" src={model.src} alt={model.alt} />}
        {model.spots.map((entry, index) => <button key={entry.name} type="button" className="tryon__dot" style={{ left: `${entry.x}%`, top: `${entry.y}%` }} aria-label={`Focus on the ${entry.name.toLowerCase()}`} aria-pressed={index === spotIndex} onClick={() => pickSpot(index)} />)}
      </div>
      {spot && near && <div key={`${wearer}-${spot.name}`} className="tryon__loupe" data-side={spot.x < 50 ? "right" : "left"} aria-hidden="true"
        style={{ backgroundImage: `url(${model.src})`, backgroundSize: `${LOUPE * 100}% auto`, backgroundPosition: `${spot.x}% ${spot.y}%` }}><span>{spot.name}</span></div>}
      <span className="tryon__tag">AI-generated model</span>
    </div>
    <div className="tryon__copy">
      <h2 id="try-on-title">See it on.</h2>
      <p>Pick a piece to see where it is worn and how it sits, then open matching designs.</p>
      <div className="tryon__who" role="group" aria-label="Show pieces for">
        {(["women", "men"] as const).map((option) => <button key={option} type="button" aria-pressed={wearer === option} onClick={() => pickWearer(option)}>{option === "women" ? "Women" : "Men"}</button>)}
      </div>
      <div className="tryon__panel">
        <ol className="tryon__index" key={wearer}>
          {model.spots.map((entry, index) => <li key={entry.name} style={{ "--i": index } as CSSProperties}>
            <button type="button" className="tryon__item" aria-pressed={index === spotIndex} onClick={() => pickSpot(index)}>
              <span>{entry.name}<small>{entry.note}</small></span><i aria-hidden="true" />
            </button>
          </li>)}
        </ol>
        {spot && <div key={`${wearer}-${spot.name}`} className="tryon__focus" aria-live="polite">
          <span>{spot.note}</span>
          <strong>{spot.name}</strong>
          {matches.length > 0 ? <ul className="tryon__matches" aria-label={`Sample designs for ${spot.name.toLowerCase()}`}>
            {matches.map((design) => <li key={design.slug}><a href={`/designs?q=${encodeURIComponent(design.title)}`}><img src={design.image} alt="" loading="lazy" /><span>{design.title}</span></a></li>)}
          </ul> : <p className="tryon__none">No sample designs for this piece yet. Ask the shop about it.</p>}
          <div className="tryon__actions">
            <a href={`/designs?q=${encodeURIComponent(spot.search)}`}>See {spot.vault} in the Design Vault</a>
            <button type="button" data-service="enquiry">Ask about this piece</button>
            <button type="button" onClick={() => setSpotIndex(null)}>See the whole look</button>
          </div>
        </div>}
      </div>
    </div>
  </section>;
}

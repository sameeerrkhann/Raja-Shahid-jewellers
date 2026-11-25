"use client";
/* eslint-disable @next/next/no-img-element -- the photograph is moved by the camera transform. */

import { useRef, useState, type CSSProperties } from "react";
import { useNear } from "./use-near";
import type { Wearer } from "@/config/showcase";
import { models } from "@/config/showcase";

/* See it on: one model for women and one for men, each wearing every kind of piece. Choose a piece from the
   index (or tap its point on the photograph): the camera moves to where it is worn and opens the matching designs. */
export function TryOn() {
  const [wearer, setWearer] = useState<Wearer>("women");
  const [spotIndex, setSpotIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null), frame = useRef<HTMLDivElement>(null);
  const near = useNear(sectionRef);
  const model = models[wearer], spot = spotIndex === null ? null : model.spots[spotIndex];

  const pickWearer = (next: Wearer) => { setWearer(next); setSpotIndex(null); };
  const pickSpot = (index: number) => {
    setSpotIndex((current) => (current === index ? null : index));
    // On phones the photograph sits above the index: bring it back into view.
    const box = frame.current?.getBoundingClientRect();
    if (box && window.innerWidth <= 860 && box.top < 0) frame.current!.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <section ref={sectionRef} id="try-on" className="tryon" data-scene="04" data-tone="dark" aria-labelledby="try-on-title">
    <div className="tryon__frame" ref={frame} style={{ aspectRatio: `${model.width} / ${model.height}` }} data-selected={spot ? "true" : undefined}>
      <div className="tryon__camera" style={{ "--z": spot ? spot.zoom : 1, transform: `scale(${spot ? spot.zoom : 1})`, transformOrigin: spot ? `${spot.x}% ${spot.y}%` : "50% 40%" } as CSSProperties}>
        {near && <img key={wearer} className="tryon__photo" src={model.src} alt={model.alt} />}
        {model.spots.map((entry, index) => <button key={entry.name} type="button" className="tryon__dot" style={{ left: `${entry.x}%`, top: `${entry.y}%` }} aria-label={`Focus on the ${entry.name.toLowerCase()}`} aria-pressed={index === spotIndex} onClick={() => pickSpot(index)} />)}
      </div>
      {spot && <div key={`${wearer}-${spot.name}`} className="tryon__focus" aria-live="polite">
        <span>{String((spotIndex ?? 0) + 1).padStart(2, "0")} · {spot.note}</span><strong>{spot.name}</strong>
        <a href={`/designs?q=${encodeURIComponent(spot.search)}`}>See {spot.vault} in the Design Vault</a>
        <button type="button" onClick={() => setSpotIndex(null)}>See the whole look</button>
      </div>}
      <span className="tryon__tag">AI-generated model. Jewellery is illustrative, not shop stock.</span>
    </div>
    <div className="tryon__copy">
      <h2 id="try-on-title">See it on.</h2>
      <p>Pick a piece and the view moves to where it is worn, so you can judge its size and place before you open the designs.</p>
      <div className="tryon__who" role="group" aria-label="Show pieces for">
        {(["women", "men"] as const).map((option) => <button key={option} type="button" aria-pressed={wearer === option} onClick={() => pickWearer(option)}>{option === "women" ? "Women" : "Men"}</button>)}
      </div>
      <ol className="tryon__index" key={wearer}>
        {model.spots.map((entry, index) => <li key={entry.name} style={{ "--i": index } as CSSProperties}>
          <button type="button" className="tryon__item" aria-pressed={index === spotIndex} onClick={() => pickSpot(index)}>
            <b>{String(index + 1).padStart(2, "0")}</b><span>{entry.name}<small>{entry.note}</small></span><i aria-hidden="true" />
          </button>
        </li>)}
      </ol>
    </div>
  </section>;
}

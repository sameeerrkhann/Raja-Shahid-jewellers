"use client";
/* eslint-disable @next/next/no-img-element -- the photograph is moved by the camera transform. */

import { useRef, useState, type CSSProperties } from "react";
import { useNear } from "./use-near";
import type { Wearer } from "@/config/showcase";
import { wornLooks } from "@/config/showcase";

/* See it on: real photographs of jewellery being worn. Pick women or men and a look, then a piece:
   the camera moves in on where it is worn and names it, with a way into the matching designs. */
export function TryOn() {
  const [wearer, setWearer] = useState<Wearer>("women");
  const [lookIndex, setLookIndex] = useState(0);
  const [spotIndex, setSpotIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null), frame = useRef<HTMLDivElement>(null);
  const near = useNear(sectionRef);
  const looks = wornLooks[wearer], look = looks[lookIndex], spot = spotIndex === null ? null : look.spots[spotIndex];

  const pickWearer = (next: Wearer) => { setWearer(next); setLookIndex(0); setSpotIndex(null); };
  const pickLook = (index: number) => { setLookIndex(index); setSpotIndex(null); };
  const pickSpot = (index: number) => {
    setSpotIndex((current) => (current === index ? null : index));
    // On phones the photograph sits above the choices: bring it back into view.
    const box = frame.current?.getBoundingClientRect();
    if (box && window.innerWidth <= 860 && box.top < 0) frame.current!.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <section ref={sectionRef} id="try-on" className="tryon" data-scene="04" data-tone="dark" aria-labelledby="try-on-title">
    <div className="tryon__copy">
      <h2 id="try-on-title">See it on.</h2>
      <p>Choose who and a look, then a piece. The view moves to where it is worn, so you can judge its size and place before you open the designs.</p>
      <div className="tryon__who" role="group" aria-label="Show looks for">
        {(["women", "men"] as const).map((option) => <button key={option} type="button" aria-pressed={wearer === option} onClick={() => pickWearer(option)}>{option === "women" ? "Women" : "Men"}</button>)}
      </div>
      <div className="tryon__looks" role="group" aria-label="Choose a look">
        {looks.map((entry, index) => <button key={entry.id} type="button" className="tryon__look" aria-pressed={index === lookIndex} onClick={() => pickLook(index)}>
          {near && <img src={entry.thumb} alt="" />}<span>{entry.title}</span></button>)}
      </div>
      <h3 className="tryon__subhead">In this look</h3>
      <ul className="tryon__spots">
        {look.spots.map((entry, index) => <li key={entry.name}><button type="button" className="tryon__item" aria-pressed={index === spotIndex} onClick={() => pickSpot(index)}><i aria-hidden="true" />{entry.name}</button></li>)}
      </ul>
      <p className="tryon__credit">Photo: {look.credit} on Pexels. Reference photography; the jewellery shown is not shop stock.</p>
    </div>
    <div className="tryon__frame" ref={frame} style={{ aspectRatio: `${look.width} / ${look.height}` }} data-selected={spot ? "true" : undefined}>
      <div className="tryon__camera" style={{ "--z": spot ? spot.zoom : 1, transform: `scale(${spot ? spot.zoom : 1})`, transformOrigin: spot ? `${spot.x}% ${spot.y}%` : "50% 45%" } as CSSProperties}>
        {near && <img key={look.id} className="tryon__photo" src={look.src} alt={look.alt} />}
        {look.spots.map((entry, index) => <button key={entry.name} type="button" className="tryon__dot" style={{ left: `${entry.x}%`, top: `${entry.y}%` }} aria-label={`Focus on the ${entry.name.toLowerCase()}`} aria-pressed={index === spotIndex} onClick={() => pickSpot(index)} />)}
      </div>
      {spot && <div key={`${look.id}-${spot.name}`} className="tryon__focus" aria-live="polite">
        <span>In this look</span><strong>{spot.name}</strong>
        <a href={`/designs?q=${encodeURIComponent(spot.search)}`}>See {spot.vault.toLowerCase()} in the Design Vault</a>
        <button type="button" onClick={() => setSpotIndex(null)}>See the whole look</button>
      </div>}
      <span className="tryon__tag">Reference photography. Not our jewellery.</span>
    </div>
  </section>;
}

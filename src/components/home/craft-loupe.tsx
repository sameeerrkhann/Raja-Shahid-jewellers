"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { EditorialImage } from "./editorial-image";

const PHOTO = "/images/editorial/pendant-detail.jpg";

// Each stop is a point on the reference photograph (percent of width / height) and what the loupe shows there.
const stops = [
  { name: "Form", x: 54, y: 51, text: "A domed rosette: rows of petals rising to a single red cabochon at the crown." },
  { name: "Light", x: 22, y: 50, text: "A chain of turned links. Each one catches its own point of light." },
  { name: "Feeling", x: 66, y: 68, text: "A fringe of small beads below the dome, made to move as the wearer moves." },
] as const;

/**
 * Scene 02 — a jeweller's loupe moves across one photograph.
 * Select a detail (any device) or, on desktop, scroll while the scene is pinned: HomepageMotion
 * sends "rsj:craft-stop" with the stop index and the lens glides there with a CSS transition.
 */
export function CraftLoupe() {
  const root = useRef<HTMLDivElement>(null);
  const [stop, setStop] = useState(0);
  const current = stops[stop];

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const onStop = (event: Event) => setStop((event as CustomEvent<number>).detail);
    element.addEventListener("rsj:craft-stop", onStop);
    return () => element.removeEventListener("rsj:craft-stop", onStop);
  }, []);

  return <div ref={root} className="home-craft__frame container" data-craft-pin>
    <div className="home-craft__copy">
      <h2 id="craft-title" data-home-reveal>Beauty begins<br />with <em>the detail.</em></h2>
      <p data-home-reveal>A curve. A setting. The rhythm of a thousand little decisions. Look closer, and a piece becomes a world of its own.</p>
      <ol className="craft-notes" aria-label="Details under the loupe">
        {stops.map((entry, index) => <li key={entry.name}>
          <button type="button" aria-pressed={index === stop} onClick={() => setStop(index)}>
            <span className="craft-notes__name">{entry.name}</span>
            <span className="craft-notes__text">{entry.text}</span>
          </button>
        </li>)}
      </ol>
      <p className="home-reference-note">A photographic study of ornament—not a claim about the shop’s workshop or making techniques.</p>
    </div>
    <figure className="home-craft__figure">
      <div className="craft-loupe" style={{ "--lx": current.x, "--ly": current.y } as CSSProperties}>
        <EditorialImage src={PHOTO} alt="Close-up of a circular pendant and beaded necklace; reference photography by Vaibhav Nagare" fill sizes="(max-width: 767px) 100vw, 52vw" quality={85} className="craft-loupe__photo" />
        {stops.map((entry, index) => <span key={entry.name} className="craft-loupe__mark" data-on={index === stop || undefined} style={{ left: `${entry.x}%`, top: `${entry.y}%` }} aria-hidden="true" />)}
        <span className="craft-loupe__lens" style={{ backgroundImage: `url(${PHOTO})` }} aria-hidden="true" />
      </div>
      <figcaption><span>Under the loupe: {current.name.toLowerCase()}</span><span>Reference photograph, magnified 2.5×</span></figcaption>
    </figure>
  </div>;
}

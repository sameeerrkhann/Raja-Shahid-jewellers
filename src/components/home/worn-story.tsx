"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ShowcaseItem } from "@/lib/catalogue/showcase";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { WearFigure, wearAnchor } from "./wear-figure";

const placementCopy = { neck: "Sits at the collarbone", finger: "Worn on the ring finger", wrist: "Rests at the wrist" } as const;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "true";

/**
 * Scene 01b — the piece chosen in the turning vault, worn.
 * State only: the scroll choreography (frame opening, piece travelling to its place, copy arriving)
 * is driven by HomepageMotion through three CSS custom properties on the section:
 *   --open   0 → 1  the portrait frame widens from a medallion to a full frame
 *   --travel 1 → 0  the piece moves from the centre to where it is worn
 *   --reveal 0 → 1  details arrive
 * Their defaults are the finished state, so mobile, reduced motion and no-JS show a complete layout.
 */
export function WornStory({ items }: { items: ShowcaseItem[] }) {
  const section = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const lockedUntil = useRef(0);

  useEffect(() => {
    // The hero reports every piece it turns to; follow it, except right after an explicit choice,
    // when the smooth scroll down through the hero would otherwise turn the orbit past it.
    const follow = (event: Event) => { if (performance.now() > lockedUntil.current) setIndex((event as CustomEvent<number>).detail); };
    const wear = (event: Event) => {
      lockedUntil.current = performance.now() + 2200;
      setIndex((event as CustomEvent<number>).detail);
      const element = section.current;
      if (!element) return;
      const header = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
      // Pinned (desktop): land where the piece has settled and the details are in, so the whole sequence plays on the way down.
      const start = Number(element.dataset.scrollStart), end = Number(element.dataset.scrollEnd);
      const top = start && end ? start + (end - start) * .82 : element.getBoundingClientRect().top + window.scrollY - header;
      window.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
    };
    window.addEventListener("rsj:showcase-active", follow);
    window.addEventListener("rsj:wear", wear);
    return () => { window.removeEventListener("rsj:showcase-active", follow); window.removeEventListener("rsj:wear", wear); };
  }, []);

  const item = items[index];
  if (!item) return null;
  const anchor = wearAnchor[item.wear];

  return <section ref={section} id="worn" className="worn home-scene" data-scene="01b" data-tone="dark" data-worn-pin aria-labelledby="worn-title">
    <div className="container worn__layout">
      <figure className="worn__frame" data-wear={item.wear}>
        <div className="worn__canvas">
          {item.onModel
            // eslint-disable-next-line @next/next/no-img-element -- shop-supplied photograph, pre-sized WebP
            ? <img className="worn__photo" src={item.onModel.src} alt={item.onModel.alt} loading="lazy" decoding="async" />
            : <div className="worn__study"><WearFigure kind={item.wear} /></div>}
          <span className="worn__piece" style={{ "--x": anchor.x, "--y": anchor.y, "--size": anchor.size } as CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element -- same pre-built WebP derivatives as the hero */}
            <img key={item.id} src={item.small} srcSet={`${item.small} 480w, ${item.large} 960w`} sizes="(min-width: 1024px) 320px, 50vw" width={480} height={480} alt={item.onModel ? "" : `${item.title}, shown where it is worn`} loading="lazy" decoding="async" />
          </span>
        </div>
        <figcaption>{item.onModel ? `${item.title}, photographed on a model.` : "A fitting study: a line drawing that shows where the piece sits. On-model photographs will replace it once the shop supplies them."}</figcaption>
      </figure>

      <div className="worn__copy">
        <h2 id="worn-title" className="worn__title">{item.title}</h2>
        <p className="worn__placement">{placementCopy[item.wear]}</p>
        <p className="worn__description">{item.description}</p>
        <dl className="worn__facts">
          <div><dt>Category</dt><dd>{item.category}, {item.subcategory.toLowerCase()}</dd></div>
          <div><dt>Design code</dt><dd>{item.code}</dd></div>
          <div><dt>Sample status</dt><dd>{item.status}</dd></div>
        </dl>
        <div className="worn__actions">
          <ButtonLink href={item.href}>View in the Design Vault <Icon name="arrow" /></ButtonLink>
          <a className="home-underlined-link" href="#entrance">Turn the vault again</a>
        </div>
        <div className="worn__switch" role="group" aria-label="Choose a piece to see worn">
          {items.map((entry, position) => <button key={entry.id} type="button" aria-pressed={position === index} aria-label={entry.title} onClick={() => { lockedUntil.current = performance.now() + 600; setIndex(position); }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 480px derivative used as a thumbnail */}
            <img src={entry.small} alt="" width={48} height={48} loading="lazy" decoding="async" />
          </button>)}
        </div>
      </div>
    </div>
  </section>;
}

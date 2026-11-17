"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { ShowcaseItem } from "@/lib/catalogue/showcase";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ShowcaseViewer } from "./showcase-viewer";

const wrap = (value: number, length: number) => ((value % length) + length) % length;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "true";

/**
 * Scene 01 — a turning orbit of sample designs.
 * The orbit geometry lives in CSS (sin/cos of each item's angle); JavaScript only writes one
 * custom property, --pos, so a frame costs a single style write.
 * Desktop: HomepageMotion pins the section and feeds scroll progress in through "rsj:showcase-progress".
 * Mobile / reduced motion: drag, tap, arrow keys and the prev/next controls turn the orbit directly.
 */
export function ShowcaseHero({ items }: { items: ShowcaseItem[] }) {
  const count = items.length;
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pos = useRef(0);
  const chase = useRef({ target: 0, frame: 0 });
  const drag = useRef<{ x: number; start: number; id: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const [failed, setFailed] = useState<Record<number, true>>({});

  const layout = useCallback((value: number) => {
    pos.current = value;
    stage.current?.style.setProperty("--pos", value.toFixed(4));
    const next = wrap(Math.round(value), count);
    setActive((current) => (current === next ? current : next));
  }, [count]);

  // One exponential follower serves scroll, clicks and drag release: the orbit always travels along its arc.
  const glideTo = useCallback((target: number) => {
    const state = chase.current;
    state.target = target;
    if (reducedMotion()) { cancelAnimationFrame(state.frame); state.frame = 0; layout(target); return; }
    if (state.frame) return;
    // Time-based easing: the same glide on a 30 Hz phone and a 144 Hz monitor (≈0.12 per 60 Hz frame).
    let last = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(64, now - last);
      last = now;
      const difference = state.target - pos.current;
      if (Math.abs(difference) < 0.002) { layout(state.target); state.frame = 0; return; }
      layout(pos.current + difference * (1 - Math.pow(0.88, elapsed / 16.667)));
      state.frame = requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);
  }, [layout]);

  const pinned = () => section.current?.dataset.pinned === "true";

  const select = useCallback((index: number) => {
    const target = wrap(index, count);
    if (section.current?.dataset.pinned === "true") {
      section.current.dispatchEvent(new CustomEvent<number>("rsj:showcase-goto", { detail: target }));
      return;
    }
    const base = Math.round(chase.current.frame ? chase.current.target : pos.current);
    const half = Math.floor(count / 2);
    glideTo(base + wrap(target - wrap(base, count) + half, count) - half);
  }, [count, glideTo]);

  const step = (direction: number) => select(active + direction);
  const wear = (index: number) => window.dispatchEvent(new CustomEvent<number>("rsj:wear", { detail: index }));

  // Tell the worn story below which piece is at the front.
  useEffect(() => { window.dispatchEvent(new CustomEvent<number>("rsj:showcase-active", { detail: active })); }, [active]);

  // An image can fail before React attaches onError (server-rendered markup); detect that once on mount.
  useEffect(() => {
    stage.current?.querySelectorAll<HTMLImageElement>(".showcase__medal img").forEach((image, index) => {
      if (image.complete && image.naturalWidth === 0) setFailed((current) => ({ ...current, [index]: true }));
    });
  }, []);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const state = chase.current;
    const onProgress = (event: Event) => glideTo((event as CustomEvent<number>).detail * (count - 1));
    const onRelease = () => glideTo(Math.round(pos.current));
    element.addEventListener("rsj:showcase-progress", onProgress);
    element.addEventListener("rsj:showcase-release", onRelease);
    return () => {
      element.removeEventListener("rsj:showcase-progress", onProgress);
      element.removeEventListener("rsj:showcase-release", onRelease);
      cancelAnimationFrame(state.frame);
      state.frame = 0;
    };
  }, [count, glideTo]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { x: event.clientX, start: pos.current, id: event.pointerId, moved: false };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const distance = event.clientX - current.x;
    if (!current.moved) {
      if (Math.abs(distance) < 8) return;
      current.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
    }
    const perItem = Math.max(120, event.currentTarget.clientWidth / 4.5);
    chase.current.target = current.start - distance / perItem;
    layout(chase.current.target);
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    drag.current = null;
    if (!current?.moved) return;
    delete event.currentTarget.dataset.dragging;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    const nearest = Math.round(pos.current);
    if (pinned()) select(nearest);
    else glideTo(nearest);
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
  }

  const item = items[active];
  const counter = (value: number) => String(value).padStart(2, "0");

  return <section ref={section} className="home-hero showcase home-scene" id="entrance" data-scene="01" data-tone="dark" data-showcase data-count={count} aria-labelledby="entrance-title">
    <div className="showcase__backdrop" data-hero-visual aria-hidden="true"><span className="showcase__glow" /><span className="showcase__ring" /><span className="showcase__ring showcase__ring--inner" /></div>

    <div className="container showcase__layout">
      <div className="showcase__copy">
        
        <h1 id="entrance-title"><span data-entrance-line>Beyond</span>{" "}<em data-entrance-line>the moment.</em></h1>
        <p className="showcase__intro" data-entrance-line>Not simply worn. Felt. Remembered. Kept.<br /><span>Turn the vault — every piece invites a closer look.</span></p>
        <div className="showcase__actions" data-entrance-line><ButtonLink href="#vault">Enter the Design Vault <Icon name="arrow" /></ButtonLink><a className="home-underlined-link" href="#auria">Imagine with AURIA</a></div>
      </div>

      <div className="showcase__theatre">
        <div ref={stage} className="showcase__stage" style={{ "--n": count, "--pos": 0 } as CSSProperties} role="group" aria-roledescription="carousel" aria-label="Sample designs. Drag, scroll or use the arrow keys to turn the vault; select the front piece to see it worn."
          onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onKeyDown={keyDown}>
          <span className="showcase__plinth" aria-hidden="true" />
          <ul className="showcase__orbit">
            {items.map((entry, index) => { const distance = Math.min(wrap(index - active, count), wrap(active - index, count)); return <li key={entry.id} className="showcase__slot" style={{ "--i": index } as CSSProperties} inert={distance / count > 0.31 || undefined}>
              <button type="button" className="showcase__item" aria-current={index === active} aria-label={index === active ? `See ${entry.title}, ${entry.code}, worn` : `Turn to ${entry.title}, ${entry.code}`}
                onClick={() => { if (suppressClick.current) return; if (index === active) wear(index); else select(index); }}>
                <span className="showcase__medal" data-media-failed={failed[index] || undefined}>
                  {failed[index] ? <span className="showcase__fallback"><em>{entry.title}</em><small>Image unavailable</small></span>
                    // eslint-disable-next-line @next/next/no-img-element -- responsive pre-built WebP derivatives; next/image optimisation is not used for these local assets
                    : <img src={entry.small} srcSet={`${entry.small} 480w, ${entry.large} 960w`} sizes="(min-width: 1024px) 340px, 62vw" width={480} height={480} alt="" draggable={false}
                      loading={index < 4 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} decoding="async" data-hero-image={index === 0 ? "" : undefined}
                      onError={() => setFailed((current) => ({ ...current, [index]: true }))} />}
                </span>
              </button>
            </li>; })}
          </ul>
          <p className="showcase__hint" aria-hidden="true"><span>Drag<span className="showcase__hint-scroll"> or scroll</span> to turn</span><span>Select the front piece to see it worn</span></p>
        </div>

        <div className="showcase__detail">
          <p className="showcase__counter" aria-hidden="true"><span>{counter(active + 1)}</span>/ {counter(count)}</p>
          <div className="showcase__info" aria-live="polite">
            <p className="eyebrow">{item.category} · {item.subcategory}</p>
            <h2 className="showcase__title">{item.title}</h2>
            <p className="showcase__description">{item.description}</p>
            <p className="showcase__meta"><span>{item.code}</span><span className="showcase__status">Sample · {item.status}</span></p>
          </div>
          <div className="showcase__controls">
            <button type="button" className="button button--gold showcase__wear" onClick={() => wear(active)}>See it worn <Icon name="arrow" /></button>
            <button type="button" className="button button--outline showcase__look" onClick={() => setViewer(active)}>Look closer <Icon name="search" /></button>
            <div className="showcase__arrows"><button type="button" className="icon-button" aria-label="Previous design" onClick={() => step(-1)}><Icon name="arrow" className="arrow-back" /></button><button type="button" className="icon-button" aria-label="Next design" onClick={() => step(1)}><Icon name="arrow" /></button></div>
          </div>
        </div>
      </div>
    </div>

    <div className="container showcase__footer">
      <a href="#craft" className="home-scroll-cue"><span className="home-scroll-cue__line" aria-hidden="true" />Scroll to turn the vault <span aria-hidden="true">↓</span></a>
      <ol className="showcase__ticks" aria-hidden="true">{items.map((entry, index) => <li key={entry.id} data-on={index === active || undefined} />)}</ol>
      <p>AI-generated concept imagery<br />Sample designs, not shop stock</p>
    </div>

    <ShowcaseViewer items={items} index={viewer} onClose={() => setViewer(null)} onStep={(direction) => setViewer((current) => current === null ? null : wrap(current + direction, count))} />
  </section>;
}

"use client";
/* eslint-disable @next/next/no-img-element -- frames and cut-outs are drawn, transformed and layered by GSAP. */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ShowcaseNote } from "@/config/showcase";
import { ringFilm } from "@/config/showcase";
import { useNear } from "./use-near";

export type ShowcasePiece = { code: string; title: string; kind: string; facts: string[]; href: string; photo: string; cutout: string; focus: { x: number; y: number }; notes: ShowcaseNote[] };

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "true";

/* Three pinned scenes driven by scroll (GSAP ScrollTrigger):
   01 the ring film turns frame by frame while the camera walks into the stone;
   02 the collection turns on an arc (coverflow); the centred or tapped piece is chosen;
   03 the lens dives into the chosen piece's detail, pulls back, and notes what is visible. */
export function ScrollShowcase({ pieces }: { pieces: ShowcasePiece[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [chosen, setChosen] = useState(0);
  const [centre, setCentre] = useState(0);
  const tapped = useRef(false);
  const chosenRef = useRef(0);
  const swapRef = useRef<(index: number) => void>(() => {});
  const piece = pieces[chosen];
  const arcRef = useRef<HTMLElement>(null), lensRef = useRef<HTMLElement>(null);
  const arcNear = useNear(arcRef), lensNear = useNear(lensRef);

  useEffect(() => { chosenRef.current = chosen; }, [chosen]);

  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    let disposed = false;
    let teardown = () => {};
    async function start() {
      teardown(); teardown = () => {};
      scope!.dataset.showcase = "static";
      scope!.style.setProperty("--showcase-header", `${document.querySelector(".site-header")?.getBoundingClientRect().height ?? 76}px`);
      if (reducedMotion()) return;
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (disposed || reducedMotion()) return;
      gsap.registerPlugin(ScrollTrigger);
      const $ = <T extends Element>(selector: string) => scope!.querySelector<T>(selector)!;
      const $$ = (selector: string) => Array.from(scope!.querySelectorAll<HTMLElement>(selector));
      const header = () => document.querySelector(".site-header")?.getBoundingClientRect().height ?? 76;
      const phone = () => window.innerWidth <= 860;
      const ctx = gsap.context(() => {
        scope!.dataset.showcase = "live";

        /* ── 01: the film ── */
        const canvas = $<HTMLCanvasElement>("[data-film]"), paint2d = canvas.getContext("2d")!;
        const source = phone() ? ringFilm.mobile : ringFilm.desktop;
        // Frames load in two passes so the page stays light: every eighth frame at once (enough to turn the
        // ring coarsely), the rest only once the visitor starts scrolling.
        const frames: HTMLImageElement[] = Array.from({ length: ringFilm.frames }, () => new Image());
        const load = (i: number) => { const image = frames[i]; if (image.src) return; image.decoding = "async"; image.onload = () => { if (Math.abs(i - current) < 1.5) paint(current); }; image.src = source(i); };
        for (let i = 0; i < frames.length; i += 8) load(i);
        let loadedAll = false;
        const loadRest = () => { if (loadedAll) return; loadedAll = true; frames.forEach((_, i) => load(i)); };
        const ready = (image?: HTMLImageElement) => Boolean(image && image.complete && image.naturalWidth);
        const near = (i: number) => { let image = frames[i]; for (let d = 1; !ready(image) && d < frames.length; d++) image = frames[i - d] ?? frames[i + d]; return ready(image) ? image : null; };
        const draw = (image: HTMLImageElement, alpha: number) => {
          const w = canvas.width, h = canvas.height, s = Math.max(w / image.naturalWidth, h / image.naturalHeight);
          paint2d.globalAlpha = alpha; paint2d.drawImage(image, (w - image.naturalWidth * s) / 2, (h - image.naturalHeight * s) / 2, image.naturalWidth * s, image.naturalHeight * s); paint2d.globalAlpha = 1;
        };
        // Neighbouring frames are blended so the turn reads as motion rather than steps.
        const paint = (f: number) => { const a = Math.floor(f), A = near(a), B = near(Math.min(frames.length - 1, a + 1)); if (!A) return; draw(A, 1); if (B && f - a > .02) draw(B, f - a); };
        const fit = () => { const r = Math.min(window.devicePixelRatio || 1, 2); canvas.width = canvas.clientWidth * r; canvas.height = canvas.clientHeight * r; paint(current); };
        let target = 0, current = 0;
        // The film follows the scroll with its own easing, so it glides on briefly after the wheel stops.
        const glide = () => { const d = target - current; if (Math.abs(d) < .002) return; current += d * .12; paint(current); };
        gsap.ticker.add(glide);
        window.addEventListener("resize", fit); fit();
        const film = { f: 0 }, last = ringFilm.frames - 1, follow = () => { target = film.f; if (film.f > 0) loadRest(); };
        gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { id: "showcase-film", trigger: "#entrance", start: () => `top ${header()}`, end: "bottom bottom", scrub: 1.2, invalidateOnRefresh: true } })
          .to(film, { f: last, duration: .3, onUpdate: follow }, 0)
          .to(film, { f: last * .35, duration: .25, onUpdate: follow }, .3)
          .to(film, { f: last, duration: .3, onUpdate: follow }, .55)
          .fromTo("[data-film]", { rotate: -2.5, y: 0, scale: 1.04 }, { rotate: 2.5, y: () => -window.innerHeight * .04, scale: 1.12, duration: .6 }, 0)
          .to("[data-film-intro]", { opacity: 0, y: -24, duration: .08 }, .1)
          .fromTo("[data-huge] span:first-child", { x: 0 }, { x: () => -window.innerWidth * .45, opacity: .2, duration: .5 }, .05)
          .fromTo("[data-huge] span:last-child", { x: 0 }, { x: () => window.innerWidth * .45, opacity: .2, duration: .5 }, .05)
          .fromTo("[data-film-caption]", { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: .06 }, .24)
          .to("[data-film-caption]", { opacity: 0, duration: .05 }, .56)
          .to("[data-film]", { scale: 3.4, rotate: 0, duration: .36, ease: "power2.in" }, .64)
          .to("[data-flare]", { opacity: 1, duration: .14, ease: "power1.in" }, .86);

        /* ── 02: the arc ── */
        const cards = $$("[data-card]"), arc = { at: 0 };
        let shown = -1;
        const layout = () => {
          const spread = phone() ? window.innerWidth * .52 : Math.min(window.innerWidth * .2, 300);
          cards.forEach((card, i) => { const o = i - arc.at, a = Math.abs(o); gsap.set(card, { xPercent: -50, yPercent: -50, x: o * spread, z: -a * 260, rotateY: -o * 34, scale: 1 - Math.min(a, 2) * .08, opacity: a > 2.4 ? 0 : 1 - a * .22, zIndex: 10 - Math.round(a * 2) }); });
          const middle = Math.round(arc.at);
          if (middle !== shown) { shown = middle; setCentre(middle); if (!tapped.current) setChosen(middle); }
        };
        const arcTrigger = ScrollTrigger.create({ id: "showcase-arc", trigger: "#collection", start: () => `top ${header()}`, end: "bottom bottom", scrub: .6, invalidateOnRefresh: true,
          onUpdate: (self) => { arc.at = gsap.utils.clamp(0, cards.length - 1, (self.progress - .15) / .7 * (cards.length - 1)); layout(); } });
        gsap.fromTo("[data-arc]", { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, ease: "none", scrollTrigger: { trigger: "#collection", start: "top bottom", end: () => `top ${header()}`, scrub: .6 } });
        layout();
        scope!.addEventListener("rsj:arc-go", ((event: CustomEvent<number>) => {
          window.scrollTo({ top: arcTrigger.start + (arcTrigger.end - arcTrigger.start) * (.15 + event.detail / Math.max(1, cards.length - 1) * .7), behavior: "smooth" });
        }) as EventListener);

        /* ── 03: the lens ── */
        const lensStage = $<HTMLElement>("#closer [data-stage]"), notes = $<HTMLElement>("[data-notes]"), notesScale = 1.06;
        const square = () => { const sq = Math.max(lensStage.clientWidth, lensStage.clientHeight); lensStage.style.setProperty("--sq", `${sq}px`); return sq; };
        const placeNotes = () => {
          const p = pieces[chosenRef.current], sq = square(), W = lensStage.clientWidth, H = lensStage.clientHeight;
          Array.from(notes.children).forEach((element, i) => {
            const note = p.notes[i], el = element as HTMLElement; if (!note) return;
            const left = W / 2 + ((note.x - p.focus.x) / 100) * sq * notesScale + (p.focus.x / 100 - .5) * sq, top = H / 2 + ((note.y - p.focus.y) / 100) * sq * notesScale + (p.focus.y / 100 - .5) * sq;
            el.style.left = `${left}px`; el.style.top = `${top}px`;
            el.hidden = left < W * .06 || left > W * .94 || top < H * .1 || top > H * .82;
          });
        };
        const lenses = $$("#closer [data-lens]"), rigs = $$("#closer [data-rig]");
        gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { id: "showcase-lens", trigger: "#closer", start: () => `top ${header()}`, end: "bottom bottom", scrub: .7, invalidateOnRefresh: true, onUpdate: placeNotes, onRefresh: placeNotes } })
          .fromTo("[data-white]", { opacity: 1 }, { opacity: 0, duration: .08 }, 0)
          .fromTo(rigs, { scale: 1.3 }, { scale: 1, duration: .12 }, 0)
          .to("[data-shade]", { opacity: 1, duration: .06 }, .1)
          .fromTo("[data-lens-caption]", { opacity: 0 }, { opacity: 1, duration: .02 }, .12)
          .fromTo("[data-line-a]", { opacity: 0, scale: .82, transformOrigin: "0% 50%" }, { opacity: 1, scale: 1, duration: .08 }, .12)
          .to(lenses, { scale: () => (phone() ? 2.6 : 2.9), duration: .32, ease: "power2.inOut" }, .16)
          .to("[data-depth]", { opacity: 1, duration: .16 }, .18)
          .fromTo("[data-sweep]", { opacity: 0, xPercent: -120 }, { opacity: 1, xPercent: 320, duration: .18 }, .24)
          .fromTo("[data-line-b] [data-soft]", { opacity: 0 }, { opacity: 1, duration: .04 }, .24)
          .to("[data-line-b] [data-soft]", { opacity: 0, duration: .06 }, .28)
          .fromTo("[data-line-b] [data-sharp]", { opacity: 0 }, { opacity: 1, duration: .07 }, .26)
          .to("[data-lens-caption]", { opacity: 0, duration: .04 }, .52)
          .to("[data-depth]", { opacity: 0, duration: .06 }, .5)
          .to(lenses, { scale: notesScale, duration: .1, ease: "power2.inOut" }, .54)
          .to("[data-shade]", { opacity: 0, duration: .06 }, .54)
          .to("[data-dim]", { opacity: 1, duration: .06 }, .58)
          .to("[data-notes]", { opacity: 1, duration: .05 }, .62)
          .fromTo("[data-facts]", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .05 }, .64)
          .to({}, { duration: .3 }, .7);
        window.addEventListener("resize", placeNotes);
        // Swapping the piece from the dropdown: a short shutter and a pass of light; scroll stays put.
        swapRef.current = (index: number) => {
          gsap.timeline().to(rigs, { opacity: 0, duration: .35, ease: "power2.in" }).add(() => { tapped.current = true; setChosen(index); })
            .to(rigs, { opacity: 1, duration: .6, ease: "power2.out" }).fromTo("[data-sweep]", { opacity: 1, xPercent: -120 }, { xPercent: 320, duration: .9, ease: "power2.inOut", immediateRender: false }, "<");
        };
        scope!.addEventListener("rsj:place-notes", placeNotes);
        // Each scene publishes its scroll range and progress (used by tests and by the scene links).
        ["entrance", "collection", "closer"].forEach((id) => {
          const section = document.getElementById(id)!;
          ScrollTrigger.create({ trigger: section, start: () => `top ${header()}`, end: "bottom bottom", invalidateOnRefresh: true,
            onRefresh: (self) => { section.dataset.scrollStart = String(Math.round(self.start)); section.dataset.scrollEnd = String(Math.round(self.end)); },
            onUpdate: (self) => { section.dataset.progress = self.progress.toFixed(3); } });
        });
        return () => { gsap.ticker.remove(glide); window.removeEventListener("resize", fit); window.removeEventListener("resize", placeNotes); scope!.removeEventListener("rsj:place-notes", placeNotes); };
      }, scope!);
      teardown = () => { ctx.revert(); swapRef.current = () => {}; delete scope!.dataset.showcase; };
      ScrollTrigger.refresh();
    }
    void start();
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { void start(); };
    preference.addEventListener("change", change);
    const observer = new MutationObserver(change);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reduce-motion"] });
    return () => { disposed = true; preference.removeEventListener("change", change); observer.disconnect(); teardown(); };
  }, [pieces]);

  // Notes depend on the chosen piece: re-place them after it renders.
  useEffect(() => { root.current?.dispatchEvent(new Event("rsj:place-notes")); }, [chosen]);

  const choose = (index: number, viaArc: boolean) => {
    tapped.current = true;
    if (viaArc) { setChosen(index); root.current?.dispatchEvent(new CustomEvent("rsj:arc-go", { detail: index })); }
    else if (root.current?.dataset.showcase === "live") swapRef.current(index); else setChosen(index);
  };

  return <div ref={root} className="showcase">
    <section id="entrance" className="showcase-pin showcase-film" data-scene="01" data-tone="dark" aria-labelledby="entrance-title">
      <div className="showcase-stage">
        {/* The first frame is the still poster (and the largest paint); the canvas takes over once scrolling. */}
        <img className="showcase-film__poster" src={ringFilm.desktop(0)} alt="" width={1280} height={720} fetchPriority="high" data-hero-image />
        <canvas className="showcase-film__canvas" data-film aria-hidden="true" />
        <div className="showcase-film__huge" data-huge aria-hidden="true"><span>Raja</span><span>Shahid</span></div>
        <div className="showcase-film__flare" data-flare aria-hidden="true" />
        <span className="showcase-label">{ringFilm.label}</span>
        <div className="showcase-film__intro" data-film-intro>
          <h1 id="entrance-title"><span data-entrance-line>Crafted to be</span> <span data-entrance-line>remembered.</span></h1>
          <div className="showcase-film__actions"><Link className="button button--gold" href="/designs" prefetch={false}>Explore the Design Vault</Link><button type="button" className="showcase-link" data-home-action="appointment">Plan a showroom visit</button></div>
        </div>
        <div className="showcase-caption showcase-film__caption" data-film-caption><p>Every angle,<br />considered.</p><small>Scroll turns the ring. Keep going and step inside the stone.</small></div>
      </div>
    </section>

    <section ref={arcRef} id="collection" className="showcase-pin showcase-arc" data-scene="02" data-tone="dark" aria-labelledby="collection-title">
      <div className="showcase-stage">
        <div className="showcase-arc__floor" aria-hidden="true" />
        <div className="showcase-arc__ring" data-arc>
          {pieces.map((entry, index) => <button key={entry.code} type="button" className="showcase-card" data-card aria-pressed={index === chosen} aria-label={`${entry.title}, ${entry.kind}`} onClick={() => choose(index, true)}>
            {arcNear && <img src={entry.cutout} alt="" />}
          </button>)}
        </div>
        <div className="showcase-caption showcase-arc__title"><h2 id="collection-title">From the Design Vault</h2><small>Scroll to turn the collection, or tap a piece.</small></div>
        <div className="showcase-caption showcase-arc__name" aria-live="polite"><p>{pieces[centre].title}</p><small>{pieces[centre].kind} · {pieces[centre].facts[0]} · {pieces[centre].code}</small>
          <a className="showcase-pill-button" href="#closer" onClick={() => { tapped.current = true; setChosen(centre); }}>Look closer</a></div>
        <span className="showcase-label">Sample designs, concept images. Not shop stock.</span>
      </div>
    </section>

    <section ref={lensRef} id="closer" className="showcase-pin showcase-lens" data-scene="03" data-tone="dark" aria-labelledby="closer-title">
      <div className="showcase-stage" data-stage>
        <div className="showcase-lens__rig" data-rig><div className="showcase-lens__square" data-lens style={{ transformOrigin: `${piece.focus.x}% ${piece.focus.y}%` }}>{lensNear && <img src={piece.photo} alt={`${piece.title}: ${piece.kind}. Sample concept image.`} />}</div></div>
        <div className="showcase-lens__depth" data-depth aria-hidden="true"><div className="showcase-lens__rig" data-rig><div className="showcase-lens__square" data-lens style={{ transformOrigin: `${piece.focus.x}% ${piece.focus.y}%` }}>{lensNear && <img src={piece.photo} alt="" />}</div></div></div>
        <div className="showcase-lens__sweep" data-sweep aria-hidden="true" /><div className="showcase-lens__shade" data-shade aria-hidden="true" /><div className="showcase-lens__dim" data-dim aria-hidden="true" />
        <div className="showcase-lens__picker"><label htmlFor="closer-piece">Piece</label>
          <select id="closer-piece" aria-label="Choose a piece to look at" value={chosen} onChange={(event) => choose(Number(event.target.value), false)}>{pieces.map((entry, index) => <option key={entry.code} value={index}>{entry.title}</option>)}</select></div>
        <h2 className="sr-only" id="closer-title">A closer look at {piece.title}</h2>
        <div className="showcase-caption showcase-lens__caption" data-lens-caption>
          <p data-line-a>Look closer.</p>
          <p className="showcase-lens__b" data-line-b><span className="sr-only">The detail is the design.</span><span data-soft aria-hidden="true">The detail is the design.</span><span data-sharp aria-hidden="true">The detail is the design.</span></p>
        </div>
        <ul className="showcase-lens__notes" data-notes aria-label={`Details of the ${piece.title}`}>
          {piece.notes.map((note) => <li key={note.title} data-side={note.side}><i aria-hidden="true" /><div><strong>{note.title}</strong><span>{note.text}</span></div></li>)}
        </ul>
        <div className="showcase-lens__facts" data-facts><b>{piece.code}</b><span>{piece.title}</span>{piece.facts.map((fact) => <span key={fact}>{fact}</span>)}<Link href={piece.href} prefetch={false}>Open in the Design Vault</Link></div>
        <div className="showcase-lens__white" data-white aria-hidden="true" />
        <span className="showcase-label">Sample design, concept image. Not shop stock.</span>
      </div>
    </section>
  </div>;
}

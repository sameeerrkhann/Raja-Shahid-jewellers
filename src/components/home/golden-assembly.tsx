"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { HeroNote } from "@/config/hero";

export type AssemblyCollection = { href: string; title: string; detail: string; image: string | null };
export type AssemblyPiece = { title: string; code: string; href: string; facts: string[]; alt: string; cutout: { small: string; large: string }; notes: readonly HeroNote[] };

/* ── Scroll script ────────────────────────────────────────────────────────────────
   One progress value p (0 → 1), over about 2,000px of scroll (desktop), drives the scene and
   its captions. Every number lives here, so the timeline can be retuned without touching the
   drawing code or the CSS. Caption bands (flick-tested in tests/hero-captions.spec.ts):
     band 1  0.00–0.18  the headline, settled on load; loose gold drifts and starts to gather
     band 2  0.18–0.60  "Every grain finds its place." while the dust converges, then
                        "Then the light tells the truth." while light uncovers the photograph
     band 3  0.62–0.89  the piece moves to centre stage; notes draw out to its features
     band 4  0.88–1.00  "Where would you like to begin?"; the piece settles, collections rise */
const ACT = { converge: [0, .36], reveal: [.3, .46], copy: [.14, .18], focus: [.56, .64], noteIn: [.62, .68], noteOut: [.86, .89], exit: [.86, .96] } as const;
const PHASES = [.18, .3, .62, .88];
const MOBILE_END = .53;

/** in/out: opacity ramps (smoothstep). k: the entrance (letters gather, words rise, focus sharpens). */
type CaptionBand = { in: readonly [number, number]; k: readonly [number, number]; out?: readonly [number, number] };
const CAPTIONS: Record<string, CaptionBand> = {
  story: { in: [.18, .2], k: [.18, .25], out: [.57, .6] },
  light: { in: [.3, .32], k: [.3, .38] },
  begin: { in: [.88, .9], k: [.88, .94] },
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const span = (p: number, [from, to]: readonly [number, number]) => clamp((p - from) / (to - from));
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeInOut = (t: number) => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Seeded generator: scattered letters start from the same places on the server and in the browser. */
const seeded = (seed: number) => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };

/** Letters that fly in from scattered offsets and settle, like the dust settling into the piece. */
function ScatterLine({ text, seed }: { text: string; seed: number }) {
  const random = seeded(seed);
  return <span aria-hidden="true">{text.split(" ").map((word, w) => <Fragment key={w}>{w > 0 && " "}<span className="assembly__word">
    {[...word].map((char, c) => <span key={c} className="assembly__char" style={{ "--th": (random() * .55).toFixed(3), "--jx": `${((random() - .5) * 140).toFixed(1)}px`, "--jy": `${((random() - .5) * 96).toFixed(1)}px`, "--jr": `${((random() - .5) * 56).toFixed(1)}deg` } as CSSProperties}>{char}</span>)}
  </span></Fragment>)}</span>;
}

/** Words that rise in reading order. */
function RiseLine({ text }: { text: string }) {
  const words = text.split(" ");
  return <span aria-hidden="true">{words.map((word, w) => <Fragment key={w}>{w > 0 && " "}<span className="assembly__word" style={{ "--th": (w / words.length * .5).toFixed(3) } as CSSProperties}>{word}</span></Fragment>)}</span>;
}

type Dust = { count: number; sx: Float32Array; sy: Float32Array; tx: Float32Array; ty: Float32Array; delay: Float32Array; spin: Float32Array; size: Float32Array; phase: Float32Array; tone: Uint8Array };
type Bokeh = { count: number; x: Float32Array; y: Float32Array; r: Float32Array; depth: Float32Array; alpha: Float32Array; speed: Float32Array };
const TONES = ["#f6dc9c", "#e9c46f", "#d4a64a", "#b7832f", "#fff1c9"];

/** Every dust particle comes to rest on a real gold pixel of the cut-out photograph. */
function buildDust(image: HTMLImageElement, count: number): Dust | null {
  const size = 220;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, size, size);
  const { data } = context.getImageData(0, 0, size, size);
  const solid: number[] = [];
  for (let i = 0; i < size * size; i += 1) if (data[i * 4 + 3] > 150) solid.push(i);
  if (solid.length < 50) return null;
  const dust: Dust = { count, sx: new Float32Array(count), sy: new Float32Array(count), tx: new Float32Array(count), ty: new Float32Array(count), delay: new Float32Array(count), spin: new Float32Array(count), size: new Float32Array(count), phase: new Float32Array(count), tone: new Uint8Array(count) };
  for (let i = 0; i < count; i += 1) {
    const pixel = solid[(Math.random() * solid.length) | 0];
    const x = pixel % size, y = (pixel / size) | 0;
    const light = (data[pixel * 4] + data[pixel * 4 + 1] + data[pixel * 4 + 2]) / 765;
    dust.tx[i] = (x + Math.random()) / size;
    dust.ty[i] = (y + Math.random()) / size;
    dust.tone[i] = light > .78 ? 4 : light > .62 ? 0 : light > .5 ? 1 : light > .38 ? 2 : 3;
    // The field: a slow river of gold across the frame, with a few loose grains everywhere.
    dust.sx[i] = Math.random() * 1.2 - .1;
    const loose = Math.random() < .22;
    dust.sy[i] = loose ? Math.random() : .52 + Math.sin(dust.sx[i] * 4.2 + .6) * .17 + (Math.random() + Math.random() + Math.random() - 1.5) * .11;
    dust.delay[i] = Math.min(1, dust.ty[i] * .55 + Math.random() * .45);
    dust.spin[i] = (1.4 + Math.random() * 2.2) * (Math.random() < .5 ? -1 : 1);
    dust.size[i] = .7 + Math.random() ** 3 * 2.8;
    dust.phase[i] = Math.random() * Math.PI * 2;
  }
  return dust;
}

/** A second, nearer layer: soft out-of-focus lights that drift faster than the dust (depth). */
function buildBokeh(count: number): Bokeh {
  const bokeh: Bokeh = { count, x: new Float32Array(count), y: new Float32Array(count), r: new Float32Array(count), depth: new Float32Array(count), alpha: new Float32Array(count), speed: new Float32Array(count) };
  for (let i = 0; i < count; i += 1) {
    bokeh.depth[i] = .35 + Math.random() * .65;
    bokeh.x[i] = Math.random();
    bokeh.y[i] = Math.random();
    bokeh.r[i] = 6 + bokeh.depth[i] ** 2 * 34;
    bokeh.alpha[i] = .05 + Math.random() * .13;
    bokeh.speed[i] = .004 + Math.random() * .01;
  }
  return bokeh;
}

function lightSprite() {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  const context = sprite.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 226, 160, 1)");
    gradient.addColorStop(.35, "rgba(232, 190, 110, .55)");
    gradient.addColorStop(1, "rgba(200, 150, 70, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  return sprite;
}

/** Leader line from a feature to the edge of the frame where its label sits (square 0–100 space). */
const leader = (note: Pick<HeroNote, "x" | "y" | "labelY" | "side">, unit = 1) => {
  const elbow = note.side === "left" ? 6 : 94, edge = note.side === "left" ? -4 : 104;
  const at = (value: number) => (value * unit).toFixed(1);
  return `M${at(note.x)} ${at(note.y)}L${at(elbow)} ${at(note.labelY)}L${at(edge)} ${at(note.labelY)}`;
};

/**
 * Scene 01 — gold dust assembles a sample design, then the piece is presented and annotated.
 * Desktop: HomepageMotion makes the section tall with a sticky frame and sends scroll progress
 * ("rsj:assembly-progress"); every act reverses when scrolling back. Mobile: the assembly plays once
 * ("rsj:assembly-play"). Without either (no JS, reduced motion, failed motion) a finished still frame shows.
 */
export function GoldenAssembly({ collections, piece }: { collections: AssemblyCollection[]; piece: AssemblyPiece }) {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  // An image that failed before hydration never fires React's onError; check once on mount.
  useEffect(() => { const image = photo.current; if (image?.complete && !image.naturalWidth) setFailed(true); }, []);

  useEffect(() => {
    const root = section.current, surface = canvas.current, image = photo.current, figure = stage.current;
    const frame = surface?.parentElement;
    if (!root || !surface || !image || !figure || !frame) return;
    const context = surface.getContext("2d");
    if (!context) return;

    const lowEnd = (navigator.hardwareConcurrency || 8) <= 4;
    const touch = matchMedia("(max-width: 1023px), (hover: none), (pointer: coarse)").matches;
    const sprite = lightSprite();
    let dust: Dust | null = null;
    const bokeh = buildBokeh(touch ? 22 : lowEnd ? 36 : 60);
    let target = 1, shown = 1, live = false, visible = true, raf = 0, last = performance.now(), playFrom = -1;
    let width = 0, height = 0, ratio = 1;
    // Pointer: raw position, smoothed position, and the tilt/shine it produces (desktop only).
    const pointer = { x: -9999, y: -9999, sx: -9999, sy: -9999, inside: false, tiltX: 0, tiltY: 0, shine: 0 };
    // Style writes only when a value changes: once the scroll settles, frames cost no style work.
    const written = new Map<HTMLElement, Map<string, string>>();
    const write = (element: HTMLElement, name: string, value: string) => {
      let cache = written.get(element);
      if (!cache) written.set(element, cache = new Map());
      if (cache.get(name) === value) return;
      cache.set(name, value);
      element.style.setProperty(name, value);
    };
    const captions = Array.from(root.querySelectorAll<HTMLElement>("[data-caption]"), (element) => ({ element, band: CAPTIONS[element.dataset.caption ?? ""] })).filter((caption) => caption.band);

    const resize = () => {
      ratio = Math.min(devicePixelRatio || 1, lowEnd ? 1.25 : 2);
      width = surface.clientWidth; height = surface.clientHeight;
      surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio);
      // How far the piece travels to reach centre stage. Offsets ignore transforms, so this is stable mid-scroll.
      const centre = figure.offsetLeft + figure.offsetWidth / 2;
      root.style.setProperty("--focus-dx", `${Math.round(frame.clientWidth / 2 - centre)}px`);
      // Leaders are drawn in real pixels (a stretched viewBox would distort the draw-in dash).
      const leaders = figure.querySelector<SVGSVGElement>(".assembly__leaders"), size = leaders?.parentElement?.offsetWidth ?? 0;
      if (leaders && size) {
        leaders.setAttribute("viewBox", `0 0 ${size} ${size}`);
        leaders.querySelectorAll<SVGPathElement>("path").forEach((path) => {
          const { x, y, labelY, side } = path.dataset;
          path.setAttribute("d", leader({ x: Number(x), y: Number(y), labelY: Number(labelY), side: side === "left" ? "left" : "right" }, size / 100));
        });
      }
    };

    const draw = (p: number, time: number, box: DOMRect, frameBox: DOMRect) => {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      // Near layer: soft lights rising with the scroll and leaning away from the cursor.
      const reveal = span(p, ACT.reveal);
      const leanX = pointer.inside ? (pointer.sx / width - .5) : 0, leanY = pointer.inside ? (pointer.sy / height - .5) : 0;
      for (let i = 0; i < bokeh.count; i += 1) {
        const depth = bokeh.depth[i];
        const y = ((bokeh.y[i] - time * bokeh.speed[i] * .00006 - p * .55 * depth) % 1 + 1) % 1;
        const x = bokeh.x[i] + Math.sin(time * .00012 + i) * .01;
        const radius = bokeh.r[i];
        context.globalAlpha = bokeh.alpha[i] * (.55 + .45 * (1 - reveal));
        context.drawImage(sprite, x * width - leanX * depth * 46 - radius, y * (height + 80) - 40 - leanY * depth * 30 - radius, radius * 2, radius * 2);
      }

      // Far layer: the dust that becomes the piece.
      const fade = 1 - reveal ** 1.4;
      if (dust && fade > .01) {
        const bx = box.left - frameBox.left, by = box.top - frameBox.top, bw = box.width, bh = box.height;
        const cx = bx + bw / 2, cy = by + bh / 2;
        const converge = span(p, ACT.converge);
        const px = pointer.inside ? pointer.sx : -9999, py = pointer.inside ? pointer.sy : -9999;
        for (let tone = 0; tone < TONES.length; tone += 1) {
          context.fillStyle = TONES[tone];
          for (let i = 0; i < dust.count; i += 1) {
            if (dust.tone[i] !== tone) continue;
            const e = easeInOut(clamp((converge - dust.delay[i] * .45) / .55));
            const drift = 1 - e;
            const fx = dust.sx[i] * width + Math.sin(time * .00021 + dust.phase[i]) * 16 + ((time * .012 + dust.phase[i] * 40) % 60) - 30;
            const fy = dust.sy[i] * height + Math.sin(dust.sx[i] * 7 + time * .00047 + dust.phase[i]) * 22;
            const gx = bx + dust.tx[i] * bw, gy = by + dust.ty[i] * bh;
            let x = fx + (gx - fx) * e - cx, y = fy + (gy - fy) * e - cy;
            // Swirl only while travelling: none in the resting field, none once in place.
            const angle = dust.spin[i] * Math.sin(Math.PI * e) * .8;
            if (angle) { const c = Math.cos(angle), s = Math.sin(angle); const rx = x * c - y * s; y = x * s + y * c; x = rx; }
            x += cx; y += cy;
            // Loose dust parts around the cursor, like breath across gold leaf.
            if (drift > .2) {
              const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
              if (d2 < 14400 && d2 > 1) { const d = Math.sqrt(d2), push = (1 - d / 120) ** 2 * 30 * drift; x += dx / d * push; y += dy / d * push; }
            }
            const twinkle = .55 + .45 * Math.sin(time * .0023 + dust.phase[i] * 3);
            context.globalAlpha = fade * (drift * (.28 + .7 * twinkle) + e * .95);
            const size = dust.size[i] * drift + 1.35 * e;
            context.fillRect(x - size / 2, y - size / 2, size, size);
          }
        }
      }
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
    };

    const apply = (p: number) => {
      const noteIn = span(p, ACT.noteIn), noteOut = span(p, ACT.noteOut);
      const values: Record<string, number> = {
        "--converge": span(p, ACT.converge), "--sweep": span(p, ACT.reveal), "--copy": 1 - smooth(span(p, ACT.copy)),
        "--focus": easeInOut(span(p, ACT.focus)), "--detail": Math.min(noteIn, 1 - noteOut), "--exit": span(p, ACT.exit), "--cue": 1 - clamp(p / .04),
      };
      for (const name in values) write(root, name, values[name].toFixed(4));
      write(root, "--rx", `${pointer.tiltY.toFixed(2)}deg`);
      write(root, "--ry", `${pointer.tiltX.toFixed(2)}deg`);
      write(root, "--shine", pointer.shine.toFixed(3));
      // Captions: --o is the band's presence, --k its entrance; both reverse when scrolling back.
      for (const { element, band } of captions) {
        write(element, "--o", (smooth(span(p, band.in)) * (band.out ? 1 - smooth(span(p, band.out)) : 1)).toFixed(3));
        write(element, "--k", span(p, band.k).toFixed(3));
      }
      const phase = String(PHASES.filter((edge) => p >= edge).length);
      if (root.dataset.phase !== phase) root.dataset.phase = phase;
    };

    const tick = (now: number) => {
      raf = 0;
      const elapsed = Math.min(64, now - last);
      last = now;
      const k = 1 - Math.pow(.86, elapsed / 16.667); // frame-rate independent smoothing
      if (playFrom >= 0) { const t = clamp((now - playFrom) / 3400); target = t * MOBILE_END; if (t >= 1) playFrom = -1; }
      shown += (target - shown) * k;
      if (Math.abs(target - shown) < .0004) shown = target;
      pointer.sx = pointer.sx < -999 ? pointer.x : pointer.sx + (pointer.x - pointer.sx) * k;
      pointer.sy = pointer.sy < -999 ? pointer.y : pointer.sy + (pointer.y - pointer.sy) * k;

      // Read layout first, then write styles, then draw: no forced layout inside the frame.
      const frameBox = surface.getBoundingClientRect(), box = image.getBoundingClientRect();
      const lit = pointer.inside && !touch && span(shown, ACT.reveal) > .5;
      const aimX = lit ? clamp((pointer.x - (box.left - frameBox.left)) / box.width) : .5;
      const aimY = lit ? clamp((pointer.y - (box.top - frameBox.top)) / box.height) : .5;
      pointer.tiltX += ((aimX - .5) * 9 - pointer.tiltX) * k * .6;
      pointer.tiltY += (-(aimY - .5) * 6 - pointer.tiltY) * k * .6;
      pointer.shine += ((lit ? 1 : 0) - pointer.shine) * k * .5;
      write(root, "--sx", `${(aimX * 100).toFixed(1)}%`);
      write(root, "--sy", `${(aimY * 100).toFixed(1)}%`);
      apply(shown);
      draw(shown, now, box, frameBox);
      if (visible && live && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const wake = () => { if (!raf && live && visible) { last = performance.now(); raf = requestAnimationFrame(tick); } };

    const start = () => {
      if (live) return;
      live = true;
      root.dataset.live = "true";
      shown = target = 0;
      resize();
      apply(0);
      wake();
    };
    const onProgress = (event: Event) => { start(); playFrom = -1; target = (event as CustomEvent<number>).detail; wake(); };
    const onPlay = () => { start(); playFrom = performance.now(); wake(); };
    const onRelease = () => {
      live = false; playFrom = -1; cancelAnimationFrame(raf); raf = 0;
      delete root.dataset.live; delete root.dataset.phase;
      ["--converge", "--sweep", "--copy", "--focus", "--detail", "--exit", "--cue", "--rx", "--ry", "--shine", "--sx", "--sy", "--focus-dx"].forEach((name) => root.style.removeProperty(name));
      captions.forEach(({ element }) => { element.style.removeProperty("--o"); element.style.removeProperty("--k"); });
      written.clear();
      context.clearRect(0, 0, surface.width, surface.height);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (touch || event.pointerType !== "mouse") return;
      const rect = surface.getBoundingClientRect();
      pointer.x = event.clientX - rect.left; pointer.y = event.clientY - rect.top; pointer.inside = true;
      wake();
    };
    const onPointerLeave = () => { pointer.inside = false; };

    const ready = () => {
      dust = buildDust(image, Math.round((touch ? 2200 : 5200) * (lowEnd ? .6 : 1)));
      wake();
    };
    if (image.complete && image.naturalWidth) ready(); else image.addEventListener("load", ready, { once: true });

    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); });
    observer.observe(root);
    const onResize = () => { if (live) { resize(); wake(); } };
    const onVisibility = () => wake();
    root.addEventListener("rsj:assembly-progress", onProgress);
    root.addEventListener("rsj:assembly-play", onPlay);
    root.addEventListener("rsj:assembly-release", onRelease);
    frame.addEventListener("pointermove", onPointerMove, { passive: true });
    frame.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf); observer.disconnect(); image.removeEventListener("load", ready);
      root.removeEventListener("rsj:assembly-progress", onProgress); root.removeEventListener("rsj:assembly-play", onPlay); root.removeEventListener("rsj:assembly-release", onRelease);
      frame.removeEventListener("pointermove", onPointerMove); frame.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const mask = { "--cutout": `url("${piece.cutout.small}")` } as CSSProperties;

  return <section ref={section} id="entrance" className="assembly home-scene" data-scene="01" data-tone="dark" data-assembly aria-labelledby="entrance-title">
    <div className="assembly__frame">
      <canvas ref={canvas} className="assembly__dust" aria-hidden="true" />
      <div className="assembly__glow" aria-hidden="true" />
      <div className="container assembly__layout">
        <div className="assembly__copy">
          <h1 id="entrance-title"><span data-entrance-line>Crafted to be</span> <span data-entrance-line>remembered.</span></h1>
          <p className="assembly__intro" data-entrance-line>Scroll, and loose gold gathers into the {piece.title}, one of the sample designs in our Design Vault.</p>
          <div className="assembly__actions" data-entrance-line>
            <ButtonLink href="/designs">Explore the Design Vault <Icon name="arrow" /></ButtonLink>
            <button type="button" className="home-underlined-link" data-home-action="appointment">Plan a showroom visit</button>
          </div>
          <p className="assembly__cue" aria-hidden="true"><span />Scroll to gather the gold</p>
        </div>
        <figure ref={stage} className="assembly__stage">
          {failed
            ? <div className="assembly__fallback" data-media-failed><em>{piece.title}</em><small>The photograph could not be loaded. The Design Vault still lists every sample design.</small></div>
            : <div className="assembly__piece" style={mask}>
              <div className="assembly__tilt">
                {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized transparent WebP cut-out; the canvas samples its pixels */}
                <img ref={photo} data-hero-image src={piece.cutout.small} srcSet={`${piece.cutout.small} 640w, ${piece.cutout.large} 960w`} sizes="(min-width: 1024px) 46vw, 88vw" width={960} height={960} alt={piece.alt} fetchPriority="high" decoding="async" onError={() => setFailed(true)} />
                <span className="assembly__sweep" aria-hidden="true" />
                <span className="assembly__shine" aria-hidden="true" />
              </div>
              <svg className="assembly__leaders" viewBox="0 0 100 100" aria-hidden="true">
                {piece.notes.map((note) => <path key={note.id} d={leader(note)} pathLength={1} data-x={note.x} data-y={note.y} data-label-y={note.labelY} data-side={note.side} />)}
              </svg>
              {piece.notes.map((note) => <span key={note.id} className="assembly__point" style={{ left: `${note.x}%`, top: `${note.y}%` }} aria-hidden="true" />)}
              <ul className="assembly__notes" aria-label={`Details of the ${piece.title}`}>
                {piece.notes.map((note, index) => <li key={note.id} data-side={note.side} style={{ top: `${note.labelY}%`, "--i": index } as CSSProperties}>
                  <strong>{note.title}</strong><span>{note.text}</span>
                </li>)}
              </ul>
              <div className="assembly__facts">
                <span className="assembly__facts-code">{piece.code}</span>
                {piece.facts.map((fact) => <span key={fact}>{fact}</span>)}
                <Link href={piece.href} prefetch={false}>Open in the Design Vault <Icon name="arrow" /></Link>
              </div>
            </div>}
          <figcaption>Sample design, concept image. Not shop stock.</figcaption>
        </figure>
      </div>
      {/* Caption bands: shown only while the desktop scroll drives the scene (see CAPTIONS). */}
      <div className="container assembly__bands">
        <div className="assembly__band" data-caption="story">
          <p className="assembly__line"><span className="sr-only">Every grain finds its place.</span><ScatterLine text="Every grain finds its place." seed={916} /></p>
          <p className="assembly__line assembly__line--light" data-caption="light">
            <span className="sr-only">Then the light tells the truth.</span>
            <span className="assembly__soft" aria-hidden="true">Then the light tells the truth.</span>
            <span className="assembly__sharp" aria-hidden="true">Then the light tells the truth.</span>
          </p>
        </div>
        <div className="assembly__band assembly__band--begin" data-caption="begin">
          <p className="assembly__line"><span className="sr-only">Where would you like to begin?</span><RiseLine text="Where would you like to begin?" /></p>
        </div>
      </div>
      <ol className="assembly__rail" aria-hidden="true"><li /><li /><li /><li /><li /></ol>
      <nav className="assembly__collections" aria-label="Browse the Design Vault" style={{ "--tiles": collections.length } as CSSProperties}>
        <ul className="container">
          {collections.map((item) => <li key={item.href}>
            <Link href={item.href} prefetch={false}>
              <span className="assembly__tile-image">{item.image
                // eslint-disable-next-line @next/next/no-img-element -- 480px catalogue derivative
                ? <img src={item.image} alt="" width={120} height={120} loading="lazy" decoding="async" />
                : <Icon name="arrow" />}</span>
              <span className="assembly__tile-copy"><span className="assembly__tile-title">{item.title}</span><span className="assembly__tile-detail">{item.detail}</span></span>
            </Link>
          </li>)}
        </ul>
      </nav>
    </div>
  </section>;
}

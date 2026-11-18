"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export type AssemblyCollection = { href: string; title: string; detail: string; image: string | null };

const PIECE = { small: "/images/hero/mehr-collar-640.webp", large: "/images/hero/mehr-collar-960.webp" };

// Scroll phases, as fractions of the hero's scroll travel. The same numbers drive the canvas and the CSS.
const CONVERGE_END = .56, REVEAL_START = .5, REVEAL_END = .74, EXIT_START = .76;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (t: number) => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const phaseOf = (p: number) => (p < .12 ? 0 : p < CONVERGE_END ? 1 : p < EXIT_START ? 2 : 3);

type Dust = { count: number; sx: Float32Array; sy: Float32Array; tx: Float32Array; ty: Float32Array; delay: Float32Array; spin: Float32Array; size: Float32Array; phase: Float32Array; tone: Uint8Array };
const TONES = ["#f6dc9c", "#e9c46f", "#d4a64a", "#b7832f", "#fff1c9"];

/** Sample the cut-out photograph: every particle's resting place is a real gold pixel of the piece. */
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
    // The field: a wide drifting river of gold dust, denser through the middle band.
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

/**
 * Scene 01 — golden particles assemble the Mehr Crescent Collar.
 * Desktop: HomepageMotion makes the section tall and sticky and sends scroll progress ("rsj:assembly-progress");
 * the scene is fully reversible. Mobile: the assembly plays once on a timer ("rsj:assembly-play").
 * Without either event (no JS, reduced motion, failed motion) the finished frame is shown: piece and collections.
 */
export function GoldenAssembly({ collections }: { collections: AssemblyCollection[] }) {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const piece = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  // An image that failed before hydration never fires React's onError; check once on mount.
  useEffect(() => { const image = piece.current; if (image?.complete && !image.naturalWidth) setFailed(true); }, []);

  useEffect(() => {
    const root = section.current, surface = canvas.current, image = piece.current;
    if (!root || !surface || !image) return;
    const context = surface.getContext("2d");
    if (!context) return;
    let dust: Dust | null = null;
    let target = 1, shown = 1, live = false, visible = true, frame = 0, last = performance.now(), playFrom = -1;
    let width = 0, height = 0, ratio = 1;

    const resize = () => {
      ratio = Math.min(devicePixelRatio || 1, 2);
      width = surface.clientWidth; height = surface.clientHeight;
      surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio);
    };

    const draw = (p: number, time: number) => {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      if (!dust) return;
      const fade = 1 - clamp((p - REVEAL_START) / (REVEAL_END - REVEAL_START)) ** 1.4;
      if (fade <= .01) return;
      const box = image.getBoundingClientRect(), frameBox = surface.getBoundingClientRect();
      // Map against the piece's layout box (ignoring the exit scale, which only starts after the dust has gone).
      const bx = box.left - frameBox.left, by = box.top - frameBox.top, bw = box.width, bh = box.height;
      const cx = bx + bw / 2, cy = by + bh / 2;
      const converge = clamp(p / CONVERGE_END);
      context.globalCompositeOperation = "lighter";
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
          const twinkle = .55 + .45 * Math.sin(time * .0023 + dust.phase[i] * 3);
          context.globalAlpha = fade * (drift * (.28 + .7 * twinkle) + e * .95);
          const size = dust.size[i] * drift + 1.35 * e;
          context.fillRect(cx + x - size / 2, cy + y - size / 2, size, size);
        }
      }
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
    };

    const apply = (p: number) => {
      root.style.setProperty("--converge", String(clamp(p / CONVERGE_END)));
      root.style.setProperty("--sweep", String(clamp((p - REVEAL_START) / (REVEAL_END - REVEAL_START))));
      root.style.setProperty("--exit", String(clamp((p - EXIT_START) / (1 - EXIT_START))));
      const phase = String(phaseOf(p));
      if (root.dataset.phase !== phase) root.dataset.phase = phase;
    };

    const tick = (now: number) => {
      frame = 0;
      const elapsed = Math.min(64, now - last);
      last = now;
      if (playFrom >= 0) { const t = clamp((now - playFrom) / 3400); target = t * (REVEAL_END + .01); if (t >= 1) playFrom = -1; }
      // Frame-rate independent glide toward the scroll position: the same feel at 30 or 144 fps.
      shown += (target - shown) * (1 - Math.pow(.86, elapsed / 16.667));
      if (Math.abs(target - shown) < .0004) shown = target;
      apply(shown);
      draw(shown, now);
      const settled = shown === target && playFrom < 0;
      const dustVisible = shown < REVEAL_END;
      if (visible && (!settled || dustVisible)) frame = requestAnimationFrame(tick);
    };
    const wake = () => { if (!frame && live) { last = performance.now(); frame = requestAnimationFrame(tick); } };

    const start = () => {
      if (live) return;
      live = true;
      root.dataset.live = "true";
      shown = target = 0;
      apply(0);
      resize();
      wake();
    };
    const onProgress = (event: Event) => { start(); playFrom = -1; target = (event as CustomEvent<number>).detail; wake(); };
    const onPlay = () => { start(); playFrom = performance.now(); wake(); };
    const onRelease = () => { live = false; playFrom = -1; cancelAnimationFrame(frame); frame = 0; delete root.dataset.live; delete root.dataset.phase; ["--converge", "--sweep", "--exit"].forEach((name) => root.style.removeProperty(name)); context.clearRect(0, 0, surface.width, surface.height); };

    const ready = () => {
      const lowEnd = (navigator.hardwareConcurrency || 8) <= 4;
      const count = Math.round((matchMedia("(max-width: 767px)").matches ? 2200 : 5200) * (lowEnd ? .6 : 1));
      dust = buildDust(image, count);
      if (live) wake();
    };
    if (image.complete && image.naturalWidth) ready(); else image.addEventListener("load", ready, { once: true });

    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); });
    observer.observe(root);
    const onResize = () => { if (live) { resize(); wake(); } };
    root.addEventListener("rsj:assembly-progress", onProgress);
    root.addEventListener("rsj:assembly-play", onPlay);
    root.addEventListener("rsj:assembly-release", onRelease);
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); image.removeEventListener("load", ready); root.removeEventListener("rsj:assembly-progress", onProgress); root.removeEventListener("rsj:assembly-play", onPlay); root.removeEventListener("rsj:assembly-release", onRelease); window.removeEventListener("resize", onResize); };
  }, []);

  return <section ref={section} id="entrance" className="assembly home-scene" data-scene="01" data-tone="dark" data-assembly aria-labelledby="entrance-title">
    <div className="assembly__frame">
      <canvas ref={canvas} className="assembly__dust" aria-hidden="true" />
      <div className="assembly__glow" aria-hidden="true" />
      <div className="container assembly__layout">
        <div className="assembly__copy">
          <h1 id="entrance-title"><span data-entrance-line>Crafted to be</span> <span data-entrance-line>remembered.</span></h1>
          <p className="assembly__intro" data-entrance-line>Scroll, and loose gold gathers into the Mehr Crescent Collar, one of the sample designs in our Design Vault.</p>
          <div className="assembly__actions" data-entrance-line>
            <ButtonLink href="/designs">Explore the Design Vault <Icon name="arrow" /></ButtonLink>
            <button type="button" className="home-underlined-link" data-home-action="appointment">Plan a showroom visit</button>
          </div>
        </div>
        <figure className="assembly__stage">
          {failed
            ? <div className="assembly__fallback" data-media-failed><em>Mehr Crescent Collar</em><small>The photograph could not be loaded. The Design Vault still lists every sample design.</small></div>
            : <span className="assembly__piece">
              {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized transparent WebP cut-out; the canvas samples its pixels */}
              <img ref={piece} data-hero-image src={PIECE.small} srcSet={`${PIECE.small} 640w, ${PIECE.large} 960w`} sizes="(min-width: 1024px) 46vw, 88vw" width={960} height={960} alt="Mehr Crescent Collar: a wide gold collar of floral filigree with a beaded fringe" fetchPriority="high" decoding="async" onError={() => setFailed(true)} />
              <span className="assembly__sweep" aria-hidden="true" />
            </span>}
          <figcaption>Sample design, concept image. Not shop stock.</figcaption>
        </figure>
      </div>
      <ol className="assembly__rail" aria-hidden="true"><li /><li /><li /><li /></ol>
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

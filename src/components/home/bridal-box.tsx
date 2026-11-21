"use client";
/* eslint-disable @next/next/no-img-element -- cut-out pieces are moved in 3D by GSAP. */

import Link from "next/link";
import { useEffect, useRef } from "react";

export type BridalPiece = { code: string; title: string; cutout: string };

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "true";

/* Bridal: a jewellery box opened by scroll. The lid lifts on its hinge, the first set rises out of the
   velvet to face the visitor, and the other sets fan out beside it. Built in CSS 3D; GSAP scrubs it. */
export function BridalBox({ pieces }: { pieces: BridalPiece[] }) {
  const root = useRef<HTMLElement>(null);
  const [hero, ...rest] = pieces;

  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    let disposed = false, teardown = () => {};
    async function start() {
      teardown(); teardown = () => {};
      scope!.dataset.box = "open";
      if (reducedMotion()) return;
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (disposed || reducedMotion()) return;
      gsap.registerPlugin(ScrollTrigger);
      const header = () => document.querySelector(".site-header")?.getBoundingClientRect().height ?? 76;
      const ctx = gsap.context(() => {
        scope!.dataset.box = "live";
        const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { id: "bridal-box", trigger: scope, start: () => `top ${header()}`, end: "bottom bottom", scrub: .8, invalidateOnRefresh: true } })
          .fromTo("[data-box]", { rotateX: 62, rotateZ: -8, y: 40, scale: .92 }, { rotateX: 54, rotateZ: 0, y: 0, scale: 1, duration: .25 }, 0)
          .fromTo("[data-lid]", { rotateX: 0 }, { rotateX: 108, duration: .3, ease: "power2.inOut" }, .12)
          .fromTo("[data-glow]", { opacity: 0, scale: .6 }, { opacity: 1, scale: 1, duration: .25 }, .3)
          .fromTo("[data-rise]", { z: 6, rotateX: 0, scale: .82 }, { z: 170, rotateX: -54, scale: 1.08, duration: .3, ease: "power2.out" }, .4)
          .fromTo("[data-bridal-copy] > *", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .06, stagger: .02 }, 0);
        gsap.utils.toArray<HTMLElement>("[data-fan]", scope!).forEach((piece, i) => tl.fromTo(piece, { opacity: 0, z: 0, rotateX: 0 }, { opacity: 1, z: 110, rotateX: -54, duration: .2 }, .62 + i * .06));
      }, scope!);
      teardown = () => { ctx.revert(); scope!.dataset.box = "open"; };
      ScrollTrigger.refresh();
    }
    void start();
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)"), change = () => { void start(); };
    preference.addEventListener("change", change);
    const observer = new MutationObserver(change);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reduce-motion"] });
    return () => { disposed = true; preference.removeEventListener("change", change); observer.disconnect(); teardown(); };
  }, []);

  return <section ref={root} id="bridal" className="bridal-box" data-scene="05" data-tone="dark" aria-labelledby="bridal-title">
    <div className="bridal-box__stage">
      <div className="bridal-box__copy" data-bridal-copy>
        <h2 id="bridal-title">A promise,<br /><em>beautifully kept.</em></h2>
        <p>Bridal sets from the Design Vault, opened one at a time.</p>
        <Link className="bridal-box__link" href="/designs?category=bridal" prefetch={false}>Explore bridal designs</Link>
      </div>
      <div className="bridal-box__scene" aria-hidden="true">
        <div className="bridal-box__glow" data-glow />
        <div className="bridal-box__box" data-box>
          <div className="bridal-box__floor" />
          <span className="bridal-box__wall bridal-box__wall--back" /><span className="bridal-box__wall bridal-box__wall--front" />
          <span className="bridal-box__wall bridal-box__wall--left" /><span className="bridal-box__wall bridal-box__wall--right" />
          {rest.map((piece, i) => <img key={piece.code} className={`bridal-box__piece bridal-box__piece--fan bridal-box__piece--${i}`} src={piece.cutout} alt="" data-fan />)}
          {hero && <img className="bridal-box__piece bridal-box__piece--hero" src={hero.cutout} alt="" data-rise />}
          <div className="bridal-box__hinge"><div className="bridal-box__lid" data-lid><span className="bridal-box__lid-face"><b>Raja Shahid</b><small>Jewellers</small></span></div></div>
        </div>
      </div>
      <ul className="bridal-box__names" aria-label="Bridal sets in this box">
        {pieces.map((piece) => <li key={piece.code}><Link href={`/designs?q=${encodeURIComponent(piece.code)}`} prefetch={false}>{piece.title}</Link></li>)}
      </ul>
      <span className="bridal-box__label">Sample designs, concept images. Not shop stock.</span>
    </div>
  </section>;
}

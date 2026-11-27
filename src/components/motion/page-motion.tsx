"use client";

import { useEffect } from "react";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "true";

/* Scroll and entrance motion for the inner pages (Design Vault, Collections, Design preview), in the same
   language as the homepage hero: a gold progress line, a hero that settles as you scroll, sections and cards
   that rise in sequence with a soft wipe, images that drift inside their frames, and on wide screens the
   collections laid out as a horizontal run driven by vertical scroll. Content is never hidden without JS:
   every start state is set by GSAP and reverted on cleanup or when motion is reduced. */
export function PageMotion({ page }: { page: "designs" | "collections" | "preview" | "gold" | "installments" }) {
  useEffect(() => {
    let disposed = false, teardown = () => {};
    async function start() {
      teardown(); teardown = () => {};
      document.documentElement.dataset.pageMotion = "static";
      if (reducedMotion()) return;
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (disposed || reducedMotion()) return;
      gsap.registerPlugin(ScrollTrigger);
      const wide = window.matchMedia("(min-width: 1100px) and (pointer: fine)").matches;
      const ctx = gsap.context(() => {
        document.documentElement.dataset.pageMotion = "live";

        // 1. Gold progress line under the header.
        const bar = document.createElement("div"); bar.className = "page-progress"; bar.setAttribute("aria-hidden", "true"); document.body.appendChild(bar);
        gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: .3 } });

        // 2. The hero settles: heading words rise on load, the media drifts and eases back as you scroll.
        const hero = document.querySelector<HTMLElement>(".catalogue-hero, .collections-index-heading, .preview-hero, .gold-hero, .plan-hero");
        if (hero) {
          const heading = hero.querySelector("h1");
          if (heading) gsap.from(heading.children.length ? heading.children : heading, { y: 34, opacity: 0, duration: 1.1, ease: "expo.out", stagger: .12, delay: .1 });
          const media = hero.querySelector(".catalogue-hero__media, .preview-hero__image, .catalogue-hero__grid > :last-child");
          if (media) gsap.fromTo(media, { scale: 1.08, y: 0 }, { scale: 1, y: () => -window.innerHeight * .06, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: .5 } });
          gsap.to(hero.querySelectorAll(".catalogue-hero__copy, .preview-hero__copy, .container > p"), { y: -40, opacity: .2, ease: "none", scrollTrigger: { trigger: hero, start: "center top+=30%", end: "bottom top", scrub: .5 } });
        }

        // 3. Section headings and cards rise in sequence with a soft wipe, once.
        const risers = gsap.utils.toArray<HTMLElement>(".catalogue-related__heading, .catalogue-section-heading, main section > .container > h2, main section h2:not(.chapter h2), .catalogue-disclosure, .design-language__palette > *, .swatch");
        risers.forEach((element) => gsap.from(element, { y: 40, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: element, start: "top 88%", once: true } }));
        ScrollTrigger.batch(".design-card, .vault-collection-card, .product-card, .collection-card", {
          start: "top 90%", once: true,
          onEnter: (batch) => gsap.fromTo(batch, { y: 56, opacity: 0, clipPath: "inset(12% 0% 0% 0%)" }, { y: 0, opacity: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 1.05, ease: "expo.out", stagger: .09, overwrite: true, clearProps: "clipPath" }),
        });

        // 4. Images drift inside their frames while their card crosses the screen.
        if (wide) gsap.utils.toArray<HTMLElement>(".design-card__image img, .vault-collection-card__image img, .product-card__image img, .collection-card > img").forEach((image) => {
          gsap.fromTo(image, { yPercent: -4, scale: 1.08 }, { yPercent: 4, scale: 1.08, ease: "none", scrollTrigger: { trigger: image.parentElement, start: "top bottom", end: "bottom top", scrub: .4 } });
        });

        // 5. Collections, on wide screens: each chapter is sticky; as the next one slides over it, it settles back.
        if (page === "collections" && wide) {
          const cards = gsap.utils.toArray<HTMLElement>("[data-chapter-card]");
          cards.forEach((card, i) => {
            const next = cards[i + 1];
            const media = card.querySelector("[data-chapter-media]"), copy = card.querySelector("[data-chapter-copy]");
            if (media) gsap.fromTo(media, { clipPath: "inset(14% 10% 14% 10% round 24px)" }, { clipPath: "inset(0% 0% 0% 0% round 24px)", ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "top top+=90", scrub: .5 } });
            if (copy) gsap.fromTo(copy.children, { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: .08, duration: .9, ease: "expo.out", scrollTrigger: { trigger: card, start: "top 55%", once: true } });
            if (next) gsap.to(card.querySelector(".chapter__inner"), { scale: .92, opacity: .35, ease: "none", scrollTrigger: { trigger: next, start: "top bottom", end: "top top+=90", scrub: .5 } });
          });
        }
      });
      teardown = () => { ctx.revert(); document.querySelectorAll(".page-progress").forEach((element) => element.remove()); document.documentElement.dataset.pageMotion = "static"; };
      ScrollTrigger.refresh();
    }
    void start();
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)"), change = () => { void start(); };
    preference.addEventListener("change", change);
    const observer = new MutationObserver(change);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reduce-motion"] });
    return () => { disposed = true; preference.removeEventListener("change", change); observer.disconnect(); teardown(); delete document.documentElement.dataset.pageMotion; };
  }, [page]);
  return null;
}

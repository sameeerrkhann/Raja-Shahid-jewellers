"use client";

import { useEffect, type RefObject } from "react";

export function HomepageMotion({ rootRef, reduce }: { rootRef: RefObject<HTMLElement | null>; reduce: boolean }) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let generation = 0;
    let removeMotion = () => {};

    async function configure() {
      const current = ++generation;
      removeMotion();
      removeMotion = () => {};
      if (reduce || preference.matches) { root!.dataset.motionState = "reduced"; return; }
      root!.dataset.motionState = "loading";
      try {
        const hero = root!.querySelector<HTMLImageElement>("[data-hero-image]");
        await Promise.all([document.fonts.ready, hero?.decode().catch(() => undefined)]);
        if (disposed || current !== generation) return;
        if (!hero?.naturalWidth) { root!.dataset.motionState = "fallback"; return; }
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
        if (disposed || current !== generation) return;
        gsap.registerPlugin(ScrollTrigger);
        const media = gsap.matchMedia();
        removeMotion = () => {
          media.revert();
          // GSAP may restore an identity matrix; remove it so the native/reduced track is untransformed.
          root!.querySelector<HTMLElement>("[data-vault-track]")?.style.removeProperty("transform");
          root!.dataset.motionState = "static";
        };

        media.add({ desktop: "(min-width: 1024px) and (min-height: 700px) and (pointer: fine)", mobile: "(max-width: 1023px), (max-height: 699px), (pointer: coarse)" }, (context) => {
          const desktop = Boolean(context.conditions?.desktop);
          root!.dataset.motionState = desktop ? "desktop" : "mobile";
          const headerHeight = () => document.querySelector(".site-header")?.getBoundingClientRect().height ?? 108;
          const craft = root!.querySelector<HTMLElement>("[data-craft-pin]")!;
          const vault = root!.querySelector<HTMLElement>("[data-vault-pin]")!;
          const viewport = root!.querySelector<HTMLElement>("[data-vault-viewport]")!;
          const track = root!.querySelector<HTMLElement>("[data-vault-track]")!;
          const cleanups: (() => void)[] = [];

          gsap.fromTo(root!.querySelectorAll("[data-entrance-line]"), { y: desktop ? 12 : 6, opacity: .9 }, { y: 0, opacity: 1, duration: .6, stagger: .075, ease: "power2.out", clearProps: "transform,opacity" });

          if (desktop) {
            gsap.to(root!.querySelector("[data-hero-visual]"), { scale: 1.03, yPercent: 2, ease: "none", scrollTrigger: { trigger: "#entrance", start: "top top", end: "bottom top", scrub: .5 } });
            gsap.timeline({ scrollTrigger: { id: "home-craft", trigger: craft, start: () => `top ${headerHeight()}`, end: () => `+=${innerHeight * .8}`, pin: true, pinSpacing: true, scrub: .5, invalidateOnRefresh: true, onRefresh: (self) => { craft.dataset.pinTravel = String(self.end - self.start); } } })
              .fromTo(root!.querySelector("[data-craft-media]"), { scale: 1, yPercent: 0 }, { scale: 1.03, yPercent: -4, ease: "none" })
              .fromTo(root!.querySelector(".craft-frame-line"), { scaleY: .4 }, { scaleY: 1, ease: "none" }, 0);
            gsap.fromTo(root!.querySelector("[data-bridal-media]"), { yPercent: -2, scale: 1.03 }, { yPercent: 2, scale: 1, ease: "none", scrollTrigger: { trigger: "#bridal", start: "top bottom", end: "bottom top", scrub: .6 } });
            const overflow = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
            if (overflow() > 0) {
              viewport.scrollLeft = 0;
              vault.dataset.pinned = "true";
              const galleryTween = gsap.to(track, { x: () => -overflow(), ease: "none", scrollTrigger: { id: "home-vault", trigger: vault, start: () => `top ${headerHeight()}`, end: () => `+=${innerHeight}`, pin: true, pinSpacing: true, scrub: .4, invalidateOnRefresh: true, onRefresh: (self) => { vault.dataset.pinTravel = String(self.end - self.start); vault.dataset.scrollStart = String(self.start); vault.dataset.scrollEnd = String(self.end); } } });
              const trigger = galleryTween.scrollTrigger!;
              track.querySelectorAll<HTMLElement>("[data-vault-card]").forEach((card) => {
                const mediaLayer = card.querySelector(".vault-card__photo, .vault-card__drawing");
                gsap.fromTo(mediaLayer, { xPercent: 2, scale: 1.05 }, { xPercent: -2, ease: "none", scrollTrigger: { trigger: card, containerAnimation: galleryTween, start: "left right", end: "right left", scrub: .3 } });
              });
              const setProgress = (progress: number) => { window.scrollTo({ top: trigger.start + Math.max(0, Math.min(1, progress)) * (trigger.end - trigger.start), behavior: "instant" }); ScrollTrigger.update(); };
              const step = (event: Event) => { const direction = (event as CustomEvent<number>).detail; setProgress(trigger.progress + direction * Math.min(1, viewport.clientWidth * .85 / overflow())); };
              const focus = (event: FocusEvent) => {
                const card = (event.target as HTMLElement).closest<HTMLElement>("[data-vault-card]");
                if (!card) return;
                viewport.scrollLeft = 0;
                setProgress(Math.max(0, Math.min(overflow(), card.offsetLeft - 32)) / overflow());
                galleryTween.progress(trigger.progress);
              };
              viewport.addEventListener("rsj:gallery-step", step);
              viewport.addEventListener("focusin", focus);
              cleanups.push(() => { viewport.removeEventListener("rsj:gallery-step", step); viewport.removeEventListener("focusin", focus); delete vault.dataset.pinned; delete vault.dataset.pinTravel; delete vault.dataset.scrollStart; delete vault.dataset.scrollEnd; viewport.scrollLeft = 0; });
            }
            // Downstream triggers must be measured after the gallery pin adds its spacing.
            gsap.fromTo(root!.querySelector("[data-concept-photo]"), { clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0%)", ease: "none", scrollTrigger: { trigger: "#auria", start: "top 70%", end: "center 40%", scrub: .4 } });
          }
          root!.querySelectorAll<HTMLElement>("[data-home-reveal]").forEach((element) => {
            gsap.fromTo(element, { y: desktop ? 12 : 6 }, { y: 0, duration: .6, ease: "power2.out", clearProps: "transform", scrollTrigger: { trigger: element, start: "top 92%", once: true } });
          });
          // Refresh once after geometry settles, not continuously from a scroll handler.
          let timer: ReturnType<typeof setTimeout>;
          const refresh = () => { clearTimeout(timer); timer = setTimeout(() => ScrollTrigger.refresh(), 160); };
          window.addEventListener("resize", refresh);
          refresh();
          return () => { clearTimeout(timer); window.removeEventListener("resize", refresh); cleanups.forEach((fn) => fn()); delete craft.dataset.pinTravel; };
        }, root!);
      } catch {
        removeMotion();
        if (!disposed) root!.dataset.motionState = "fallback";
      }
    }

    const change = () => { void configure(); };
    preference.addEventListener("change", change);
    void configure();
    return () => { disposed = true; generation += 1; preference.removeEventListener("change", change); removeMotion(); delete root.dataset.motionState; };
  }, [reduce, rootRef]);

  return null;
}

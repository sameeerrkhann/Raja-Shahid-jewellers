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
        const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("lenis")]);
        if (disposed || current !== generation) return;
        gsap.registerPlugin(ScrollTrigger);
        // House easing for reveals: cubic-bezier(0.22, 1, 0.36, 1), a long, quiet settle with no overshoot.
        if (!gsap.parseEase("luxe")) gsap.registerEase("luxe", (t: number) => { let lo = 0, hi = 1; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; const x = 3 * .22 * m * (1 - m) ** 2 + 3 * .36 * m * m * (1 - m) + m ** 3; if (x < t) lo = m; else hi = m; } const m = (lo + hi) / 2; return 3 * m * (1 - m) ** 2 + 3 * m * m * (1 - m) + m ** 3; });
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
          const assembly = root!.querySelector<HTMLElement>("[data-assembly]");
          if (assembly && !desktop) assembly.dispatchEvent(new CustomEvent("rsj:assembly-play"));
          if (assembly) cleanups.push(() => assembly.dispatchEvent(new CustomEvent("rsj:assembly-release")));

          gsap.fromTo(root!.querySelectorAll("[data-entrance-line]"), { y: desktop ? 12 : 6, opacity: .9 }, { y: 0, opacity: 1, duration: .6, stagger: .075, ease: "power2.out", clearProps: "transform,opacity" });

          if (desktop) {
            // Smooth, weighted scrolling for the cinematic page (desktop pointer only; touch keeps native scrolling).
            const lenis = new Lenis({ duration: 1.15, smoothWheel: true, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
            lenis.on("scroll", ScrollTrigger.update);
            const raf = (time: number) => lenis.raf(time * 1000);
            gsap.ticker.add(raf);
            gsap.ticker.lagSmoothing(0);
            cleanups.push(() => { gsap.ticker.remove(raf); gsap.ticker.lagSmoothing(500, 33); lenis.destroy(); });

            if (assembly) {
              // Scene 01: the section grows by ~760px and its frame sticks; scroll position is the assembly's progress, both ways.
              assembly.dataset.scrub = "desktop";
              ScrollTrigger.create({ id: "home-assembly", trigger: assembly, start: () => `top ${headerHeight()}`, end: "bottom bottom", invalidateOnRefresh: true,
                onUpdate: (self) => assembly.dispatchEvent(new CustomEvent<number>("rsj:assembly-progress", { detail: self.progress })),
                onRefresh: (self) => { assembly.dataset.scrollStart = String(self.start); assembly.dataset.scrollEnd = String(self.end); assembly.dispatchEvent(new CustomEvent<number>("rsj:assembly-progress", { detail: self.progress })); } });
              cleanups.push(() => { delete assembly.dataset.scrub; delete assembly.dataset.scrollStart; delete assembly.dataset.scrollEnd; });
            }
            const worn = root!.querySelector<HTMLElement>("[data-worn-pin]");
            if (worn) {
              // Scene 01b: the frame opens, the chosen piece travels to where it is worn, then the details arrive.
              gsap.timeline({ scrollTrigger: { id: "home-worn", trigger: worn, start: () => `top ${headerHeight()}`, end: () => `+=${innerHeight * 1.1}`, pin: true, pinSpacing: true, scrub: .5, invalidateOnRefresh: true,
                onRefresh: (self) => { worn.dataset.scrollStart = String(self.start); worn.dataset.scrollEnd = String(self.end); } } })
                .fromTo(worn, { "--open": 0, "--travel": 1 }, { "--open": 1, "--travel": 0, ease: "none", duration: .55 })
                .fromTo(worn, { "--reveal": 0 }, { "--reveal": 1, ease: "none", duration: .3 }, .5)
                .to({}, { duration: .2 });
              cleanups.push(() => { delete worn.dataset.scrollStart; delete worn.dataset.scrollEnd; worn.style.removeProperty("--open"); worn.style.removeProperty("--travel"); worn.style.removeProperty("--reveal"); });
            }
            // Scene 02: while pinned, scroll walks the loupe through its three details.
            let craftStop = -1;
            ScrollTrigger.create({ id: "home-craft", trigger: craft, start: () => `top ${headerHeight()}`, end: () => `+=${innerHeight * .8}`, pin: true, pinSpacing: true, invalidateOnRefresh: true,
              onRefresh: (self) => { craft.dataset.pinTravel = String(self.end - self.start); },
              onUpdate: (self) => { const next = Math.min(2, Math.floor(self.progress * 3)); if (next !== craftStop) { craftStop = next; craft.dispatchEvent(new CustomEvent<number>("rsj:craft-stop", { detail: next })); } } });
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
            gsap.fromTo(element, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "luxe", clearProps: "transform,opacity", scrollTrigger: { trigger: element, start: "top 90%", once: true } });
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

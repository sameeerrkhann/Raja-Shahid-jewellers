"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function RevealStudy() {
  const scope = useRef<HTMLDivElement>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  const [reduce, setReduce] = useState(false);
  const [status, setStatus] = useState("A typography study. Motion is always optional.");
  useEffect(() => {
    mounted.current = true;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stopForPreference = () => {
      if (!preference.matches) return;
      generation.current += 1;
      cleanup.current?.();
      setStatus("Reduced motion: the composition stays fully visible.");
    };
    preference.addEventListener("change", stopForPreference);
    return () => { mounted.current = false; generation.current += 1; preference.removeEventListener("change", stopForPreference); cleanup.current?.(); delete document.documentElement.dataset.reduceMotion; };
  }, []);

  async function replay() {
    const currentGeneration = ++generation.current;
    cleanup.current?.();
    if (reduce || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStatus("Reduced motion: the composition stays fully visible.");
      return;
    }
    setStatus("Playing a gentle typography reveal.");
    let gsap: typeof import("gsap")["gsap"];
    try { ({ gsap } = await import("gsap")); }
    catch { if (mounted.current) setStatus("Motion could not load. The composition stays fully visible."); return; }
    if (currentGeneration !== generation.current || !mounted.current || !scope.current || document.documentElement.dataset.reduceMotion === "true" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.fromTo("[data-reveal-line]", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, stagger: 0.1, ease: "power2.out", onComplete: () => { if (mounted.current) setStatus("Reveal complete. The composition remains visible."); } });
    }, scope);
    cleanup.current = () => context.revert();
  }

  return <div className="reveal-study" ref={scope}><div className="reveal-study__type"><span data-reveal-line>Quiet confidence.</span><em data-reveal-line>Lasting beauty.</em></div><div className="reveal-study__controls"><Button variant="quiet" onClick={replay}>Replay typography reveal <Icon name="arrow" /></Button><label className="motion-toggle"><input type="checkbox" checked={reduce} onChange={(event) => { const next = event.target.checked; setReduce(next); document.documentElement.dataset.reduceMotion = String(next); if (next) { cleanup.current?.(); setStatus("Reduced motion: the composition stays fully visible."); } }} />Reduce preview motion</label></div><p className="caption" role="status">{status}</p><p className="caption">Your device&apos;s reduced-motion preference is always respected.</p></div>;
}

"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* Every page opens at its top. The homepage pins and smooth scroll used to leave the next page at the old
   scroll position (for example 1961px, near the footer). A link with a #hash still lands on its section. */
export function ScrollReset() {
  const pathname = usePathname();
  useEffect(() => { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; }, []);
  useIsoLayoutEffect(() => {
    if (window.location.hash) return;
    const top = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    top();
    // Pins and smooth scroll from the page we left are torn down a frame or two later; settle after them.
    const a = requestAnimationFrame(() => { top(); b = requestAnimationFrame(top); });
    let b = 0;
    const late = window.setTimeout(top, 120);
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); window.clearTimeout(late); };
  }, [pathname]);
  return null;
}

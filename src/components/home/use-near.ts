"use client";

import { useEffect, useState, type RefObject } from "react";


/** True once the element comes within `margin` of the viewport (then stays true). Keeps heavy
    imagery further down the homepage out of the first page load. */
export function useNear(ref: RefObject<Element | null>, margin = "800px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || near || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { setNear(true); observer.disconnect(); } }, { rootMargin: `${margin} 0px` });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, margin, near]);
  return near;
}

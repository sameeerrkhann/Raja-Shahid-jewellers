"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

type Point = { x: number; y: number };
function distance([first, second]: Point[]) {
  return first && second ? Math.hypot(second.x - first.x, second.y - first.y) : 0;
}
function zoomRange(scale: number) { return Math.min(3, Math.max(1, scale)); }

export function useImageZoom(open: boolean) {
  const [scale, setScale] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());

  useEffect(() => {
    const element = viewport.current;
    if (!open || !element) return;
    function wheel(event: WheelEvent) {
      if (event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      setScale((value) => zoomRange(value + (event.deltaY < 0 ? .2 : -.2)));
    }
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [open]);

  function reset() {
    setScale(1);
    pointers.current.clear();
    viewport.current?.scrollTo({ left: 0, top: 0 });
  }
  function start(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const active = pointers.current;
    const previous = active.get(event.pointerId);
    if (!previous) return;
    const before = active.size > 1 ? distance([...active.values()]) : 0;
    active.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (before) {
      const ratio = distance([...active.values()]) / before;
      setScale((value) => zoomRange(value * ratio));
    } else if (scale > 1) {
      event.currentTarget.scrollBy(previous.x - event.clientX, previous.y - event.clientY);
    }
  }
  function finish(event: PointerEvent<HTMLDivElement>) { pointers.current.delete(event.pointerId); }

  return { scale, viewport, reset, start, move, finish, adjust: (change: number) => setScale((value) => zoomRange(value + change)) };
}

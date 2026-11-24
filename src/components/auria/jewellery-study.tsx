"use client";

import { useEffect, useRef, useState } from "react";
import type { ModelViewerElement } from "@google/model-viewer";

const asset = "/models/auria/grab3d-gold-ring-study.glb";
const initialOrbit = "24deg 72deg 108%";
type Phase = "engine" | "model" | "ready" | "failed";
type Connection = Navigator & { connection?: { saveData?: boolean } };

function dataSaverOn() {
  return typeof navigator !== "undefined" && !!(navigator as Connection).connection?.saveData;
}

export function JewelleryStudy({ onClose }: { onClose: () => void }) {
  const [allowed, setAllowed] = useState(() => !dataSaverOn());
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>("engine");
  const [progress, setProgress] = useState(0);
  const canvas = useRef<HTMLDivElement>(null);
  const viewer = useRef<ModelViewerElement | null>(null);
  const motion = useRef(false);

  useEffect(() => {
    const host = canvas.current;
    if (!allowed || !host) return;
    let active = true;
    let element: ModelViewerElement | null = null;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      motion.current = preference.matches || document.documentElement.dataset.reduceMotion === "true";
      if (element) element.interpolationDecay = motion.current ? 0 : 70;
    };
    const fail = () => {
      if (!active) return;
      active = false;
      window.clearTimeout(timer);
      element?.remove();
      viewer.current = null;
      setPhase("failed");
    };
    const timer = window.setTimeout(fail, 24_000);
    const reportProgress = (event: Event) => {
      if (!active) return;
      const value = (event as CustomEvent<{ totalProgress: number }>).detail?.totalProgress;
      if (typeof value === "number" && Number.isFinite(value)) setProgress(Math.max(0, Math.min(100, Math.floor(value * 10) * 10)));
    };
    const loaded = () => {
      if (!active) return;
      window.clearTimeout(timer);
      setPhase("ready");
    };

    preference.addEventListener("change", updateMotion);
    updateMotion();
    Promise.resolve().then(async () => {
      if (typeof WebGL2RenderingContext === "undefined") throw new Error("WebGL is unavailable");
      const { ModelViewerElement } = await import("@google/model-viewer");
      if (!active) return;
      ModelViewerElement.modelCacheSize = 0;
      ModelViewerElement.minimumRenderScale = .55;
      element = document.createElement("model-viewer") as ModelViewerElement;
      viewer.current = element;
      const attributes = {
        alt: "Rotatable 3D reference ring with a mint-green stone",
        "camera-controls": "",
        "disable-pan": "",
        "disable-tap": "",
        "camera-orbit": initialOrbit,
        "min-camera-orbit": "auto 18deg 76%",
        "max-camera-orbit": "auto 152deg 160%",
        "interaction-prompt": "none",
        "touch-action": "pan-y",
        "environment-image": "neutral",
        "shadow-intensity": ".3",
        exposure: "1.08",
        loading: "eager",
      };
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
      element.addEventListener("load", loaded, { once: true });
      element.addEventListener("progress", reportProgress);
      element.addEventListener("error", fail, { once: true });
      updateMotion();
      setPhase("model");
      host.append(element);
      // A failed fetch can remain in the loader cache. Retry with a fresh URL for the same local asset.
      element.src = attempt === 0 ? asset : `${asset}?retry=${attempt}`;
    }).catch(fail);
    return () => {
      active = false;
      window.clearTimeout(timer);
      preference.removeEventListener("change", updateMotion);
      element?.removeEventListener("load", loaded);
      element?.removeEventListener("progress", reportProgress);
      element?.removeEventListener("error", fail);
      element?.remove();
      viewer.current = null;
    };
  }, [allowed, attempt]);

  function adjustCamera(action: "left" | "right" | "zoom-in" | "zoom-out" | "reset") {
    const instance = viewer.current;
    if (!instance) return;
    if (action === "reset") instance.cameraOrbit = initialOrbit;
    else {
      const { theta, phi, radius } = instance.getCameraOrbit();
      const turn = action === "left" ? -.46 : action === "right" ? .46 : 0;
      const zoom = action === "zoom-in" ? .82 : action === "zoom-out" ? 1.22 : 1;
      instance.cameraOrbit = `${theta + turn}rad ${phi}rad ${radius * zoom}m`;
    }
    if (motion.current) instance.jumpCameraToGoal();
  }

  function retry() {
    setProgress(0);
    setPhase("engine");
    setAttempt((previous) => previous + 1);
  }

  return <>
    <p className="atelier-study__provenance">Independent ring demonstration from Grab3D. Catalogue designs are shown separately in photos.</p>
    <div className="atelier-study__scene" data-ready={phase === "ready"}>
      <div className="atelier-study__canvas" ref={canvas} />
      {!allowed ? <p role="status">Data Saver is on. Load the interactive study or stay with catalogue photos.</p>
        : phase === "failed" ? <p role="alert">The 3D study could not load on this device. Catalogue photos are still available.</p>
        : phase === "ready" ? <p role="status" className="sr-only">3D model ready</p>
        : <div className="atelier-study__loading" role="status">
          <p>{phase === "engine" ? "Preparing the 3D viewer…" : "Loading the ring model…"}</p>
          <progress aria-label="3D model loading" max={100} value={phase === "model" ? progress : undefined} />
        </div>}
    </div>
    {phase === "ready" && <p className="atelier-study__hint">Drag to turn. Scroll or pinch to zoom.</p>}
    <div className="atelier-inspector__controls atelier-study__controls">
      {phase === "ready" && <>
        <button type="button" className="atelier-outline" onClick={() => adjustCamera("left")}>Turn left</button>
        <button type="button" className="atelier-outline" onClick={() => adjustCamera("right")}>Turn right</button>
        <button type="button" className="atelier-outline" onClick={() => adjustCamera("zoom-in")}>Zoom in</button>
        <button type="button" className="atelier-outline" onClick={() => adjustCamera("zoom-out")}>Zoom out</button>
        <button type="button" className="atelier-outline" onClick={() => adjustCamera("reset")}>Reset view</button>
      </>}
      {!allowed && <button type="button" className="atelier-outline" onClick={() => setAllowed(true)}>Load 3D anyway</button>}
      {phase === "failed" && <button type="button" className="atelier-outline" onClick={retry}>Retry 3D study</button>}
      <button type="button" className="atelier-text-action" onClick={onClose}>Back to catalogue photos</button>
      <a className="atelier-text-action" href="https://grab3d.com/models/props/ring/" target="_blank" rel="noreferrer">Model source and CC0 licence</a>
    </div>
  </>;
}

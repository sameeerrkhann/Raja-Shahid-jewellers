"use client";
/* eslint-disable @next/next/no-img-element -- layered, transformed photo composites; next/image wrappers would break the stacking. */

import { useRef, useState } from "react";
import { useNear } from "./use-near";
import type { TryOnPlacement, TryOnSlot, Wearer } from "@/config/showcase";
import { tryOnComing, tryOnPhotos, tryOnSlots } from "@/config/showcase";

export type TryOnItem = { code: string; title: string; group: string; slot: TryOnSlot; wearers: Wearer[]; cutout: string; facts: string };

const SLOT_NAME: Record<TryOnSlot, string> = { neck: "Necklace", long: "Long necklace", finger: "Ring", wrist: "Bangle", ears: "Earrings", forehead: "Tikka" };
// Necklaces share the neck; everything else has its own place, so a look can combine pieces.
const place = (slot: TryOnSlot): TryOnSlot => (slot === "long" ? "neck" : slot);

/* Try it on: one woman, one man. Choosing a piece puts it where it is worn, then the camera moves in
   on that spot and names it; "See the whole look" pulls back. */
export function TryOn({ items }: { items: TryOnItem[] }) {
  const [wearer, setWearer] = useState<Wearer>("women");
  const [worn, setWorn] = useState<Record<Wearer, Partial<Record<TryOnSlot, string>>>>({ women: {}, men: {} });
  const [focus, setFocus] = useState<{ code: string; at: TryOnPlacement } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const near = useNear(sectionRef);
  const photo = tryOnPhotos[wearer];
  const visible = items.filter((item) => item.wearers.includes(wearer) && tryOnSlots[wearer][item.slot]);
  const groups = [...new Set(visible.map((item) => item.group))];
  const wearing = Object.values(worn[wearer]).filter(Boolean).map((code) => items.find((item) => item.code === code)!);

  const toggle = (item: TryOnItem) => {
    const slot = place(item.slot), on = worn[wearer][slot] === item.code;
    setWorn((state) => ({ ...state, [wearer]: { ...state[wearer], [slot]: on ? undefined : item.code } }));
    setFocus(on ? null : { code: item.code, at: tryOnSlots[wearer][item.slot]! });
    // On phones the figure sits above the list: bring it back into view to watch the piece go on.
    const box = frame.current?.getBoundingClientRect();
    if (box && window.innerWidth <= 860 && box.top < 0) frame.current!.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const zoom = focus ? focus.at.zoom : 1;
  const origin = focus ? `${focus.at.x}% ${focus.at.y}%` : "50% 50%";
  const focused = focus ? items.find((item) => item.code === focus.code) : null;

  return <section ref={sectionRef} id="try-on" className="tryon" data-scene="04" data-tone="dark" aria-labelledby="try-on-title">
    <div className="tryon__copy">
      <h2 id="try-on-title">See it on.</h2>
      <p>Choose who, then tap any piece. It goes where it is worn and the view moves in on it. Tap again to take it off, or combine pieces into one look.</p>
      <div className="tryon__who" role="group" aria-label="Show pieces on">
        {(["women", "men"] as const).map((option) => <button key={option} type="button" aria-pressed={wearer === option} onClick={() => { setWearer(option); setFocus(null); }}>{option === "women" ? "Women" : "Men"}</button>)}
      </div>
      <div className="tryon__shelf">
        {groups.map((group) => <div key={group}><h3>{group}</h3><ul>{visible.filter((item) => item.group === group).map((item) =>
          <li key={item.code}><button type="button" className="tryon__item" aria-pressed={worn[wearer][place(item.slot)] === item.code} onClick={() => toggle(item)}>{near && <img src={item.cutout} alt="" />}{item.title}</button></li>)}</ul></div>)}
        <div><h3>Coming with photographs</h3><ul>{tryOnComing[wearer].map((name) => <li key={name}><button type="button" className="tryon__item" disabled>{name}</button></li>)}</ul></div>
      </div>
      <p className="tryon__wearing" aria-live="polite">{wearing.length ? <>Wearing: <b>{wearing.map((item) => item.title).join(", ")}</b></> : "Nothing on yet. Tap a piece."}</p>
    </div>
    <div className="tryon__frame" ref={frame}>
      <div className="tryon__camera" style={{ transform: `scale(${zoom})`, transformOrigin: origin }}>
        {near && <img className="tryon__photo" src={photo.src} alt={photo.alt} />}
        {photo.overlay && wearing.map((item) => { const at = tryOnSlots[wearer][item.slot]!; return <img key={item.code} className={`tryon__piece tryon__piece--${place(item.slot)}`} src={item.cutout} alt="" style={{ left: `${at.x}%`, top: `${at.y}%`, width: `${at.w}%`, rotate: `${at.r ?? 0}deg` }} />; })}
        {near && photo.front && <img className="tryon__front" src={photo.front} alt="" aria-hidden="true" loading="lazy" />}
      </div>
      {focused && <div className="tryon__focus" aria-live="polite"><span>{SLOT_NAME[focused.slot]}</span><strong>{focused.title}</strong><small>{focused.facts}</small><button type="button" onClick={() => setFocus(null)}>See the whole look</button></div>}
      <span className="tryon__tag">AI-generated model · preview placement · sample designs</span>
    </div>
  </section>;
}

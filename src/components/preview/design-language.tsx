"use client";

import { useState } from "react";
import { Section, SectionHeading } from "@/components/ui/section";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { ProductSkeleton } from "@/components/ui/skeleton";
import { RevealStudy } from "@/components/motion/reveal-study";

const palette = [
  { key: "obsidian", name: "Obsidian", role: "Depth & quiet" },
  { key: "gold", name: "Antique gold", role: "A considered accent" },
  { key: "champagne", name: "Champagne", role: "Warm highlights" },
  { key: "ivory", name: "Warm ivory", role: "Room to breathe" },
  { key: "burgundy", name: "Deep burgundy", role: "An intimate note" },
];

export function DesignLanguage() {
  const [open, setOpen] = useState(false);
  return <>
    <Section id="design-language" className="design-language"><SectionHeading eyebrow="04 / The visual language" title={<>Luxury is in<br /><em>the restraint.</em></>}><p>A warm palette. An editorial serif.<br />A modern, understated interface.</p></SectionHeading>
      <div className="palette-grid">{palette.map((color) => <div key={color.key} className="palette-item"><div className={`palette-swatch palette-swatch--${color.key}`} /><h3>{color.name}</h3><p>{color.role}</p></div>)}</div>
      <div className="language-grid"><div className="type-study"><p className="eyebrow">The typography</p><p className="type-study__display">A feeling,<br /><em>beautifully expressed.</em></p><p>Cormorant Garamond brings the editorial voice. Manrope keeps every interaction clear and considered.</p><div className="button-row"><ButtonLink href="#selection">Explore the studies <Icon name="arrow" /></ButtonLink><Button variant="outline" onClick={() => setOpen(true)}>A closer look</Button></div></div><div className="loading-study"><p className="eyebrow">The in-between moments</p><ProductSkeleton /><p className="caption">Loading-state specimen. Reserved image space keeps the composition steady.</p></div></div>
      <RevealStudy />
    </Section>
    <Modal open={open} onClose={() => setOpen(false)} title="Designed to feel considered"><p>The foundation pairs obsidian, antique gold and warm ivory with generous space, a serif display face and a precise sans-serif interface.</p><p>Gold on light backgrounds uses a deeper ink tone for readable text. Focus indicators, touch targets, native dialogs and reduced-motion alternatives are part of the visual system.</p><p className="caption">Final brand identity and imagery remain subject to owner approval.</p></Modal>
  </>;
}

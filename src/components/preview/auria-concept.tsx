"use client";

import { useState } from "react";
import { brand } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";

export function AuriaConcept() {
  const [open, setOpen] = useState(false);
  return <>
    <section id="auria" className="auria-section" data-tone="dark"><div className="container auria-grid">
      <div className="auria-copy"><p className="eyebrow">03 / A more personal perspective</p><h2>Your imagination.<br /><em>A thoughtful companion.</em></h2><p>Meet {brand.assistant}, a vision for a personal jewellery concierge. A considered conversation, with room for your story.</p><Button variant="outline" onClick={() => setOpen(true)}>The idea behind AURIA <Icon name="arrow" /></Button><p className="caption">Interface concept only. AI, voice and image creation are not connected.</p></div>
      <div className="auria-interface" aria-label="AURIA visual interface concept, not connected">
        <div className="auria-interface__header"><span className="auria-emblem"><Icon name="sparkle" /></span><div><p className="auria-name">{brand.assistant}</p><p className="auria-subtitle">{brand.assistantDescription}</p></div><span className="concept-label">Concept</span></div>
        <div className="auria-interface__body"><p className="eyebrow">An imagined welcome</p><p className="auria-greeting">Something for a moment.<br />Or something <em>entirely you?</em></p><p className="auria-interface__note">A space to explore a style, collect inspiration and consider the details together.</p><div className="auria-topics"><span>A meaningful occasion</span><span>A design of my own</span></div></div>
        <div className="auria-composer" aria-disabled="true"><span>A conversation, coming into focus…</span><Icon name="arrow" /></div><p className="auria-interface__caption">Visual study · No messages can be sent</p>
      </div>
    </div></section>
    <Modal open={open} onClose={() => setOpen(false)} title="AURIA, thoughtfully imagined"><p>AURIA is the working name for one unified concierge, planned to support typed conversation, permitted image references, jewellery concept generation and real voice conversations.</p><p>Those services are not implemented in this visual study. No microphone, upload or paid AI call starts here.</p><p className="caption">AI concepts will require workshop review; they will never establish stock, exact weight or manufacturing approval.</p></Modal>
  </>;
}

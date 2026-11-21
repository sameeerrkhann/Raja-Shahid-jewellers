"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { homeCategories } from "@/config/home";
import { HomepageMotion } from "@/components/motion/homepage-motion";

type Explanation = "auria" | "appointment" | "enquiry" | (typeof homeCategories)[number]["id"];

export function HomeExperience({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const [reduce, setReduce] = useState(false);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const category = homeCategories.find((item) => item.id === explanation);
  const title = category ? `${category.title} — a direction to explore` : explanation === "auria" ? "AURIA, coming into focus" : explanation === "appointment" ? "A visit, thoughtfully planned" : "Begin with a conversation";
  useEffect(() => () => { delete document.documentElement.dataset.reduceMotion; }, []);

  return <>
    <main id="main-content" className="cinematic-home" ref={root} onClick={(event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-home-action]");
      if (button) setExplanation(button.dataset.homeAction as Explanation);
    }}>
      <div id="top" className="home-review-strip"><span>Royal Gold Atelier <span className="home-strip-detail">· customer website demo</span></span><label className="home-motion-toggle"><input type="checkbox" checked={reduce} onChange={(event) => { const next = event.target.checked; document.documentElement.dataset.reduceMotion = String(next); setReduce(next); }} />Reduce motion</label></div>
      {children}
      <HomepageMotion rootRef={root} reduce={reduce} />
      <noscript><style>{`[data-home-action], .vault-controls, .home-motion-toggle, .site-header .icon-button { display: none !important; }`}</style><p className="home-noscript container">The full editorial story and sample Design Vault are available without motion. AURIA and enquiry services are not connected. Use the chapter links and footer to explore.</p></noscript>
    </main>
    <Modal open={explanation !== null} onClose={() => setExplanation(null)} title={title}>
      {category ? <><p className="eyebrow">Design Vault / Editorial category study</p><p>{category.subtitle}. This introduces a browsing direction, not an item offered for sale.</p><p>The Design Vault contains clearly labelled synthetic samples. Actual availability and manufacturing options still need shop-approved records; no real stock is asserted here.</p><Link className="text-link" prefetch={false} href={`/designs?category=${category.id}`} onClick={() => setExplanation(null)}>Browse {category.title} sample designs →</Link>{"study" in category ? <Link className="text-link" prefetch={false} href={`/design-preview#${category.study}`} onClick={() => setExplanation(null)}>View the existing photographic reference →</Link> : <p className="caption">The line illustration is original concept artwork, not a product photograph, AI output or manufacturable design.</p>}</> : explanation === "auria" ? <><p>AURIA is the working name for a future personal jewellery concierge. Chat, image creation and real voice belong to later phases.</p><p>This is a visual introduction only. No message, upload, microphone request or paid AI call starts here.</p><p className="caption">The sketch-to-photograph study is hand-authored presentation, not AI generation, CAD or manufacturing approval.</p></> : <><p>{explanation === "appointment" ? "Appointment requests are not connected yet. Official shop contact details and visiting arrangements still await approval." : "Jewellery enquiries are not connected yet. The future journey will keep in-stock pieces, made-to-order designs and unreviewed custom concepts distinct."}</p><p>No request has been sent, no booking made and no price or delivery date promised.</p><Link className="text-link" prefetch={false} href="/designs" onClick={() => setExplanation(null)}>Explore the sample Design Vault →</Link></>}
    </Modal>
  </>;
}

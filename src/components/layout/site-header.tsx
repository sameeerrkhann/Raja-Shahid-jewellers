"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand, previewNavigation } from "@/config/brand";
import { homeNavigation } from "@/config/home";
import { catalogueNavigation } from "@/config/catalogue";
import { referenceStudies } from "@/config/preview-studies";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";

export function SiteHeader() {
  const pathname = usePathname();
  const isPreview = pathname === brand.previewPath;
  const isCatalogue = pathname.startsWith("/designs") || pathname.startsWith("/collections");
  const navigation = isPreview ? previewNavigation : isCatalogue ? catalogueNavigation : homeNavigation;
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  // Desktop shows three curated destinations; the full chapter list stays in the menu dialog.
  const primary = isPreview ? previewNavigation.slice(0, 3) : [{ label: "Design Vault", href: "/designs" }, { label: "Collections", href: "/collections" }, { label: "The craft", href: "/#craft" }];
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = referenceStudies.filter((study) => `${study.title} ${study.category}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <>
    <header className="site-header" data-tone="dark" data-scrolled={scrolled || undefined}>
      <div className="container header-grid">
        <nav aria-label="Primary" className="desktop-nav">{primary.map((link) => <Link key={link.href} href={link.href} prefetch={false} aria-current={pathname === link.href || (link.href !== "/" && !link.href.includes("#") && pathname.startsWith(link.href)) ? "page" : undefined}>{link.label}</Link>)}</nav>
        <button className="icon-button mobile-menu-trigger" type="button" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Icon name="menu" /></button>
        <Link href="/#top" prefetch={false} className="wordmark"><span>{brand.wordmark}</span><span className="wordmark__sub"><span>JEWELLERS</span></span></Link>
        <div className="header-actions"><a className="header-auria" href={`${isPreview ? brand.previewPath : "/"}#auria`}><Icon name="sparkle" />Meet AURIA</a><button className="icon-button header-search" type="button" aria-label={isPreview ? "Search reference studies" : "Search jewellery designs"} aria-haspopup="dialog" onClick={() => setSearchOpen(true)}><Icon name="search" /></button></div>
      </div>
    </header>
    <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="The visual atelier" className="menu-modal">
      <p className="eyebrow">{isPreview ? "Design preview · 02" : isCatalogue ? "Royal Gold Atelier · Design Vault" : "Royal Gold Atelier · The story"}</p><nav className="mobile-nav" aria-label={isPreview ? "Preview sections" : isCatalogue ? "Catalogue navigation" : "Homepage chapters"}>{navigation.map((link, index) => <Link key={link.href} href={link.href} prefetch={false} onClick={() => setMenuOpen(false)}><span aria-hidden="true">0{index + 1}</span>{link.label}<Icon name="arrow" /></Link>)}</nav><p className="caption">An introduction to the proposed visual language.</p>
    </Modal>
    <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="A closer look" initialFocusRef={inputRef}>
      {isPreview ? <><p className="caption">Find one of the three editorial reference studies. This is not a shop catalogue.</p><label className="search-label" htmlFor="study-search">Search the reference studies</label><div className="search-field"><Icon name="search" /><input id="study-search" ref={inputRef} type="search" value={query} placeholder="Try necklace, pendant or earring" onChange={(event) => setQuery(event.target.value)} /></div>
      <p className="caption" role="status">{matches.length} {matches.length === 1 ? "study" : "studies"} found</p>
      <ul className="search-results">{matches.map((study) => <li key={study.id}><a href={`${brand.previewPath}#${study.id}`} onClick={() => setSearchOpen(false)}><span>{study.title}<small>{study.category}</small></span><Icon name="arrow" /></a></li>)}</ul>
      {matches.length === 0 && <p>No studies match. Try a different detail.</p>}</> : <><p className="caption">Search the sample Design Vault by name, design ID or a detail. Imagery and availability are synthetic, not actual shop stock.</p><form action="/designs" method="get" onSubmit={() => setSearchOpen(false)}><label className="search-label" htmlFor="global-design-search">Find a jewellery design</label><div className="search-field"><Icon name="search" /><input id="global-design-search" ref={inputRef} type="search" name="q" maxLength={100} value={query} placeholder="Try floral, ring or RSJ-D005" onChange={(event) => setQuery(event.target.value)} /></div><button type="submit" className="button button--gold">Search the Design Vault</button></form><Link href="/designs" prefetch={false} className="text-link" onClick={() => setSearchOpen(false)}>Browse all sample designs →</Link></>}
    </Modal>
  </>;
}

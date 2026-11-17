"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand, previewNavigation } from "@/config/brand";
import { homeNavigation } from "@/config/home";
import { catalogueNavigation } from "@/config/catalogue";
import { Icon } from "@/components/ui/icon";

export function SiteFooter() {
  const pathname = usePathname();
  const isPreview = pathname === brand.previewPath;
  const isCatalogue = pathname.startsWith("/designs") || pathname.startsWith("/collections");
  const navigation = isPreview ? previewNavigation : [...(isCatalogue ? catalogueNavigation : [...homeNavigation, { label: "Collections", href: "/collections" }]), { label: "Design preview", href: brand.previewPath }];
  return <footer className="site-footer" data-tone="dark"><div className="container">
    <div className="footer-top"><div><p className="eyebrow">An enduring point of view</p><p className="footer-statement">Considered beauty.<br /><em>Lasting impressions.</em></p></div><nav aria-label="Footer">{navigation.map((link) => <Link href={link.href} prefetch={false} key={link.href}>{link.label}<Icon name="arrow" /></Link>)}</nav></div>
    <div className="footer-bottom"><div><p className="footer-brand">{brand.name}</p><p>Design study by Neural Stack &amp; Co.</p></div><p className="footer-disclosure">{isCatalogue ? "AI concept imagery and sample availability, not real stock." : "Editorial reference photography, not shop inventory."}<br />Official logo, store details and final brand assets await approval.</p><a className="back-to-top" href="#top">Back to top ↑</a></div>
    <div className="photo-credits">Photography: <a href="https://unsplash.com/@vaibhavnagare" target="_blank" rel="noreferrer">Vaibhav Nagare</a> &amp; <a href="https://unsplash.com/@prahantstudio" target="_blank" rel="noreferrer">PRAHANT STUDIO</a> / <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">Unsplash License</a> / <a href="/licenses/fonts.txt">Font notices</a></div>
  </div></footer>;
}

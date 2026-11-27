"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand, previewNavigation } from "@/config/brand";
import { shopDetails } from "@/config/services";
import { Icon } from "@/components/ui/icon";

const explore = [{ label: "Design Vault", href: "/designs" }, { label: "Collections", href: "/collections" }, { label: "Bridal edit", href: "/collections/the-bridal-edit" }, { label: "See it on", href: "/#try-on" }, { label: "Meet AURIA", href: "/#auria" }];
const services = [{ label: "Gold rates today", href: "/gold-rates" }, { label: "Design preview", href: brand.previewPath }];

export function SiteFooter() {
  const pathname = usePathname();
  const isPreview = pathname === brand.previewPath;
  const links = isPreview ? previewNavigation : explore;
  return <footer className="site-footer" data-tone="dark">
    {pathname !== "/" && <div className="footer-cta"><div className="container footer-cta__inner">
      <p className="footer-statement">Considered beauty.<br /><em>Lasting impressions.</em></p>
      <div className="footer-cta__actions"><button type="button" className="button footer-cta__primary" data-service="visit">Plan a private visit <Icon name="arrow" /></button><button type="button" className="button button--outline footer-cta__secondary" data-service="enquiry">Jewellery enquiry <Icon name="arrow" /></button></div>
    </div></div>}
    <div className="container footer-main">
      <div className="footer-brand-block"><p className="footer-brand">{brand.name}</p><p>Gold jewellery for weddings, gifts and every day, made to be handed down.</p></div>
      <nav aria-label="Explore" className="footer-col"><p className="footer-col__title">Explore</p>{links.map((link) => <Link href={link.href} prefetch={false} key={link.href}>{link.label}</Link>)}</nav>
      <nav aria-label="Services" className="footer-col"><p className="footer-col__title">Services</p>{services.map((link) => <Link href={link.href} prefetch={false} key={link.href}>{link.label}</Link>)}<button type="button" data-service="visit">Book a showroom visit</button><button type="button" data-service="enquiry">Ask about a design</button></nav>
      <div className="footer-col"><p className="footer-col__title">Showroom</p><p>{shopDetails.address ?? "Address to be confirmed"}</p><p>{shopDetails.hours ?? "Opening hours to be confirmed"}</p></div>
    </div>
    <div className="container footer-bottom">
      <p>© {new Date().getFullYear()} {brand.name}. Design by Neural Stack &amp; Co.</p>
      <p className="footer-disclosure">Images are AI-generated and designs are samples, not shop stock. <a href="/licenses/fonts.txt">Font notices</a></p>
      <a className="back-to-top" href="#top">Back to top ↑</a>
    </div>
  </footer>;
}

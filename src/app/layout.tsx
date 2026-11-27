import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ScrollReset } from "@/components/layout/scroll-reset";
import { ServiceDialogs } from "@/components/services/service-dialogs";
import { brand } from "@/config/brand";
import "./globals.css";

const editorial = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-editorial", display: "swap" });
const interfaceFont = Manrope({ subsets: ["latin"], variable: "--font-interface", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${brand.name} · Visual Atelier`, template: `%s | ${brand.name}` },
  description: "The proposed visual language for Raja Shahid Jewellers. An internal premium design-system preview by Neural Stack & Co.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${editorial.variable} ${interfaceFont.variable}`}><body><a className="skip-link" href="#main-content">Skip to content</a><ScrollReset /><SiteHeader />{children}<SiteFooter /><ServiceDialogs /></body></html>;
}

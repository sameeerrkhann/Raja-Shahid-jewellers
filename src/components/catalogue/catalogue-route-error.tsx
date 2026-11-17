"use client";

import Link from "next/link";
import "@/app/catalogue.css";

export function CatalogueRouteError({ retry }: { retry: () => void }) {
  return <main id="main-content" className="catalogue-page"><div id="top" className="container catalogue-browse"><div className="catalogue-message" role="alert"><h1>An interruption.<br /><em>Not the end of the story.</em></h1><p>This page could not be displayed. No request has been submitted. Try again, or return to the sample selection.</p><div><button className="button button--gold" type="button" onClick={retry}>Try this page again</button><Link href="/designs" prefetch={false} className="button button--outline">Return to Design Vault</Link></div></div></div></main>;
}

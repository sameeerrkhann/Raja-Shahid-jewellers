import type { Metadata } from "next";
import { AuriaWorkspace } from "@/components/auria/workspace";
import { queryCatalogue } from "@/lib/server/catalogue";
import { emptyQuery } from "@/lib/catalogue/query";
import "./workspace.css";
import "./atelier.css";
export const metadata: Metadata = { title: "AURIA — Your jewellery concierge", robots: { index: false, follow: false } };
export default function Atelier() { return <><AuriaWorkspace discovery={queryCatalogue({ ...emptyQuery, limit: 3 }).items} /><noscript><p className="container">AURIA conversations need JavaScript. <a href="/designs">Browse the sample Design Vault</a>.</p></noscript></>; }

"use client";

import { CatalogueRouteError } from "@/components/catalogue/catalogue-route-error";

// Installed Next.js 16.4 uses retry(), not the older reset() error-boundary prop.
export default function DesignsError({ retry }: { retry: () => void }) { return <CatalogueRouteError retry={retry} />; }

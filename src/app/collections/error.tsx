"use client";

import { CatalogueRouteError } from "@/components/catalogue/catalogue-route-error";

export default function CollectionsError({ retry }: { retry: () => void }) { return <CatalogueRouteError retry={retry} />; }

import { LoadingState } from "@/components/ui/skeleton";

// Scope the Phase 02 loading boundary to its preview; the homepage must remain visible without JavaScript.
export default function Loading() { return <main id="main-content"><LoadingState /></main>; }

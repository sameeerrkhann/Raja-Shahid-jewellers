export function ProductSkeleton() {
  return <div className="product-skeleton" aria-hidden="true"><div className="skeleton skeleton--image" /><div className="skeleton skeleton--line" /><div className="skeleton skeleton--line skeleton--short" /></div>;
}

export function LoadingState() {
  return <div className="container loading-state" role="status" aria-live="polite" aria-busy="true"><span className="eyebrow">A moment of anticipation</span><p className="loading-state__title">The details are taking shape.</p><span className="sr-only">Loading design preview</span><div className="product-grid"><ProductSkeleton /><ProductSkeleton /><ProductSkeleton /></div></div>;
}

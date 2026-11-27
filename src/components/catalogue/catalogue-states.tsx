"use client";

export function CatalogueSkeleton({ count = 6 }: { count?: number }) {
  return <div className="design-grid catalogue-skeleton" aria-label="Loading designs" role="status"><span className="sr-only">Loading designs…</span>{Array.from({ length: count }, (_, index) => <div className="catalogue-skeleton__card" key={index} aria-hidden="true"><div className="skeleton catalogue-skeleton__image" /><div className="skeleton skeleton--line" /><div className="skeleton skeleton--line skeleton--short" /></div>)}</div>;
}
export function CatalogueError({ message, onRetry, onClear }: { message: string; onRetry?: () => void; onClear: () => void }) {
  return <div className="catalogue-message" role="alert"><h2>We couldn’t open this selection.</h2><p>{message}</p><div>{onRetry && <button className="button button--gold" type="button" onClick={onRetry}>Try again</button>}<button className="button button--outline" type="button" onClick={onClear}>Reset selection</button></div></div>;
}

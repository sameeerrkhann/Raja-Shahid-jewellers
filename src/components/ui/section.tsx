import type { HTMLAttributes } from "react";

export function Section({ className = "", tone = "light", children, ...props }: HTMLAttributes<HTMLElement> & { tone?: "light" | "dark" }) {
  return <section data-tone={tone} className={`section ${className}`} {...props}><div className="container">{children}</div></section>;
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{children && <div className="section-heading__aside">{children}</div>}</div>;
}

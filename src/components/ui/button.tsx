import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type Variant = "gold" | "outline" | "quiet";
type Shared = { variant?: Variant; className?: string };

export function Button({ variant = "gold", className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & Shared) {
  return <button type={type} className={`button button--${variant} ${className}`} {...props} />;
}

export function ButtonLink({ variant = "gold", className = "", ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & Shared & { href: string }) {
  return <a className={`button button--${variant} ${className}`} {...props} />;
}

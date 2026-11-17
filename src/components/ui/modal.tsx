"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { Icon } from "./icon";

export function Modal({ open, onClose, title, children, initialFocusRef, className = "" }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
  initialFocusRef?: RefObject<HTMLInputElement | null>; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    initialFocusRef?.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      // Conditional preview dialogs can unmount before native close restores their opener.
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, initialFocusRef]);

  return <dialog ref={ref} className={`modal ${className}`} aria-labelledby={titleId}
    onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === ref.current) onClose(); }}>
    <div className="modal__inner">
      <div className="modal__heading"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button></div>
      {children}
    </div>
  </dialog>;
}

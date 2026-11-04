import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import styles from "@/components/BrowserLightbox/BrowserLightbox.module.css";

export interface BrowserLightboxProps {
  readonly onClose: () => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly children: ReactNode;
}

/** The only modal DOM boundary: native inertness, keyboard trapping and focus restoration. */
export function BrowserLightbox({
  children,
  onClose,
  onPrevious,
  onNext,
}: BrowserLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = dialog.ownerDocument.activeElement;
    const owner = dialog.parentElement;
    dialog.showModal();
    dialog
      .querySelector<HTMLButtonElement>("[data-lightbox-close]")
      ?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (
        trigger instanceof HTMLElement &&
        trigger.isConnected &&
        !trigger.matches(":disabled")
      )
        trigger.focus();
      else if (owner?.isConnected)
        owner
          .querySelector<HTMLButtonElement>("button:not(:disabled)")
          ?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-label="Screenshot viewer"
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const focusable = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), [tabindex="0"]',
            ),
          ].filter((element) => element.getClientRects().length > 0);
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = event.currentTarget.ownerDocument.activeElement;
          if (event.shiftKey && active === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first?.focus();
          }
        }
        if (
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          (event.target instanceof Element &&
            event.target.closest("[data-screen-scroll]"))
        )
          return;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onPrevious();
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onNext();
        }
      }}
    >
      {children}
    </dialog>
  );
}

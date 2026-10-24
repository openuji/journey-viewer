import { useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

/** A plain request to bring one rendered item, or the viewer's top, into view. */
export interface RevealRequest {
  readonly seq: number;
  readonly kind: "top" | "journey" | "state" | "entry" | "exit";
  /** Occurrence key of the containing journey; empty for "top". */
  readonly occurrence: string;
  readonly ref: string;
}

export interface BrowserViewerShellProps {
  readonly className?: string | undefined;
  readonly reveal: RevealRequest | null;
  readonly searchOpen: boolean;
  readonly onSearchDismiss: () => void;
  readonly children?: ReactNode;
}

const editable = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest("input, textarea, select, [contenteditable='true']") !== null;

function findRevealTarget(
  root: HTMLElement,
  request: RevealRequest,
): HTMLElement | null {
  if (request.kind === "top") return root;
  const journey = [
    ...root.querySelectorAll<HTMLElement>("[data-occurrence]"),
  ].find((element) => element.dataset.occurrence === request.occurrence);
  if (!journey) return null;
  const own = (element: HTMLElement) =>
    element.closest("[data-occurrence]") === journey;
  if (request.kind === "journey")
    return journey.querySelector<HTMLElement>("header") ?? journey;
  if (request.kind === "state") {
    const state = [
      ...journey.querySelectorAll<HTMLElement>("[data-state-ref]"),
    ].find(
      (element) => element.dataset.stateRef === request.ref && own(element),
    );
    return state?.querySelector<HTMLElement>("[data-row]") ?? state ?? null;
  }
  return (
    [...journey.querySelectorAll<HTMLElement>("[data-contract-ref]")].find(
      (element) =>
        element.dataset.contractRef === request.ref &&
        element.dataset.contractKind === request.kind &&
        own(element),
    ) ?? null
  );
}

/**
 * Viewer root at the browser boundary: exposes the sticky bar height as `--jv-explorer-offset`,
 * focuses search on "/", closes search results on outside clicks and scrolls reveal requests into view.
 */
export function BrowserViewerShell({
  className,
  reveal,
  searchOpen,
  onSearchDismiss,
  children,
}: BrowserViewerShellProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dismissRef = useRef(onSearchDismiss);
  useLayoutEffect(() => {
    dismissRef.current = onSearchDismiss;
  });

  useLayoutEffect(() => {
    const root = ref.current;
    const view = root?.ownerDocument.defaultView;
    const bar = root?.querySelector<HTMLElement>("[data-explorer-bar]");
    if (!root || !view || !bar) return;
    const update = () =>
      root.style.setProperty(
        "--jv-explorer-offset",
        view.getComputedStyle(bar).position === "sticky"
          ? `${bar.offsetHeight}px`
          : "0px",
      );
    update();
    const observer =
      typeof view.ResizeObserver === "function"
        ? new view.ResizeObserver(update)
        : null;
    observer?.observe(bar);
    view.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      view.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const root = ref.current;
    const owner = root?.ownerDocument;
    if (!root || !owner) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "/" ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        editable(event.target)
      )
        return;
      const input = root.querySelector<HTMLInputElement>(
        "[data-search-field] input",
      );
      if (!input) return;
      event.preventDefault();
      input.focus();
    };
    owner.addEventListener("keydown", onKeyDown);
    return () => owner.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const root = ref.current;
    const owner = root?.ownerDocument;
    if (!root || !owner || !searchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const field = root.querySelector("[data-search-field]");
      if (!(event.target instanceof Node) || !field?.contains(event.target))
        dismissRef.current();
    };
    owner.addEventListener("pointerdown", onPointerDown);
    return () => owner.removeEventListener("pointerdown", onPointerDown);
  }, [searchOpen]);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !reveal) return;
    const target = findRevealTarget(root, reveal);
    const reduce = root.ownerDocument.defaultView?.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target?.scrollIntoView({
      block: reveal.kind === "top" ? "start" : "nearest",
      inline: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [reveal]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

import { ScreenAction } from "@journey-viewer/design-system";
import type { PreviewAnchor } from "../preview-placement.js";

export interface BrowserScreenButtonProps {
  readonly label: string;
  readonly color?: string;
  readonly onOpen: () => void;
  /** Reports the button's viewport rectangle while hovered or keyboard-focused, then null. */
  readonly onPreview: (anchor: PreviewAnchor | null) => void;
}

const anchorOf = (element: HTMLElement): PreviewAnchor => {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, right: rect.right, top: rect.top, height: rect.height };
};

/** Measures its own position for the hover preview; no graph or interaction state. */
export function BrowserScreenButton({ label, color, onOpen, onPreview }: BrowserScreenButtonProps) {
  return <ScreenAction label={label} {...(color ? { color } : {})}
    onClick={() => { onPreview(null); onOpen(); }}
    onPointerEnter={(event) => { if (event.pointerType !== "touch") onPreview(anchorOf(event.currentTarget)); }}
    onPointerLeave={() => onPreview(null)}
    onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) onPreview(anchorOf(event.currentTarget)); }}
    onBlur={() => onPreview(null)} />;
}

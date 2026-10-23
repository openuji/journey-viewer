import { useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ScreenPreview } from "@journey-viewer/design-system";
import { getPreviewPosition, getPreviewWidth } from "../preview-placement.js";
import type { PreviewAnchor } from "../preview-placement.js";

export interface BrowserScreenPreviewProps {
  readonly anchor: PreviewAnchor;
  readonly visible: boolean;
  readonly title: string;
  readonly context: string;
  readonly touchpoint?: Readonly<{ label: string; color?: string }>;
  readonly onDismiss: () => void;
  readonly children?: ReactNode;
}

/** Places the floating card beside its anchor and dismisses it when the viewport scrolls or resizes. */
export function BrowserScreenPreview({ anchor, visible, title, context, touchpoint, onDismiss, children }: BrowserScreenPreviewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef(onDismiss);
  useLayoutEffect(() => { dismissRef.current = onDismiss; });
  useLayoutEffect(() => {
    const card = cardRef.current;
    const view = card?.ownerDocument.defaultView;
    if (!card || !view || !visible) return;
    card.style.inlineSize = `${getPreviewWidth(view.innerHeight)}px`;
    const { x, y } = getPreviewPosition(anchor, { width: card.offsetWidth, height: card.offsetHeight },
      { width: view.innerWidth, height: view.innerHeight });
    card.style.transform = `translate(${x}px, ${y}px)`;
  }, [anchor, visible, title, children]);
  useEffect(() => {
    const view = cardRef.current?.ownerDocument.defaultView;
    if (!view || !visible) return;
    const dismiss = () => dismissRef.current();
    view.addEventListener("scroll", dismiss, { capture: true, passive: true });
    view.addEventListener("resize", dismiss);
    return () => {
      view.removeEventListener("scroll", dismiss, { capture: true });
      view.removeEventListener("resize", dismiss);
    };
  }, [visible]);
  return <ScreenPreview ref={cardRef} title={title} context={context} visible={visible}
    {...(touchpoint ? { touchpoint } : {})}>{children}</ScreenPreview>;
}

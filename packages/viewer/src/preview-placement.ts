/** Viewport-relative rectangle of the control that opened a preview. */
export interface PreviewAnchor {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly height: number;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

const ANCHOR_GAP = 12;
const VIEWPORT_MARGIN = 8;
const PORTRAIT_RATIO = 840 / 1520;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

/** Narrower cards on short viewports keep a portrait screenshot fully visible. */
export function getPreviewWidth(viewportHeight: number): number {
  return clamp(
    Math.floor((viewportHeight - 96) * PORTRAIT_RATIO) + 16,
    150,
    248,
  );
}

/** Right of the anchor, or left of it when the card would overflow; vertically centred and clamped. */
export function getPreviewPosition(
  anchor: PreviewAnchor,
  card: Size,
  viewport: Size,
): Readonly<{ x: number; y: number }> {
  const rightX = anchor.right + ANCHOR_GAP;
  const x =
    rightX + card.width > viewport.width - VIEWPORT_MARGIN
      ? anchor.left - ANCHOR_GAP - card.width
      : rightX;
  const y = anchor.top + anchor.height / 2 - card.height / 2;
  return {
    x: Math.round(Math.max(VIEWPORT_MARGIN, x)),
    y: Math.round(
      Math.max(
        VIEWPORT_MARGIN,
        Math.min(y, viewport.height - card.height - VIEWPORT_MARGIN),
      ),
    ),
  };
}

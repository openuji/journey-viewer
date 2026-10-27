import type { Rect } from "@/layout/geometry";
import type { CardBox, FlowLayout, FrameBox } from "@/layout/compose";

export interface EnclosingFrame {
  readonly frame: FrameBox;
  readonly card: CardBox;
}

/**
 * Open composite frames the viewport is inside of, outermost first, whose card has scrolled out
 * of view: the containers a reader may need to name or close without scrolling back.
 */
export function enclosingFrames(
  layout: FlowLayout,
  view: Rect,
): readonly EnclosingFrame[] {
  return layout.frames
    .filter((frame) => frame.frame.card.kind === "composite")
    .filter(
      (frame) =>
        frame.rect.y < view.y &&
        frame.rect.y + frame.rect.height > view.y + 48 &&
        frame.rect.x < view.x + view.width &&
        frame.rect.x + frame.rect.width > view.x,
    )
    .flatMap((frame) => {
      const card = layout.cards.find(
        (c) => c.key === frame.frame.card.key && c.heads,
      );
      if (!card) return [];
      const hidden =
        card.rect.y + card.rect.height <= view.y + 8 ||
        card.rect.x + card.rect.width <= view.x ||
        card.rect.x >= view.x + view.width;
      return hidden ? [{ frame, card }] : [];
    })
    .sort((a, b) => a.frame.depth - b.frame.depth);
}

/** Every positioned block by its flow key, for disclosure transitions. */
export function blockRects(layout: FlowLayout): ReadonlyMap<string, Rect> {
  return new Map<string, Rect>([
    ...layout.frames.map((f) => [`frame:${f.key}`, f.rect] as const),
    ...layout.cards.map((c) => [`card:${c.key}`, c.rect] as const),
    ...layout.states.map((s) => [`state:${s.key}`, s.rect] as const),
    ...layout.contracts.map((c) => [`contract:${c.key}`, c.rect] as const),
  ]);
}

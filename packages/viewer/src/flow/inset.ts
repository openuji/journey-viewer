import type {
  InsetMapBlock,
  InsetMapFrame,
} from "@journey-viewer/design-system";
import type { FlowLayout } from "@/flow/compose";
import type { Rect } from "@/flow/geometry";

/** The chart in miniature, in the layout's coordinates, keyed by flow key. */
export interface FlowInset {
  readonly frames: readonly InsetMapFrame[];
  readonly blocks: readonly InsetMapBlock[];
}

export interface FlowInsetMarks {
  /** Selected block keys, as the canvas marks them (the selection, never a hover). */
  readonly selected: ReadonlySet<string>;
  /** The active journey's frame and every frame inside it, which are paper on the canvas. */
  readonly current: ReadonlySet<string>;
  /** Journeys the touchpoint filter leaves out. */
  readonly receded: (journeyId: string) => boolean;
}

/**
 * Every frame and every block a reader can pick, marked as on the canvas. An open composite's card
 * heads its frame without a box, so the frame stands for it; a contract is a dot at its glyph, not
 * the box its caption needs.
 */
export function insetShapes(
  layout: FlowLayout,
  { selected, current, receded }: FlowInsetMarks,
): FlowInset {
  const block = (
    id: string,
    key: string,
    rect: Rect,
    journeyId: string,
  ): InsetMapBlock => ({
    id,
    rect,
    ...(selected.has(key) ? { selected: true } : {}),
    ...(receded(journeyId) ? { receded: true } : {}),
  });
  return {
    frames: layout.frames.map((frame) => ({
      id: `frame:${frame.key}`,
      rect: frame.rect,
      context: current.has(frame.key) ? "current" : "outside",
    })),
    blocks: [
      ...layout.cards
        .filter((card) => !card.heads)
        .map((card) =>
          block(`card:${card.key}`, card.key, card.rect, card.card.journeyId),
        ),
      ...layout.states.map((state) =>
        block(
          `state:${state.key}`,
          state.key,
          state.rect,
          state.vertex.journeyId,
        ),
      ),
      ...layout.contracts.map((contract) => ({
        ...block(
          `contract:${contract.key}`,
          contract.key,
          { ...contract.glyph, width: 0, height: 0 },
          contract.contract.journeyId,
        ),
        dot: true,
      })),
    ],
  };
}

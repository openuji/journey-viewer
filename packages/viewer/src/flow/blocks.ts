import type { Rect } from "@/flow/geometry";
import type { FlowLayout } from "@/flow/compose";

/** Every positioned block by its flow key, for the viewport's disclosure transitions and reveals. */
export function blockRects(layout: FlowLayout): ReadonlyMap<string, Rect> {
  return new Map<string, Rect>([
    ...layout.frames.map((f) => [`frame:${f.key}`, f.rect] as const),
    ...layout.cards.map((c) => [`card:${c.key}`, c.rect] as const),
    ...layout.states.map((s) => [`state:${s.key}`, s.rect] as const),
    ...layout.contracts.map((c) => [`contract:${c.key}`, c.rect] as const),
  ]);
}

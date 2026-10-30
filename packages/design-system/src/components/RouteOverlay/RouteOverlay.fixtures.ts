import type { RouteOverlayProps } from "@/components/RouteOverlay/RouteOverlay";

export type RouteOverlayFixture = Readonly<Required<RouteOverlayProps>>;

/** An arrival from above and a departure below the same step, then both on one shared stretch. */
export function createRouteOverlayFixture(
  overrides: Readonly<Partial<RouteOverlayFixture>> = {},
): RouteOverlayFixture {
  return {
    ink: {
      strokes: [
        {
          tone: "incoming",
          points: [
            { x: 40, y: 8 },
            { x: 40, y: 56 },
          ],
        },
        {
          tone: "outgoing",
          points: [
            { x: 120, y: 56 },
            { x: 120, y: 8 },
          ],
          half: "right",
        },
        {
          tone: "incoming",
          points: [
            { x: 120, y: 8 },
            { x: 120, y: 56 },
          ],
          half: "right",
        },
      ],
      tips: [
        { tone: "incoming", from: { x: 40, y: 8 }, to: { x: 40, y: 56 } },
        {
          tone: "outgoing",
          from: { x: 120, y: 56 },
          to: { x: 120, y: 8 },
          half: "right",
        },
        {
          tone: "incoming",
          from: { x: 120, y: 8 },
          to: { x: 120, y: 56 },
          half: "right",
        },
      ],
    },
    ...overrides,
  };
}

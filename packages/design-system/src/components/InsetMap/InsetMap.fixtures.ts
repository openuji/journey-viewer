import type { InsetMapProps } from "@/components/InsetMap/InsetMap";

export type InsetMapFixture = Readonly<
  Required<Pick<InsetMapProps, "width" | "height" | "frames" | "blocks">> &
    Pick<InsetMapProps, "view">
>;

/** A root journey with one child journey open inside it, the canvas showing its upper part. */
export function createInsetMapFixture(
  overrides: Readonly<Partial<InsetMapFixture>> = {},
): InsetMapFixture {
  return {
    width: 640,
    height: 900,
    frames: [
      {
        id: "frame:root",
        rect: { x: 0, y: 0, width: 640, height: 900 },
        context: "outside",
      },
      {
        id: "frame:child",
        rect: { x: 200, y: 330, width: 400, height: 360 },
        context: "current",
      },
    ],
    blocks: [
      { id: "state:start", rect: { x: 40, y: 60, width: 160, height: 40 } },
      { id: "state:choose", rect: { x: 40, y: 180, width: 160, height: 40 } },
      { id: "state:help", rect: { x: 40, y: 420, width: 120, height: 40 } },
      {
        id: "state:code",
        rect: { x: 240, y: 400, width: 160, height: 40 },
        selected: true,
      },
      { id: "state:retry", rect: { x: 420, y: 400, width: 140, height: 40 } },
      { id: "state:verify", rect: { x: 320, y: 520, width: 160, height: 40 } },
      {
        id: "state:fallback",
        rect: { x: 40, y: 560, width: 120, height: 40 },
        receded: true,
      },
      { id: "state:done", rect: { x: 240, y: 800, width: 160, height: 40 } },
      {
        id: "contract:entry",
        rect: { x: 300, y: 330, width: 0, height: 0 },
        dot: true,
      },
      {
        id: "contract:exit",
        rect: { x: 500, y: 690, width: 0, height: 0 },
        dot: true,
      },
    ],
    view: { x: -24, y: -24, width: 520, height: 420 },
    ...overrides,
  };
}

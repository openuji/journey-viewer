import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Point } from "@/layout/geometry";
import type { Connector as ConnectorBox } from "@/layout/compose";
import type { ActiveRoute } from "@/model/presentation";
import { activeStrokes } from "@/layout/strokes";
import { Connector } from "@/components/primitives/Connector/Connector";
import { ContractGlyph } from "@/components/primitives/ContractGlyph/ContractGlyph";
import { RouteOverlay } from "@/components/flow/RouteOverlay/RouteOverlay";

const meta = {
  title: "Flow/RouteOverlay",
  component: RouteOverlay,
  args: { ink: { strokes: [], tips: [] } },
} satisfies Meta<typeof RouteOverlay>;
export default meta;
type Story = StoryObj<typeof meta>;

interface Line {
  readonly points: readonly Point[];
  readonly route?: ActiveRoute;
}

const connector = (line: Line, i: number): ConnectorBox => ({
  key: `c${i}`,
  kind: "bundle",
  points: line.points,
  from: `a${i}`,
  to: `b${i}`,
  arrowStart: false,
  arrowEnd: true,
});

/** Blocks the lines attach to, so contact points read as they do in the scene. */
const Block = ({ x, y }: Point) => (
  <rect
    x={x - 30}
    y={y}
    width="60"
    height="20"
    rx="5"
    fill="var(--jv-color-surface-raised, var(--jv-color-surface))"
    stroke="var(--jv-color-border-strong)"
  />
);

const Case = ({
  caption,
  lines,
  blocks,
  glyph,
}: {
  caption: string;
  lines: readonly Line[];
  blocks: readonly Point[];
  glyph?: Point;
}) => {
  const connectors = lines.map(connector);
  const routes = new Map<string, ActiveRoute>(
    lines.flatMap((line, i) =>
      line.route ? [[`c${i}`, line.route] as const] : [],
    ),
  );
  return (
    <figure style={{ margin: 0 }}>
      <figcaption className="flow-story-caption">{caption}</figcaption>
      <div style={{ position: "relative", width: 180, height: 140 }}>
        <svg
          width="180"
          height="140"
          style={{
            overflow: "visible",
            background: "var(--jv-color-surface)",
            borderRadius: 7,
          }}
        >
          {connectors.map((c) => (
            <Connector
              key={c.key}
              points={c.points}
              kind="bundle"
              active={routes.has(c.key)}
              rest={!routes.has(c.key)}
            />
          ))}
          <RouteOverlay ink={activeStrokes(connectors, routes)} />
          {blocks.map((b) => (
            <Block key={`${b.x},${b.y}`} {...b} />
          ))}
        </svg>
        {glyph && (
          <div
            // The glyph's centre sits 7px above the contract's bottom edge, as in the scene.
            style={{
              position: "absolute",
              left: glyph.x - 7,
              top: glyph.y + 7 - 22,
            }}
          >
            <ContractGlyph
              kind="exit"
              lines={["Exit"]}
              label="Exit"
              style={{ height: 22 }}
              onSelect={() => {}}
            />
          </div>
        )}
      </div>
    </figure>
  );
};

/**
 * Iteration 4: every block has one contact point per side; an active route is full width on the
 * centre line; only a stretch an arrival and a departure share splits into halves, with half
 * arrowheads on each colour's side.
 */
export const Gallery: Story = {
  render: () => (
    <div
      className="flow-story-pad"
      style={
        {
          "--flow-connector":
            "color-mix(in srgb, var(--jv-color-subtle) 80%, var(--jv-color-surface))",
        } as CSSProperties
      }
    >
      <Case
        caption="Both directions on one line: halves and half arrowheads"
        blocks={[
          { x: 90, y: 10 },
          { x: 90, y: 110 },
        ]}
        lines={[
          {
            points: [
              { x: 90, y: 30 },
              { x: 90, y: 110 },
            ],
            route: { incoming: ["start"], outgoing: ["end"] },
          },
        ]}
      />
      <Case
        caption="An arrival and a return at one contact point"
        blocks={[
          { x: 50, y: 10 },
          { x: 150, y: 10 },
          { x: 90, y: 110 },
        ]}
        lines={[
          {
            points: [
              { x: 50, y: 30 },
              { x: 50, y: 70 },
              { x: 90, y: 70 },
              { x: 90, y: 110 },
            ],
            route: { incoming: ["end"], outgoing: [] },
          },
          {
            points: [
              { x: 90, y: 110 },
              { x: 90, y: 70 },
              { x: 150, y: 70 },
              { x: 150, y: 30 },
            ],
            route: { incoming: [], outgoing: ["end"] },
          },
        ]}
      />
      <Case
        caption="Fan-in: one arrowhead where routes meet"
        blocks={[
          { x: 40, y: 10 },
          { x: 140, y: 10 },
          { x: 90, y: 110 },
        ]}
        lines={[
          {
            points: [
              { x: 40, y: 30 },
              { x: 40, y: 70 },
              { x: 90, y: 70 },
              { x: 90, y: 110 },
            ],
            route: { incoming: ["end"], outgoing: [] },
          },
          {
            points: [
              { x: 140, y: 30 },
              { x: 140, y: 70 },
              { x: 90, y: 70 },
              { x: 90, y: 110 },
            ],
            route: { incoming: ["end"], outgoing: [] },
          },
        ]}
      />
      <Case
        caption="A lone departure stays centred on its exit"
        blocks={[{ x: 90, y: 110 }]}
        glyph={{ x: 90, y: 20 }}
        lines={[
          {
            points: [
              { x: 90, y: 25 },
              { x: 90, y: 110 },
            ],
            route: { incoming: [], outgoing: ["end"] },
          },
        ]}
      />
    </div>
  ),
};

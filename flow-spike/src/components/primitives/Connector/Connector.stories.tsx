import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Connector } from "@/components/primitives/Connector/Connector";
import type { ConnectorProps } from "@/components/primitives/Connector/Connector";

const meta = {
  title: "Primitives/Connector",
  component: Connector,
  args: { points: [], kind: "bundle" },
} satisfies Meta<typeof Connector>;
export default meta;
type Story = StoryObj<typeof meta>;

const route = [
  { x: 40, y: 12 },
  { x: 40, y: 50 },
  { x: 140, y: 50 },
  { x: 140, y: 98 },
];
const cases: readonly (Partial<ConnectorProps> & { caption: string })[] = [
  { caption: "At rest: no arrowheads, may share a corridor" },
  { caption: "Another step is active: rest weight", rest: true },
  {
    caption: "Six transitions on an active route (spec)",
    active: true,
    count: 6,
  },
  { caption: "Where a way in starts", kind: "association" },
];

/**
 * Point 1, metro style: the resting network only. Colour, direction and arrowheads belong to the
 * active step's routes (Flow/RouteOverlay).
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
      {cases.map(({ caption, ...props }) => (
        <figure key={caption} style={{ margin: 0 }}>
          <figcaption className="flow-story-caption">{caption}</figcaption>
          <svg
            width="180"
            height="110"
            style={{
              overflow: "visible",
              background: "var(--jv-color-surface)",
              borderRadius: 7,
            }}
          >
            <Connector points={route} kind="bundle" {...props} />
          </svg>
        </figure>
      ))}
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Connector } from "@/components/Connector/Connector";
import { RouteOverlay } from "@/components/RouteOverlay/RouteOverlay";
import { createRouteOverlayFixture } from "@/components/RouteOverlay/RouteOverlay.fixtures";

const meta = {
  title: "Flow/RouteOverlay",
  component: RouteOverlay,
  args: createRouteOverlayFixture(),
  render: (args) => (
    <svg width="160" height="64" overflow="visible" aria-hidden="true">
      <Connector
        kind="bundle"
        points={[
          { x: 40, y: 8 },
          { x: 40, y: 56 },
        ]}
        rest
      />
      <Connector
        kind="bundle"
        points={[
          { x: 120, y: 8 },
          { x: 120, y: 56 },
        ]}
        rest
      />
      <RouteOverlay {...args} />
    </svg>
  ),
} satisfies Meta<typeof RouteOverlay>;
export default meta;
type Story = StoryObj<typeof meta>;
/** A lone arrival on the centre line; an arrival and a departure sharing one stretch. */
export const ArrivalAndSharedStretch: Story = {};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { InsetMap } from "@/components/InsetMap/InsetMap";
import { createInsetMapFixture } from "@/components/InsetMap/InsetMap.fixtures";

const meta = {
  title: "Flow/InsetMap",
  component: InsetMap,
  args: createInsetMapFixture(),
} satisfies Meta<typeof InsetMap>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The canvas shows the root journey's upper part; the selection sits just below it. */
export const ViewInside: Story = {};

/** Scrolled to the bottom-right corner: the view is drawn only where it meets the chart. */
export const ViewAtAnEdge: Story = {
  args: createInsetMapFixture({
    view: { x: 300, y: 620, width: 520, height: 420 },
  }),
};

/** A tall chart, like several root journeys stacked: the inset keeps its height cap. */
export const TallChart: Story = {
  args: createInsetMapFixture({
    height: 2700,
    frames: [0, 1, 2].map((index) => ({
      id: `frame:root-${index}`,
      rect: { x: 0, y: index * 900, width: 640, height: 860 },
      context: index === 1 ? "current" : "outside",
    })),
    blocks: [0, 1, 2].flatMap((index) =>
      createInsetMapFixture().blocks.map((block) => ({
        ...block,
        id: `${block.id}-${index}`,
        rect: { ...block.rect, y: block.rect.y * 0.9 + index * 900 },
        selected: index === 1 && block.selected === true,
      })),
    ),
    view: { x: -24, y: 860, width: 900, height: 600 },
  }),
};

/** A wide chart: the inset keeps its width cap. */
export const WideChart: Story = {
  args: createInsetMapFixture({
    width: 1600,
    height: 600,
    frames: [
      {
        id: "frame:root",
        rect: { x: 0, y: 0, width: 1600, height: 600 },
        context: "current",
      },
    ],
    blocks: Array.from({ length: 9 }, (_, index) => ({
      id: `state:${index}`,
      rect: {
        x: 40 + index * 170,
        y: index % 2 ? 340 : 120,
        width: 140,
        height: 40,
      },
    })),
    view: { x: 600, y: 0, width: 700, height: 500 },
  }),
};

/** No view yet, before the canvas has measured itself: only the chart. */
export const ChartOnly: Story = {
  args: createInsetMapFixture({ view: null }),
};

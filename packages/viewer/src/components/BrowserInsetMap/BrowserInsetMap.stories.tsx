import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BrowserInsetMap } from "@/components/BrowserInsetMap/BrowserInsetMap";
import { ChartScene, chart, chartInset } from "~/.storybook/chart";

/**
 * A plain scrolling box over the chart, with the inset map beside it in the same grid cell, as
 * `BrowserFlowViewport` arranges them: the chart starts at the scroll origin, at 100%.
 */
function ScrollingChart() {
  const scroller = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element)
      setSize({ width: element.clientWidth, height: element.clientHeight });
  }, []);
  return (
    <div
      style={{
        display: "grid",
        inlineSize: "min(40rem, 100%)",
        blockSize: "min(28rem, 80dvh)",
        border: "var(--jv-border-thin) solid var(--jv-color-border)",
        borderRadius: "var(--jv-radius-lg)",
        overflow: "clip",
        background: "var(--jv-color-background)",
      }}
    >
      <div
        ref={scroller}
        role="region"
        aria-label="Chart"
        tabIndex={0}
        style={{ gridArea: "1 / 1", overflow: "auto" }}
      >
        <ChartScene />
      </div>
      {size.width > 0 && (
        <BrowserInsetMap
          {...chartInset}
          scroller={scroller}
          origin={0}
          scale={1}
          size={size}
          width={chart.width}
          height={chart.height}
        />
      )}
    </div>
  );
}

/**
 * The inset map's browser boundary: it follows the box's scroll, and dragging its outline, pressing
 * elsewhere on it or turning the wheel over it moves the box.
 */
const meta = {
  title: "Viewer/BrowserInsetMap",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const FollowsAndMovesTheCanvas: Story = {
  render: () => <ScrollingChart />,
};

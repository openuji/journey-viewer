import type { Meta, StoryObj } from "@storybook/react-vite";
import { BrowserFlowViewport } from "@/components/BrowserFlowViewport/BrowserFlowViewport";
import type { FlowZoomLevel } from "@/components/JourneyFlow/JourneyFlow";
import { ChartScene, chart, chartBlocks, chartInset } from "~/.storybook/chart";

/** A canvas-sized box, as the flow view gives the viewport. */
function Canvas({ zoom }: Readonly<{ zoom: FlowZoomLevel }>) {
  return (
    <div
      style={{
        display: "grid",
        blockSize: "min(36rem, 80dvh)",
        border: "var(--jv-border-thin) solid var(--jv-color-border)",
        borderRadius: "var(--jv-radius-lg)",
        overflow: "clip",
      }}
    >
      <BrowserFlowViewport
        blocks={chartBlocks}
        width={chart.width}
        height={chart.height}
        zoom={zoom}
        anchor={null}
        reveal={null}
        inset={chartInset}
        label="Chart"
      >
        <ChartScene />
      </BrowserFlowViewport>
    </div>
  );
}

/**
 * The flow canvas's browser boundary on its own: native scrolling over a chart, fit zoom, and the
 * inset map while the chart is larger than the canvas.
 */
const meta = {
  title: "Viewer/BrowserFlowViewport",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** At 100% the chart outgrows the canvas: it scrolls, and the inset map shows where you are. */
export const ActualSize: Story = { render: () => <Canvas zoom="actual" /> };

/** Fitted, the whole chart is in view, so there is no inset map. */
export const Fit: Story = { render: () => <Canvas zoom="fit" /> };

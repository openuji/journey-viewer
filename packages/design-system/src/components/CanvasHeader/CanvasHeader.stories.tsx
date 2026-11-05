import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CanvasHeader } from "@/components/CanvasHeader/CanvasHeader";
import { createCanvasHeaderFixture } from "@/components/CanvasHeader/CanvasHeader.fixtures";
import { FlowKey } from "@/components/FlowKey/FlowKey";
import { Icon } from "@/components/Icon/Icon";
import { JourneyPath } from "@/components/JourneyPath/JourneyPath";
import {
  createJourneyPathFixture,
  createJourneyPathRootsFixture,
} from "@/components/JourneyPath/JourneyPath.fixtures";
import type { JourneyPathFixture } from "@/components/JourneyPath/JourneyPath.fixtures";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";

const path = (fixture: JourneyPathFixture) => (
  <JourneyPath
    items={fixture.items.map(({ choices, ...item }) => ({
      ...item,
      ...(choices
        ? {
            choices: choices.map((choice) => ({
              ...choice,
              onSelect: () => undefined,
            })),
          }
        : {}),
      onSelect: () => undefined,
    }))}
  />
);

/** A flow canvas's commands, drawn from glyphs as the viewer's Flow controls are. */
function Commands() {
  const [placement, setPlacement] = useState("median");
  const [zoom, setZoom] = useState("actual");
  const [roots, setRoots] = useState("one");
  return (
    <>
      <SegmentedControl
        label="Placement"
        value={placement}
        onChange={setPlacement}
        options={[
          {
            value: "median",
            label: "Median",
            icon: <Icon name="align-median" />,
          },
          {
            value: "aligned-center",
            label: "Aligned centre",
            icon: <Icon name="align-centre" />,
          },
          {
            value: "aligned-left",
            label: "Aligned left",
            icon: <Icon name="align-left" />,
          },
        ]}
      />
      <SegmentedControl
        label="Zoom"
        value={zoom}
        onChange={setZoom}
        options={[
          {
            value: "actual",
            label: "100%",
            icon: <Icon name="zoom-actual" />,
          },
          { value: "fit", label: "Fit", icon: <Icon name="zoom-fit" /> },
        ]}
      />
      <SegmentedControl
        label="Journeys"
        value={roots}
        onChange={setRoots}
        options={[
          {
            value: "all",
            label: "All journeys",
            icon: <Icon name="frames" />,
          },
          { value: "one", label: "One journey", icon: <Icon name="frame" /> },
        ]}
      />
      <FlowKey />
    </>
  );
}

const meta = {
  title: "Flow/CanvasHeader",
  component: CanvasHeader,
  parameters: { layout: "fullscreen" },
  args: createCanvasHeaderFixture(),
  render: (args) => (
    <div style={{ minBlockSize: 320 }}>
      <CanvasHeader
        {...args}
        path={path(createJourneyPathFixture())}
        commands={<Commands />}
      />
    </div>
  ),
} satisfies Meta<typeof CanvasHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
/** The path on the left, the command plane on the right, on one row from `md`. */
export const PathAndCommands: Story = {};
/** One root journey at a time: the root step's switch sits against its title. */
export const RootChoice: Story = {
  render: (args) => (
    <div style={{ minBlockSize: 320 }}>
      <CanvasHeader
        {...args}
        path={path({
          items: [
            ...createJourneyPathRootsFixture().items,
            ...createJourneyPathFixture().items.slice(1),
          ],
        })}
        commands={<Commands />}
      />
    </div>
  ),
};
/** Without commands, the header is the path alone. */
export const PathOnly: Story = {
  render: (args) => (
    <CanvasHeader {...args} path={path(createJourneyPathFixture())} />
  ),
};

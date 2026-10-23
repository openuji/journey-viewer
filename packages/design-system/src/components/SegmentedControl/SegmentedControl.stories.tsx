import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SegmentedControl } from "./SegmentedControl.js";
import { createSegmentedControlFixture } from "./SegmentedControl.fixtures.ts";

const meta = {
  title: "Primitives/SegmentedControl", component: SegmentedControl, tags: ["autodocs"],
  args: { ...createSegmentedControlFixture(), onChange: () => {} },
} satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
function Controlled() {
  const [value, setValue] = useState<"tree" | "columns">("tree");
  return <SegmentedControl label="View" value={value} onChange={setValue}
    options={[{ value: "tree", label: "Tree" }, { value: "columns", label: "Columns" }]} />;
}
export const ControlledSwitch: Story = { render: () => <Controlled /> };

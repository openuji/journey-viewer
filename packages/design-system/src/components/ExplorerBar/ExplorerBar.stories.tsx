import type { Meta, StoryObj } from "@storybook/react-vite";
import { ExplorerBar, ExplorerBarSpacer, ExplorerBarTitle } from "./ExplorerBar.js";
import { createExplorerBarFixture } from "./ExplorerBar.fixtures.ts";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl.js";
import { SearchField } from "../SearchField/SearchField.js";

const meta = {
  title: "Hierarchy/ExplorerBar", component: ExplorerBarTitle, tags: ["autodocs"],
  args: createExplorerBarFixture(),
  render: (args) => <ExplorerBar>
    <ExplorerBarTitle {...args} />
    <SegmentedControl label="View" value="tree" onChange={() => {}} options={[{ value: "tree", label: "Tree" }, { value: "columns", label: "Columns" }]} />
    <ExplorerBarSpacer />
    <SearchField label="Search the graph" value="" placeholder="Find a state or journey  /" onChange={() => {}} onSubmit={() => {}} onClear={() => {}} />
  </ExplorerBar>,
} satisfies Meta<typeof ExplorerBarTitle>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ExplorerBar,
  ExplorerBarSpacer,
  ExplorerBarTitle,
} from "@/components/ExplorerBar/ExplorerBar";
import { createExplorerBarFixture } from "@/components/ExplorerBar/ExplorerBar.fixtures";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { SearchField } from "@/components/SearchField/SearchField";

const meta = {
  title: "Hierarchy/ExplorerBar",
  component: ExplorerBarTitle,
  tags: ["autodocs"],
  args: createExplorerBarFixture(),
  render: (args) => (
    <ExplorerBar>
      <ExplorerBarTitle {...args} />
      <SegmentedControl
        label="View"
        value="tree"
        onChange={() => {}}
        options={[
          { value: "tree", label: "Tree" },
          { value: "columns", label: "Columns" },
        ]}
      />
      <ExplorerBarSpacer />
      <SearchField
        label="Search the graph"
        value=""
        placeholder="Find a state or journey  /"
        onChange={() => {}}
        onSubmit={() => {}}
        onClear={() => {}}
      />
    </ExplorerBar>
  ),
} satisfies Meta<typeof ExplorerBarTitle>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

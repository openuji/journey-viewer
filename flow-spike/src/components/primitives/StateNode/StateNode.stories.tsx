import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateNode } from "@/components/primitives/StateNode/StateNode";
import type { StateNodeProps } from "@/components/primitives/StateNode/StateNode";

const sized = (width: number, lines: number) => (props: StateNodeProps) => (
  <div className="flow-story-pad">
    <div style={{ width, height: 16 + lines * 17 }}>
      <StateNode {...props} />
    </div>
  </div>
);

const meta = {
  title: "Primitives/StateNode",
  component: StateNode,
  args: {
    lines: ["Select account"],
    label: "Select account",
    onSelect: () => {},
  },
  render: sized(148, 1),
} satisfies Meta<typeof StateNode>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
export const LeadsIntoSelection: Story = { args: { tone: "incoming" } };
export const ReachedFromSelection: Story = { args: { tone: "outgoing" } };
export const BothDirections: Story = { args: { tone: "both" } };
export const WithScreen: Story = {
  args: {
    screen: {
      label: "Screen: Select account",
      color: "var(--jv-color-category-blue)",
      onOpen: () => {},
    },
  },
  render: sized(172, 1),
};
export const WrappedLabel: Story = {
  args: {
    lines: ["Continue with step-up", "authentication"],
    label: "Continue with step-up authentication",
  },
  render: sized(196, 2),
};
export const OutgoingNavigation: Story = { args: { outgoing: 2 } };

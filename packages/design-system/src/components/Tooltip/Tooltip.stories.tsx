import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "@/components/Icon/Icon";
import { IconButton } from "@/components/IconButton/IconButton";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import { createTooltipFixture } from "@/components/Tooltip/Tooltip.fixtures";

const meta = {
  title: "Primitives/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  args: { ...createTooltipFixture(), children: null },
  render: ({ label }) => (
    <div style={{ minBlockSize: 96 }}>
      <Tooltip label={label}>
        <IconButton label={label} icon={<Icon name="zoom-fit" />} />
      </Tooltip>
    </div>
  ),
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Point at the button, or Tab to it. */
export const Default: Story = {};

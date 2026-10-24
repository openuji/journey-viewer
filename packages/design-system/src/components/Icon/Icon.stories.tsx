import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "@/components/Icon/Icon";
import { createIconFixture, iconNames } from "@/components/Icon/Icon.fixtures";

const meta = {
  title: "Primitives/Icon",
  component: Icon,
  tags: ["autodocs"],
  args: createIconFixture(),
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Catalog: Story = {
  render: () => (
    <div className="story-inline">
      {iconNames.map((name) => (
        <span key={name} className="story-inline">
          <Icon name={name} />
          <code>{name}</code>
        </span>
      ))}
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContextStrip } from "@/components/flow/ContextStrip/ContextStrip";

const meta = {
  title: "Flow/ContextStrip",
  component: ContextStrip,
  args: {
    items: [
      {
        key: "idp",
        title: "Authenticate with identity provider",
        touchpoint: { label: "IdP", color: "var(--jv-color-category-blue)" },
        onReveal: () => {},
        onCollapse: () => {},
      },
      {
        key: "mfa",
        title: "MFA challenge",
        touchpoint: { label: "IdP", color: "var(--jv-color-category-blue)" },
        onReveal: () => {},
        onCollapse: () => {},
      },
    ],
  },
  render: (args) => (
    <div className="flow-story-pad">
      <ContextStrip {...args} />
    </div>
  ),
} satisfies Meta<typeof ContextStrip>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Point 2: inside a large open frame, its name and collapse action stay in reach. */
export const InsideTwoOpenFrames: Story = {};

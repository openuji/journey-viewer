import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContextStrip } from "@/components/flow/ContextStrip/ContextStrip";

const app = {
  key: "app",
  title: "App auth journey",
  touchpoint: { label: "App", color: "var(--jv-color-category-orange)" },
  onSelect: () => {},
};

const meta = {
  title: "Flow/ContextStrip",
  component: ContextStrip,
  args: { items: [app] },
  render: (args) => (
    <div className="flow-story-pad">
      <ContextStrip {...args} />
    </div>
  ),
} satisfies Meta<typeof ContextStrip>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing opened yet: the root journey is the active one. */
export const RootJourney: Story = {};

/** Point 2: each opened composite extends the path; the last step is the active journey. */
export const TwoJourneysOpened: Story = {
  args: {
    items: [
      app,
      {
        key: "idp",
        title: "Authenticate with identity provider",
        touchpoint: { label: "IdP", color: "var(--jv-color-category-blue)" },
        onSelect: () => {},
      },
      {
        key: "mfa",
        title: "MFA challenge",
        touchpoint: { label: "IdP", color: "var(--jv-color-category-blue)" },
        onSelect: () => {},
      },
    ],
  },
};

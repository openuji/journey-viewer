import type { Meta, StoryObj } from "@storybook/react-vite";
import { CompositeCard } from "@/components/primitives/CompositeCard/CompositeCard";
import type { CompositeCardProps } from "@/components/primitives/CompositeCard/CompositeCard";

const card = (props: CompositeCardProps) => (
  <div style={{ width: 240, height: 64 }}>
    <CompositeCard {...props} />
  </div>
);

const meta = {
  title: "Primitives/CompositeCard",
  component: CompositeCard,
  args: {
    title: ["Authenticate with identity", "provider"],
    caption: ["IdP auth journey"],
    touchpoint: { label: "IdP", color: "var(--jv-color-category-blue)" },
    toggle: "expand",
    onSelect: () => {},
    onToggle: () => {},
  },
  render: (props) => <div className="flow-story-pad">{card(props)}</div>,
} satisfies Meta<typeof CompositeCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Selected: Story = { args: { selected: true } };
export const RepeatsAnEnclosingJourney: Story = {
  args: {
    toggle: null,
    caption: ["IdP auth journey (repeats an", "enclosing journey)"],
  },
};
export const NoChildJourney: Story = {
  args: {
    toggle: null,
    caption: ["No child journey"],
    touchpoint: { label: "App" },
  },
};

/** Point 2: the closed card and the open frame's corner are the same card, toggle in the same place. */
export const SameCardBothStates: Story = {
  render: (props) => (
    <div className="flow-story-pad">
      <div>
        <span className="flow-story-caption">Closed</span>
        {card(props)}
      </div>
      <div>
        <span className="flow-story-caption">
          Open: the card is the frame's corner
        </span>
        <div
          style={{
            position: "relative",
            width: 420,
            height: 200,
            border:
              "1px solid color-mix(in srgb, var(--jv-color-category-blue) 45%, var(--jv-color-border))",
            borderRadius: "var(--jv-radius-md)",
            background:
              "color-mix(in srgb, var(--jv-color-category-blue) 4%, var(--jv-color-surface))",
          }}
        >
          {card({ ...props, toggle: "collapse" })}
        </div>
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContractGlyph } from "@/components/primitives/ContractGlyph/ContractGlyph";

const meta = {
  title: "Primitives/ContractGlyph",
  component: ContractGlyph,
  args: {
    kind: "entry",
    lines: ["Start at login"],
    label: "Start at login",
    onSelect: () => {},
  },
} satisfies Meta<typeof ContractGlyph>;
export default meta;
type Story = StoryObj<typeof meta>;

const border = (side: "top" | "bottom", children: React.ReactNode) => (
  <div className="flow-story-pad">
    <div
      style={{
        position: "relative",
        width: 520,
        height: 90,
        [side === "top" ? "borderTop" : "borderBottom"]:
          "1px solid var(--jv-color-border-strong)",
        display: "flex",
        alignItems: side === "top" ? "flex-start" : "flex-end",
        gap: 32,
        paddingInline: 24,
      }}
    >
      {children}
    </div>
  </div>
);

/** Point 4: entries sit on the frame's top border, the default one filled. */
export const EntriesOnTheTopBorder: Story = {
  render: (args) =>
    border(
      "top",
      <>
        <div style={{ width: 150, height: 22 }}>
          <ContractGlyph
            {...args}
            isDefault
            lines={["Start at account selection"]}
            label="Start at account selection"
          />
        </div>
        <div style={{ width: 110, height: 22 }}>
          <ContractGlyph {...args} />
        </div>
      </>,
    ),
};

/** Exits sit on the bottom border as circled crosses. */
export const ExitsOnTheBottomBorder: Story = {
  render: (args) =>
    border(
      "bottom",
      <>
        <div style={{ width: 120, height: 22 }}>
          <ContractGlyph
            {...args}
            kind="exit"
            lines={["IdP auth success"]}
            label="IdP auth success"
          />
        </div>
        <div style={{ width: 120, height: 22 }}>
          <ContractGlyph
            {...args}
            kind="exit"
            lines={["IdP auth failed"]}
            label="IdP auth failed"
            selected
          />
        </div>
      </>,
    ),
};

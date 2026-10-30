import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContractGlyph } from "@/components/ContractGlyph/ContractGlyph";
import { createContractGlyphFixture } from "@/components/ContractGlyph/ContractGlyph.fixtures";

const meta = {
  title: "Flow/ContractGlyph",
  component: ContractGlyph,
  args: { ...createContractGlyphFixture(), onSelect: () => undefined },
  render: (args) => (
    <div className="story-inline" style={{ paddingBlock: 16 }}>
      <ContractGlyph {...args} />
    </div>
  ),
} satisfies Meta<typeof ContractGlyph>;
export default meta;
type Story = StoryObj<typeof meta>;
/** On a frame's top border: the default entry is filled. */
export const Entries: Story = {
  render: (args) => (
    <div className="story-inline" style={{ paddingBlock: 16 }}>
      <ContractGlyph {...args} />
      <ContractGlyph
        {...args}
        {...createContractGlyphFixture({
          isDefault: false,
          lines: ["Recover account"],
          label: "Recover account",
        })}
      />
    </div>
  ),
};
/** On a frame's bottom border. */
export const Exits: Story = {
  args: createContractGlyphFixture({
    kind: "exit",
    isDefault: false,
    lines: ["Access denied"],
    label: "Access denied",
  }),
};
export const Selected: Story = {
  args: createContractGlyphFixture({ selected: true }),
};

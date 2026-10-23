import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button.js";
import { createButtonFixture } from "./Button.fixtures.ts";

const meta = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  args: createButtonFixture(),
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Variants: Story = {
  render: () => (
    <div className="story-inline">
      {(["solid", "outline", "ghost", "row", "bare", "pill", "segment", "chip", "panel"] as const).map((variant) => (
        <Button
          key={variant}
          {...createButtonFixture({ variant, children: variant })}
        />
      ))}
    </div>
  ),
};
export const SizesAndStates: Story = {
  render: () => (
    <div className="story-inline">
      <Button {...createButtonFixture({ size: "xs", children: "Extra small" })} />
      <Button {...createButtonFixture({ size: "sm" })} />
      <Button {...createButtonFixture({ size: "md", children: "Medium" })} />
      <Button
        {...createButtonFixture({ disabled: true, children: "Unavailable" })}
      />
      <Button
        {...createButtonFixture({ selected: true, children: "Selected" })}
        aria-pressed
      />
    </div>
  ),
};
export const SelectedTreatments: Story = {
  render: () => (
    <div className="story-inline">
      {(["pill", "segment", "chip"] as const).map((variant) => (
        <Button key={variant} {...createButtonFixture({ variant, selected: true, children: `${variant} selected` })} aria-pressed />
      ))}
    </div>
  ),
};

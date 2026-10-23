import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyContractControls } from "./JourneyContractControls.js";
import type { ContractSelection } from "./JourneyContractControls.js";
import { createJourneyContractControlsFixture } from "./JourneyContractControls.fixtures.ts";

const meta = {
  title: "Hierarchy/JourneyContractControls",
  component: JourneyContractControls,
  tags: ["autodocs"],
  args: { ...createJourneyContractControlsFixture(), onSelect: () => {}, onToggle: () => {} },
} satisfies Meta<typeof JourneyContractControls>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Closed: Story = { args: { open: false } };
export const Selected: Story = { args: { selection: { kind: "entry", id: "entry:start" } } };
function ControlledExample() {
  const [selection, setSelection] = useState<ContractSelection | null>(null);
  const [open, setOpen] = useState(false);
  return <JourneyContractControls {...createJourneyContractControlsFixture()} open={open} onToggle={() => setOpen((value) => !value)}
    selection={selection} onSelect={(kind, id) => setSelection({ kind, id })} />;
}
export const Controlled: Story = { render: () => <ControlledExample /> };

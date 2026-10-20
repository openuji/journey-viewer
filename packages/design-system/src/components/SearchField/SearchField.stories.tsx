import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchField } from "./SearchField.js";
import { createSearchFieldFixture } from "./SearchField.fixtures.ts";

const meta = {
  title: "Primitives/SearchField", component: SearchField, tags: ["autodocs"],
  args: { ...createSearchFieldFixture(), onChange: () => {}, onSubmit: () => {}, onClear: () => {} },
} satisfies Meta<typeof SearchField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
function ControlledField() {
  const [value, setValue] = useState("");
  return <SearchField label="Search the graph" value={value} onChange={setValue} onSubmit={() => {}} onClear={() => setValue("")} />;
}
export const Controlled: Story = { render: () => <ControlledField /> };

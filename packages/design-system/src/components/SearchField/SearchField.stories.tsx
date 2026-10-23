import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchField, SearchResult } from "./SearchField.js";
import { createSearchFieldFixture } from "./SearchField.fixtures.ts";

const meta = {
  title: "Primitives/SearchField", component: SearchField, tags: ["autodocs"],
  args: { ...createSearchFieldFixture(), onChange: () => {}, onSubmit: () => {}, onClear: () => {} },
  decorators: [(Story) => <div style={{ minBlockSize: "16rem", display: "flex", justifyContent: "flex-end" }}><Story /></div>],
} satisfies Meta<typeof SearchField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Results: Story = {
  args: { value: "sign", open: true, children: <>
    <SearchResult label="Sign-in required" context="Account access" touchpoint={{ label: "Web", color: "var(--jv-color-category-orange)" }} screen onPick={() => {}} />
    <SearchResult label="Sign-in failed" context="Account access" onPick={() => {}} />
  </> },
};
export const NoMatches: Story = { args: { value: "zzz", open: true, status: "No matches" } };
function ControlledField() {
  const [value, setValue] = useState("");
  return <SearchField label="Search the graph" value={value} open={value.trim() !== ""} {...(value ? { status: "No matches" } : {})}
    onChange={setValue} onSubmit={() => {}} onClear={() => setValue("")} />;
}
export const Controlled: Story = { render: () => <ControlledField /> };

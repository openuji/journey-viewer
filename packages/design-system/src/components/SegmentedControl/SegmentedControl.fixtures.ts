import type { SegmentedControlProps } from "@/components/SegmentedControl/SegmentedControl";

export type SegmentedControlFixture = Readonly<
  Pick<SegmentedControlProps<string>, "label" | "options" | "value">
>;
export function createSegmentedControlFixture(
  overrides: Readonly<Partial<SegmentedControlFixture>> = {},
): SegmentedControlFixture {
  return {
    label: "View",
    options: [
      { value: "tree", label: "Tree" },
      { value: "columns", label: "Columns" },
    ],
    value: "tree",
    ...overrides,
  };
}

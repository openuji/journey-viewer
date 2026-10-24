import type { StateRowProps } from "@/components/StateRow/StateRow";

export type StateRowFixture = Readonly<
  Required<
    Pick<
      StateRowProps,
      | "label"
      | "description"
      | "composite"
      | "expanded"
      | "selected"
      | "filtered"
    >
  > &
    Pick<StateRowProps, "tone" | "marks" | "crossing">
>;

export function createStateRowFixture(
  overrides: Readonly<Partial<StateRowFixture>> = {},
): StateRowFixture {
  return {
    label: "Choose a method",
    description: "Nested journey",
    composite: true,
    expanded: false,
    selected: false,
    filtered: false,
    ...overrides,
  };
}

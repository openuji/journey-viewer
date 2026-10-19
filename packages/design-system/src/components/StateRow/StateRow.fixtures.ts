import type { StateRowProps } from "./StateRow.js";

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
      | "entryCount"
      | "exitCount"
    >
  >
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
    entryCount: 1,
    exitCount: 2,
    ...overrides,
  };
}

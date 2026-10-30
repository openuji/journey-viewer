import type { StateNodeProps } from "@/components/StateNode/StateNode";

export type StateNodeFixture = Readonly<
  Required<Pick<StateNodeProps, "label" | "lines" | "selected">> &
    Pick<StateNodeProps, "tone">
>;

export function createStateNodeFixture(
  overrides: Readonly<Partial<StateNodeFixture>> = {},
): StateNodeFixture {
  return {
    label: "Enter the email code",
    lines: ["Enter the email", "code"],
    selected: false,
    ...overrides,
  };
}

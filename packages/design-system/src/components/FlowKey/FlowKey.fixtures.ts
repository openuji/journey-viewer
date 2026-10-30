import type { FlowKeyProps } from "@/components/FlowKey/FlowKey";

export type FlowKeyFixture = Readonly<Required<FlowKeyProps>>;

export function createFlowKeyFixture(
  overrides: Readonly<Partial<FlowKeyFixture>> = {},
): FlowKeyFixture {
  return { label: "Key", ...overrides };
}

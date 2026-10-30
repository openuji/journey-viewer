import type { FlowFrameProps } from "@/components/FlowFrame/FlowFrame";

export type FlowFrameFixture = Readonly<
  Required<Pick<FlowFrameProps, "context">>
>;

export function createFlowFrameFixture(
  overrides: Readonly<Partial<FlowFrameFixture>> = {},
): FlowFrameFixture {
  return { context: "current", ...overrides };
}

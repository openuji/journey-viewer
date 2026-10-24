import type { TouchpointDotProps } from "@/components/TouchpointDot/TouchpointDot";

export type TouchpointDotFixture = Readonly<
  Required<Pick<TouchpointDotProps, "label" | "color">>
>;

export function createTouchpointDotFixture(
  overrides: Readonly<Partial<TouchpointDotFixture>> = {},
): TouchpointDotFixture {
  return {
    label: "Web application",
    color: "var(--jv-color-accent)",
    ...overrides,
  };
}

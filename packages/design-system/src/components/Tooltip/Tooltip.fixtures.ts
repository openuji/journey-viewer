import type { TooltipProps } from "@/components/Tooltip/Tooltip";

/** The trigger is not data: a story supplies it. */
export type TooltipFixture = Readonly<Pick<TooltipProps, "label">>;

export function createTooltipFixture(
  overrides: Readonly<Partial<TooltipFixture>> = {},
): TooltipFixture {
  return { label: "Fit", ...overrides };
}

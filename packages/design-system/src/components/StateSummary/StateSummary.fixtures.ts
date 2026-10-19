import type { StateSummaryProps } from "./StateSummary.js";

export type StateSummaryFixture = Readonly<
  Required<Pick<StateSummaryProps, "label" | "entryCount" | "directExitCount">>
>;

export function createStateSummaryFixture(
  overrides: Readonly<Partial<StateSummaryFixture>> = {},
): StateSummaryFixture {
  return {
    label: "Choose a method",
    entryCount: 1,
    directExitCount: 2,
    ...overrides,
  };
}

import type { JourneyNestProps } from "@/components/JourneyNest/JourneyNest";

export type JourneyNestFixture = Readonly<
  Required<Pick<JourneyNestProps, "color" | "matched">>
>;

export function createJourneyNestFixture(
  overrides: Readonly<Partial<JourneyNestFixture>> = {},
): JourneyNestFixture {
  return {
    color: "var(--jv-color-category-blue)",
    matched: false,
    ...overrides,
  };
}

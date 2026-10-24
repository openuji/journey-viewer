import type { BadgeProps } from "@/components/Badge/Badge";

export type BadgeFixture = Readonly<
  Omit<
    Required<Pick<BadgeProps, "children" | "tone" | "label">>,
    "children"
  > & { readonly children: string }
>;

export function createBadgeFixture(
  overrides: Readonly<Partial<BadgeFixture>> = {},
): BadgeFixture {
  return {
    children: "3 states",
    tone: "muted",
    label: "3 states",
    ...overrides,
  };
}

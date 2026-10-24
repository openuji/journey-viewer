import type { IconProps } from "@/components/Icon/Icon";

export type IconFixture = Readonly<Pick<IconProps, "name">>;
export const iconNames = Object.freeze([
  "chevron",
  "phone",
  "expand-all",
  "collapse-all",
  "reset",
  "previous",
  "next",
  "close",
] as const);

export function createIconFixture(
  overrides: Readonly<Partial<IconFixture>> = {},
): IconFixture {
  return { name: "chevron", ...overrides };
}

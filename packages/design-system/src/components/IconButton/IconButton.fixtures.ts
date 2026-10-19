import type { IconButtonProps } from "./IconButton.js";

export type IconButtonFixture = Readonly<
  Required<Pick<IconButtonProps, "label" | "variant" | "size" | "disabled">>
>;

export function createIconButtonFixture(
  overrides: Readonly<Partial<IconButtonFixture>> = {},
): IconButtonFixture {
  return {
    label: "Expand details",
    variant: "ghost",
    size: "sm",
    disabled: false,
    ...overrides,
  };
}

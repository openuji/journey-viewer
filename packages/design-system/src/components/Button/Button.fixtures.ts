import type { ButtonProps } from "./Button.js";

export type ButtonFixture = Readonly<
  Omit<
    Required<
      Pick<
        ButtonProps,
        "children" | "variant" | "size" | "disabled" | "selected"
      >
    >,
    "children"
  > & { readonly children: string }
>;

export function createButtonFixture(
  overrides: Readonly<Partial<ButtonFixture>> = {},
): ButtonFixture {
  return {
    children: "Continue",
    variant: "solid",
    size: "sm",
    disabled: false,
    selected: false,
    ...overrides,
  };
}

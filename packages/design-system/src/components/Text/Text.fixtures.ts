import type { TextProps } from "./Text.js";

export type TextFixture = Readonly<
  Omit<
    Required<Pick<TextProps, "children" | "as" | "variant" | "tone">>,
    "children"
  > & { readonly children: string }
>;

export function createTextFixture(
  overrides: Readonly<Partial<TextFixture>> = {},
): TextFixture {
  return {
    children: "A reusable text role",
    as: "span",
    variant: "body",
    tone: "default",
    ...overrides,
  };
}

import type { TextProps } from "@/components/Text/Text";

export type TextFixture = Readonly<
  Omit<
    Required<
      Pick<TextProps, "children" | "as" | "variant" | "tone" | "weight">
    >,
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
    weight: "regular",
    ...overrides,
  };
}

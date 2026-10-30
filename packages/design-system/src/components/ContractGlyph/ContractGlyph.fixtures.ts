import type { ContractGlyphProps } from "@/components/ContractGlyph/ContractGlyph";

export type ContractGlyphFixture = Readonly<
  Required<
    Pick<
      ContractGlyphProps,
      "kind" | "isDefault" | "lines" | "label" | "selected"
    >
  >
>;

export function createContractGlyphFixture(
  overrides: Readonly<Partial<ContractGlyphFixture>> = {},
): ContractGlyphFixture {
  return {
    kind: "entry",
    isDefault: true,
    lines: ["Sign in"],
    label: "Sign in",
    selected: false,
    ...overrides,
  };
}

import type { CompositeCardProps } from "@/components/CompositeCard/CompositeCard";

export type CompositeCardFixture = Readonly<
  Required<
    Pick<
      CompositeCardProps,
      "title" | "toggle" | "caption" | "heading" | "current" | "selected"
    >
  > &
    Pick<CompositeCardProps, "touchpoint" | "tone">
>;

export function createCompositeCardFixture(
  overrides: Readonly<Partial<CompositeCardFixture>> = {},
): CompositeCardFixture {
  return {
    title: ["Authenticate with identity", "provider"],
    toggle: "expand",
    caption: ["IdP auth flow"],
    heading: false,
    current: false,
    selected: false,
    touchpoint: {
      label: "Identity provider",
      color: "var(--jv-color-category-violet)",
    },
    ...overrides,
  };
}

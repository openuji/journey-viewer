import type {
  JourneyPathItem,
  JourneyPathProps,
} from "@/components/JourneyPath/JourneyPath";

export type JourneyPathFixture = Readonly<{
  items: readonly Omit<JourneyPathItem, "onSelect">[];
}> &
  Readonly<Pick<JourneyPathProps, "label">>;

export function createJourneyPathFixture(
  overrides: Readonly<Partial<JourneyPathFixture>> = {},
): JourneyPathFixture {
  return {
    items: [
      {
        id: "app",
        title: "App auth journey",
        touchpoint: {
          label: "Web application",
          color: "var(--jv-color-category-blue)",
        },
      },
      {
        id: "idp",
        title: "Authenticate with identity provider",
        touchpoint: {
          label: "Identity provider",
          color: "var(--jv-color-category-violet)",
        },
      },
    ],
    ...overrides,
  };
}

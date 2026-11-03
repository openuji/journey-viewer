import type {
  JourneyPathChoice,
  JourneyPathItem,
  JourneyPathProps,
} from "@/components/JourneyPath/JourneyPath";

/** Handlers are not data: a story supplies them. */
export type JourneyPathFixture = Readonly<{
  items: readonly (Omit<JourneyPathItem, "onSelect" | "choices"> &
    Readonly<{ choices?: readonly Omit<JourneyPathChoice, "onSelect">[] }>)[];
}> &
  Readonly<Pick<JourneyPathProps, "label" | "choiceLabel">>;

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

/** A root journey step that can be switched to the document's other root journeys. */
export function createJourneyPathRootsFixture(): JourneyPathFixture {
  const [root] = createJourneyPathFixture().items;
  return {
    items: [
      {
        ...root!,
        choices: [
          { id: "app", title: "App auth journey" },
          { id: "profile", title: "Edit the profile" },
          { id: "billing", title: "Manage billing" },
        ],
      },
    ],
  };
}

import type { InspectorPanelProps } from "./InspectorPanel.js";

export type InspectorPanelFixture = Readonly<Required<Omit<InspectorPanelProps, "children" | "media">>>;

export function createInspectorPanelFixture(
  overrides: Readonly<Partial<InspectorPanelFixture>> = {},
): InspectorPanelFixture {
  return {
    title: "Sign-in required", typeLabel: "State", identity: "urn:example:sign-in", crumb: "Account access",
    level: 2, touchpoints: [{ id: "urn:example:web", label: "Web touchpoint", color: "var(--jv-color-category-orange)" }],
    sections: [
      { title: "Incoming", direction: "incoming", count: 0, groups: [] },
      { title: "Outgoing", direction: "outgoing", count: 2, groups: [
        { id: "urn:example:identity", label: "Authenticate", exit: false, items: [
          { id: "urn:example:begin", label: "Begin sign-in", annotation: "enters at Login", tags: ["primary"] },
          { id: "urn:example:resume", label: "Resume session", tags: [] },
        ] },
      ] },
    ],
    footnote: "Account access · 1 entry · 2 exported exits",
    ...overrides,
  };
}

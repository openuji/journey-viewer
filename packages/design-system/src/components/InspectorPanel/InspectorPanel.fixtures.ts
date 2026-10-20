import type { InspectorPanelProps } from "./InspectorPanel.js";

export function createInspectorPanelFixture(
  overrides: Readonly<Partial<Required<Omit<InspectorPanelProps, "children" | "media">>>> = {},
): Readonly<Required<Omit<InspectorPanelProps, "children" | "media">>> {
  return {
    title: "Sign-in required", kind: "state", identity: "urn:example:sign-in", context: "Account access",
    level: 2, touchpoints: ["Web"],
    sections: [{ title: "Outgoing transitions", items: [{ id: "urn:example:begin", label: "Begin sign-in", details: ["To: Identity provider", "Entry boundary: Login"] }] }],
    ...overrides,
  };
}

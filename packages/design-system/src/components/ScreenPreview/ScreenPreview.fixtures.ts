import type { ScreenPreviewProps } from "./ScreenPreview.js";
export type ScreenPreviewFixture = Readonly<Pick<ScreenPreviewProps, "title" | "context" | "touchpoint" | "visible">>;
export function createScreenPreviewFixture(overrides: Readonly<Partial<ScreenPreviewFixture>> = {}): ScreenPreviewFixture {
  return { title: "Sign-in screen", context: "Account access · Web", touchpoint: { label: "Web", color: "var(--jv-color-category-orange)" }, visible: true, ...overrides };
}

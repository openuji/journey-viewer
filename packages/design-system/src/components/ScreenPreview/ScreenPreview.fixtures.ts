import type { ScreenPreviewProps } from "./ScreenPreview.js";
export type ScreenPreviewFixture = Readonly<Pick<ScreenPreviewProps, "title" | "identity" | "available">>;
export function createScreenPreviewFixture(overrides: Readonly<Partial<ScreenPreviewFixture>> = {}): ScreenPreviewFixture {
  return { title: "Sign-in screen", identity: "urn:example:sign-in-surface", available: true, ...overrides };
}

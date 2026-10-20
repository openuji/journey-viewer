import type { ScreenLightboxProps } from "./ScreenLightbox.js";
export type ScreenLightboxFixture = Readonly<Pick<ScreenLightboxProps, "title" | "identity" | "context" | "position" | "canStep">>;
export function createScreenLightboxFixture(overrides: Readonly<Partial<ScreenLightboxFixture>> = {}): ScreenLightboxFixture {
  return { title: "Sign-in screen", identity: "urn:example:sign-in-surface", context: "Account access", position: "1 / 3", canStep: true, ...overrides };
}

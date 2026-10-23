import type { ScreenLightboxProps } from "./ScreenLightbox.js";
export type ScreenLightboxFixture = Readonly<Pick<ScreenLightboxProps, "title" | "context" | "position" | "canStep" | "touchpoint">>;
export function createScreenLightboxFixture(overrides: Readonly<Partial<ScreenLightboxFixture>> = {}): ScreenLightboxFixture {
  return { title: "Sign-in screen", context: "Account access · Web", position: "1 / 3", canStep: true,
    touchpoint: { label: "Web", color: "var(--jv-color-category-orange)" }, ...overrides };
}

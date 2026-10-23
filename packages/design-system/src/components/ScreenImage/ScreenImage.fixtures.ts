import type { ScreenImageProps } from "./ScreenImage.js";
import { screenSource } from "../../dev/screen-source.ts";
export type ScreenImageFixture = Readonly<Pick<ScreenImageProps, "label" | "source" | "status" | "fit">>;
export function createScreenImageFixture(overrides: Readonly<Partial<ScreenImageFixture>> = {}): ScreenImageFixture {
  return { label: "Sign-in screen", source: screenSource, status: "ready", fit: "width", ...overrides };
}

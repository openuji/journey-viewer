import type { ScreenImageProps } from "@/components/ScreenImage/ScreenImage";
import { screenSource } from "@/dev/screen-source";
export type ScreenImageFixture = Readonly<
  Pick<ScreenImageProps, "label" | "source" | "status" | "fit">
>;
export function createScreenImageFixture(
  overrides: Readonly<Partial<ScreenImageFixture>> = {},
): ScreenImageFixture {
  return {
    label: "Sign-in screen",
    source: screenSource,
    status: "ready",
    fit: "width",
    ...overrides,
  };
}

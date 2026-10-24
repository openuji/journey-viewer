import type { ScreenThumbnailProps } from "@/components/ScreenThumbnail/ScreenThumbnail";
export type ScreenThumbnailFixture = Readonly<
  Required<Pick<ScreenThumbnailProps, "label" | "hint">>
>;
export function createScreenThumbnailFixture(
  overrides: Readonly<Partial<ScreenThumbnailFixture>> = {},
): ScreenThumbnailFixture {
  return { label: "Sign-in screen", hint: "Enlarge", ...overrides };
}

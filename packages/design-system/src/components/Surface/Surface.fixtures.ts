import type { SurfaceProps } from "@/components/Surface/Surface";

export type SurfaceFixture = Readonly<
  Required<Pick<SurfaceProps, "as" | "tone" | "radius" | "raised">>
>;

export function createSurfaceFixture(
  overrides: Readonly<Partial<SurfaceFixture>> = {},
): SurfaceFixture {
  return {
    as: "section",
    tone: "default",
    radius: "lg",
    raised: false,
    ...overrides,
  };
}

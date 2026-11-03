import type { CanvasHeaderProps } from "@/components/CanvasHeader/CanvasHeader";

/** The path and the commands are components: a story supplies them. */
export type CanvasHeaderFixture = Readonly<
  Required<Pick<CanvasHeaderProps, "commandsLabel">>
>;

export function createCanvasHeaderFixture(
  overrides: Readonly<Partial<CanvasHeaderFixture>> = {},
): CanvasHeaderFixture {
  return { commandsLabel: "Canvas commands", ...overrides };
}

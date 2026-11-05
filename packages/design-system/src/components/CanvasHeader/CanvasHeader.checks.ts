import { text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkCanvasHeaderFixture: FixtureCheck = (value) => [
  ...text(value, "commandsLabel"),
];

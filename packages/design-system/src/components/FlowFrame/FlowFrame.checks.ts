import { choice } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkFlowFrameFixture: FixtureCheck = (value) => [
  ...choice(value, "context", ["current", "outside"]),
];

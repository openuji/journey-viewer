import { boolean, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkJourneyNestFixture: FixtureCheck = (value) => [
  ...text(value, "color"),
  ...boolean(value, "matched"),
];

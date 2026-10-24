import { text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";
export const checkExplorerBarFixture: FixtureCheck = (value) => [
  ...text(value, "title"),
  ...text(value, "subtitle"),
];

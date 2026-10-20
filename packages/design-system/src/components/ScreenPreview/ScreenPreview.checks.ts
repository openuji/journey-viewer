import { boolean, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";
export const checkScreenPreviewFixture: FixtureCheck = (value) => [
  ...text(value, "title"), ...text(value, "identity"), ...boolean(value, "available"),
];

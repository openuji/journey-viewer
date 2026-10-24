import { text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";
export const checkScreenThumbnailFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
  ...text(value, "hint"),
];

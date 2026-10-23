import { text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";
export const checkScreenThumbnailFixture: FixtureCheck = (value) => [...text(value, "label"), ...text(value, "hint")];

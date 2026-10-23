import { text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";
export const checkExplorerBarFixture: FixtureCheck = (value) => [...text(value, "title"), ...text(value, "subtitle")];

import { boolean, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";

export const checkJourneyNestFixture: FixtureCheck = (value) => [...text(value, "color"), ...boolean(value, "matched")];

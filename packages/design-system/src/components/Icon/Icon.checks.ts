import { choice } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";
import { iconNames } from "./Icon.fixtures.ts";

export const checkIconFixture: FixtureCheck = (value) => [...choice(value, "name", iconNames)];

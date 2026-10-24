import { choice } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";
import { iconNames } from "@/components/Icon/Icon.fixtures";

export const checkIconFixture: FixtureCheck = (value) => [
  ...choice(value, "name", iconNames),
];

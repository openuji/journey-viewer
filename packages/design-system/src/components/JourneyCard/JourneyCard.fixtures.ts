import type { JourneyCardProps } from "./JourneyCard.js";
import { createTouchpointDotFixture } from "../TouchpointDot/TouchpointDot.fixtures.ts";

export type JourneyCardFixture = Readonly<
  Required<Pick<JourneyCardProps, "title" | "count" | "level" | "touchpoint">>
>;

export function createJourneyCardFixture(
  overrides: Readonly<Partial<JourneyCardFixture>> = {},
): JourneyCardFixture {
  return {
    title: "Account access",
    count: "4 states",
    level: 2,
    touchpoint: createTouchpointDotFixture(),
    ...overrides,
  };
}

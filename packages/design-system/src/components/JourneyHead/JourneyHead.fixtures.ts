import type { JourneyHeadProps } from "./JourneyHead.js";
import { createTouchpointDotFixture } from "../TouchpointDot/TouchpointDot.fixtures.ts";

export type JourneyHeadFixture = Readonly<
  Required<Pick<JourneyHeadProps, "title" | "count" | "level" | "touchpoint">>
>;

export function createJourneyHeadFixture(
  overrides: Readonly<Partial<JourneyHeadFixture>> = {},
): JourneyHeadFixture {
  return {
    title: "Account access",
    count: "4 states",
    level: 2,
    touchpoint: createTouchpointDotFixture(),
    ...overrides,
  };
}

import type { JourneyHeadProps } from "@/components/JourneyHead/JourneyHead";
import { createTouchpointDotFixture } from "@/components/TouchpointDot/TouchpointDot.fixtures";

export type JourneyHeadFixture = Readonly<
  Required<
    Pick<
      JourneyHeadProps,
      "title" | "count" | "level" | "touchpoint" | "filtered" | "matched"
    >
  > &
    Pick<JourneyHeadProps, "touchpoints" | "crumb">
>;

export function createJourneyHeadFixture(
  overrides: Readonly<Partial<JourneyHeadFixture>> = {},
): JourneyHeadFixture {
  return {
    title: "Account access",
    count: "4 states",
    level: 2,
    filtered: false,
    matched: false,
    touchpoints: [],
    touchpoint: createTouchpointDotFixture(),
    ...overrides,
  };
}

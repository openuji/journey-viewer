import type { JourneyCardProps } from "@/components/JourneyCard/JourneyCard";
import { createTouchpointDotFixture } from "@/components/TouchpointDot/TouchpointDot.fixtures";

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

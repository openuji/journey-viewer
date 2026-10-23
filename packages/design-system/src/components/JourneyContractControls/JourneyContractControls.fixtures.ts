import type { JourneyContractControlsProps } from "./JourneyContractControls.js";
import { createJourneyContractsFixture } from "../JourneyContracts/JourneyContracts.fixtures.ts";

export type JourneyContractControlsFixture = Readonly<Omit<JourneyContractControlsProps, "onSelect" | "onToggle">>;

export function createJourneyContractControlsFixture(
  overrides: Readonly<Partial<JourneyContractControlsFixture>> = {},
): JourneyContractControlsFixture {
  return { ...createJourneyContractsFixture(), selection: null, filtered: false, open: true, ...overrides };
}

import type { JourneyContractControlsProps } from "@/components/JourneyContractControls/JourneyContractControls";
import { createJourneyContractsFixture } from "@/components/JourneyContracts/JourneyContracts.fixtures";

export type JourneyContractControlsFixture = Readonly<
  Omit<JourneyContractControlsProps, "onSelect" | "onToggle">
>;

export function createJourneyContractControlsFixture(
  overrides: Readonly<Partial<JourneyContractControlsFixture>> = {},
): JourneyContractControlsFixture {
  return {
    ...createJourneyContractsFixture(),
    selection: null,
    filtered: false,
    open: true,
    ...overrides,
  };
}

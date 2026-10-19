import type { JourneyContractsProps } from "./JourneyContracts.js";

export function createJourneyContractsFixture(
  overrides: Readonly<Partial<JourneyContractsProps>> = {},
): JourneyContractsProps {
  return {
    entries: [{ id: "entry:start", label: "Begin account access", default: true }],
    exits: [{ id: "exit:success", label: "Access granted" }, { id: "exit:cancel", label: "Cancelled" }],
    ...overrides,
  };
}

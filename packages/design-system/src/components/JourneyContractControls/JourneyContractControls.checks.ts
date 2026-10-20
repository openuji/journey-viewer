import { boolean, object } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";
import { checkJourneyContractsFixture } from "../JourneyContracts/JourneyContracts.checks.ts";

export const checkJourneyContractControlsFixture: FixtureCheck = (value) => {
  const selection = object(value) ? value.selection : undefined;
  const valid = selection === null || (object(value) && object(selection)
    && (selection.kind === "entry" || selection.kind === "exit")
    && typeof selection.id === "string"
    && Array.isArray(value[selection.kind === "entry" ? "entries" : "exits"])
    && (value[selection.kind === "entry" ? "entries" : "exits"] as readonly unknown[])
      .some((item) => object(item) && item.id === selection.id));
  return [
    ...checkJourneyContractsFixture(value),
    ...(object(value) && value.filtered !== undefined ? boolean(value, "filtered") : []),
    ...(valid ? [] : [{ path: ["selection"], message: "Expected null or a selection naming a listed contract of the same kind." }]),
  ];
};

import type {
  ButtonProps,
  BadgeProps,
  HeadingProps,
  JourneyHeadProps,
  StateRowProps,
  StateSummaryProps,
  JourneyContractsProps,
  JourneyContractControlsProps,
  InspectorPanelProps,
} from "../src/index.js";
import { createStateRowFixture } from "../src/components/StateRow/StateRow.fixtures.ts";
import type { SearchFieldProps } from "../src/index.js";
import type { ScreenImageProps, ScreenLightboxProps } from "../src/index.js";

const button: ButtonProps = { children: "Select", selected: false };
// @ts-expect-error Component props are immutable snapshots.
button.selected = true;
const heading: HeadingProps = { level: 2, size: "sm" };
// @ts-expect-error Heading semantic level is explicit and readonly.
heading.level = 3;
const head: JourneyHeadProps = {
  title: "Account",
  touchpoint: { label: "Web" },
};
// @ts-expect-error Nested presentation values are readonly.
head.touchpoint!.label = "Mobile";
const row: StateRowProps = { label: "Start", expanded: false };
// @ts-expect-error Rendering does not own expansion state.
row.expanded = true;
const fixture = createStateRowFixture();
// @ts-expect-error Fixture generation returns immutable data.
fixture.label = "Changed";

const badge: BadgeProps = {
  children: "3",
  id: "count",
  "aria-describedby": "help",
};
// @ts-expect-error Forwarded native attributes remain readonly.
badge.id = "changed";

const contracts: JourneyContractsProps = { entries: [{ id: "e", label: "Begin" }], exits: [] };
// @ts-expect-error Contract lists are readonly.
contracts.entries.push({ id: "next", label: "Next" });
// @ts-expect-error Contract item data is readonly.
contracts.entries[0]!.label = "Changed";

const summary: StateSummaryProps = { label: "Start", entryCount: 1, directExitCount: 2 };
// @ts-expect-error Summary presentation data is readonly.
summary.label = "Changed";
// @ts-expect-error Selection belongs to StateRow, not StateSummary.
const selectedSummary: StateSummaryProps = { label: "Start", selected: true };
// @ts-expect-error Summary has no interaction callbacks.
const callbackSummary: StateSummaryProps = { label: "Start", onSelect: () => {} };
// @ts-expect-error Nested content requires no expansion flag.
const expandedSummary: StateSummaryProps = { label: "Start", expanded: true };
// @ts-expect-error Summary has no filtering flag.
const filteredSummary: StateSummaryProps = { label: "Start", filtered: true };
// @ts-expect-error Mode flags are not part of either component's contract.
const staticRow: StateRowProps = { label: "Start", static: true };
void [selectedSummary, callbackSummary, expandedSummary, filteredSummary, staticRow];

declare const panel: InspectorPanelProps;
// @ts-expect-error Inspector presentation collections are readonly.
panel.sections.push({ title: "Other", items: [] });
// @ts-expect-error Nested inspector details are readonly.
panel.sections[0]!.items[0]!.details.push("Changed");
// @ts-expect-error Contract controls require their explicit selection callback.
const uncontrolledContracts: JourneyContractControlsProps = { entries: [], exits: [], selection: null };
void uncontrolledContracts;
declare const search: SearchFieldProps;
// @ts-expect-error Search presentation is controlled and readonly.
search.value = "other";
// @ts-expect-error Search keyboard callbacks must be supplied explicitly.
const uncontrolledSearch: SearchFieldProps = { label: "Search", value: "" };
void uncontrolledSearch;
declare const image: ScreenImageProps;
// @ts-expect-error Loading state is supplied by the browser caller.
image.status = "unavailable";
// @ts-expect-error Native image events must have explicit callbacks.
const missingImageCallbacks: ScreenImageProps = { source: "image.png", label: "Example", status: "loading" };
void missingImageCallbacks;
declare const lightbox: ScreenLightboxProps;
// @ts-expect-error Lightbox presentation does not own modal state.
lightbox.position = "2 / 3";

import type { JourneyHierarchyProps, JourneyExplorerProps, ViewerInteraction, ViewerSelection } from "../dist/index.js";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import type { JourneyNavigationProps, JourneyInspectorProps, ViewerSnapshot, ViewerOccurrence } from "../dist/index.js";
import type { ScreenshotMap, TouchpointPresentation, JourneyScreenControls } from "../dist/index.js";
import type { ViewerExtensions, ViewerStateRenderProps, ViewerInspectorPanelProps } from "../dist/index.js";

declare const document: UjgDocument;
const props: JourneyHierarchyProps = { document, level: 2 };
// @ts-expect-error The input snapshot is readonly.
props.document = document;
// @ts-expect-error Heading presentation is readonly.
props.level = 3;
// @ts-expect-error Canonical source data remains readonly through the public contract.
props.document.nodes?.push({ "@id": "urn:other" });

const selection: ViewerSelection = { kind: "state", journeyRef: "urn:j", nodeRef: "urn:s" };
// @ts-expect-error Selection is an immutable identity snapshot.
selection.nodeRef = "urn:other";
const interaction: ViewerInteraction = { selection, expandedJourneys: ["urn:j"] };
// @ts-expect-error No mutable expansion sets or arrays are exposed.
interaction.expandedJourneys.push("urn:other");
// @ts-expect-error Interaction snapshots cannot be patched in place.
interaction.selection = null;
// @ts-expect-error Controlled interaction requires explicit callbacks.
const missingCallbacks: JourneyExplorerProps = { document, interaction };
// @ts-expect-error The static contract has no interactive mode.
const interactiveStatic: JourneyHierarchyProps = { document, interaction };
void [missingCallbacks, interactiveStatic];
declare const snapshot: ViewerSnapshot;
declare const occurrence: ViewerOccurrence;
// @ts-expect-error Navigation snapshots are immutable.
snapshot.navigation.query = "query";
// @ts-expect-error Touchpoint identities cannot be patched in place.
snapshot.navigation.touchpointRefs.push("urn:tp");
// @ts-expect-error Occurrence paths are readonly.
occurrence.steps.push({ stateIndex: 0, childIndex: 0 });
// @ts-expect-error Occurrence segments cannot be patched in place.
occurrence.steps[0]!.childIndex = 2;
declare const navigationProps: JourneyNavigationProps;
// @ts-expect-error Search picking is an explicit required action, separate from ordinary navigation.
const missingSearchPick: JourneyNavigationProps = { ...navigationProps, onSearchPick: undefined };
void missingSearchPick;
declare const screenshots: ScreenshotMap;
// @ts-expect-error Screenshot documents are immutable caller inputs.
screenshots["urn:surface"] = "./updated.png";
declare const touchpoints: TouchpointPresentation;
// @ts-expect-error Presentation overrides remain readonly.
touchpoints["urn:touchpoint"]!.color = "red";
// @ts-expect-error Screenshot rendering controls require an explicit open callback.
const missingOpen: JourneyScreenControls = { screenshots };
void missingOpen;
// @ts-expect-error Inspector media supplies its preview target and controls together.
const missingMediaTarget: JourneyInspectorProps = { document, selection, media: { screenshots, onOpen: () => {} } };
void missingMediaTarget;
if (snapshot.lightbox) {
  // @ts-expect-error An open screen is an immutable identity, never a cached URL.
  snapshot.lightbox.surfaceRef = "other";
  // @ts-expect-error Resolved paths do not belong in interaction state.
  snapshot.lightbox.source = "./cached.png";
}
declare const extensions: ViewerExtensions;
// @ts-expect-error Descriptor arrays are readonly.
extensions.annotations?.push({});
// @ts-expect-error Descriptor fields are readonly.
extensions.inspectorPanels![0]!.title = "Changed";
// @ts-expect-error Configuration is a readonly input.
extensions.stateOverrides = [];
// @ts-expect-error No runtime registration contract exists.
extensions.register({});
declare const stateRender: ViewerStateRenderProps;
// @ts-expect-error Rendering props remain owned by the design system and readonly.
stateRender.row.onSelect = () => {};
// @ts-expect-error Original canonical state nodes stay readonly.
stateRender.context.node.label = "Changed";
// @ts-expect-error Call-site context cannot be patched in place.
stateRender.context.occurrence.steps.push({ stateIndex: 0, childIndex: 0 });
declare const panelProps: ViewerInspectorPanelProps;
// @ts-expect-error Source extension payloads remain deeply readonly JSON.
panelProps.node.extensions!["urn:custom"]!["note"] = "Changed";
// @ts-expect-error Static hierarchy keeps its separate, unextended contract.
const extendedStatic: JourneyHierarchyProps = { document, extensions };
void extendedStatic;

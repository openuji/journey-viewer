import type { JourneyHierarchyProps, JourneyExplorerProps, ViewerInteraction, ViewerSelection } from "../dist/index.js";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";

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

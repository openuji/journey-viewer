import type { JourneyHierarchyProps } from "../dist/index.js";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";

declare const document: UjgDocument;
const props: JourneyHierarchyProps = { document, level: 2 };
// @ts-expect-error The input snapshot is readonly.
props.document = document;
// @ts-expect-error Heading presentation is readonly.
props.level = 3;
// @ts-expect-error Canonical source data remains readonly through the public contract.
props.document.nodes?.push({ "@id": "urn:other" });

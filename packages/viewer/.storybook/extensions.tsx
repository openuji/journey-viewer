import { Badge, StateRow, Text } from "@journey-viewer/design-system";
import type {
  ViewerExtensions,
  ViewerInspectorPanelProps,
  ViewerNodeContext,
  ViewerStateContext,
  ViewerStateRenderProps,
} from "@/extensions";

function SourceNote({ node, selection }: ViewerInspectorPanelProps) {
  return (
    <Text as="p">
      This {selection.kind} is read directly from{" "}
      <Text as="code" variant="code">
        {node["@id"]}
      </Text>
      .
    </Text>
  );
}

function BoundaryRow({ row }: ViewerStateRenderProps) {
  return <StateRow {...row} description="Custom boundary presentation" />;
}

/** Explicit development composition; no registration or runtime discovery. */
export const exampleExtensions: ViewerExtensions = Object.freeze({
  inspectorPanels: Object.freeze([
    Object.freeze({
      id: "source-note",
      title: "Source note",
      matches: () => true,
      Component: SourceNote,
    }),
  ]),
  annotations: Object.freeze([
    Object.freeze({
      id: "boundary-review",
      matches: ({ selection }: ViewerNodeContext) =>
        selection.nodeRef === "urn:test:compose",
      Component: () => <Badge>Review nested boundary</Badge>,
    }),
  ]),
  stateOverrides: Object.freeze([
    Object.freeze({
      id: "boundary-row",
      matches: ({ node }: ViewerStateContext) =>
        node["@id"] === "urn:test:compose",
      Component: BoundaryRow,
    }),
  ]),
});

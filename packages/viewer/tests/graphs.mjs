import { projectJourneyGraph } from "@journey-viewer/ujg-jsonld";

/** Deep freeze that stops at what it already froze: graphs of recursive journeys have cycles. */
export const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
};

/** The UJG Editor's Draft context, for documents written inline in tests. */
export const edContext =
  "https://ujg.specs.openuji.org/ed/ns/core.context.jsonld";

const graphs = new WeakMap();

/**
 * The document's graph, projected once per document object and frozen, the way an application
 * holds it: the same document always gives the same graph, a new document a new one.
 */
export function graphOf(document) {
  if (!graphs.has(document))
    graphs.set(document, freeze(projectJourneyGraph(document)));
  return graphs.get(document);
}

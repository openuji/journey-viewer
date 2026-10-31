# @journey-viewer/ujg-jsonld

Reads User Journey Graph JSON-LD. It owns everything about the source format: which
UJG version a document is, that version's readonly types and queries, its Graph
semantics, and the projection to a `JourneyGraph`, the version-independent graph the
viewer renders. There are no runtime dependencies, stores, parser wrappers or
validators. A new UJG version adds an adapter here; nothing that renders the graph
changes unless the version brings a concept the graph cannot express yet.

Build with `pnpm --filter @journey-viewer/ujg-jsonld build`. Public imports use built
ESM and declaration files.

```ts
import { detectUjgVersion, projectJourneyGraph } from "@journey-viewer/ujg-jsonld";

// Native syntax parsing; checking the shape is the caller's policy.
const value: unknown = JSON.parse(source);
if (detectUjgVersion(value).kind === "supported") {
  // Once per document: every new graph object resets a viewer.
  const graph = projectJourneyGraph(value);
}
```

## The graph (`@journey-viewer/ujg-jsonld`)

| Export | Does |
| --- | --- |
| `detectUjgVersion(value)` | Reads the version from the UJG contexts (`https://ujg.specs.openuji.org/<version>/ns/<module>.context.jsonld`); all must name one supported version. Other contexts are ignored. |
| `projectJourneyGraph(value)` | Derives the graph through the version's adapter; throws a `TypeError` for an unsupported version. The document must have that version's shape. |
| `entryInto(transition, child)` | Where a transition into a composite starts a child journey: its selected entry, else the child's default entry. |
| `exitFrom(transition, child)` | The child exit a transition out of a composite continues after. |
| `journeyTouchpoints(graph, journeyId)` | Touchpoints naming the journey; nothing is inherited. |
| `nodeSurfaces(graph, nodeId)` | Surfaces showing the node. |

`JourneyGraph` holds every journey, state (`kind: "state" | "composite"`), entry,
exit, transition, touchpoint and surface in document order, plus the `roots` and
`rootless` journeys. Names are plain: `id`, `kind`, `label` and links named by
meaning (`states`, `children`, `target`, `from`, `to`, `toEntry`, `fromExit`). There
are no JSON-LD keywords or UJG wire names. Ids are the document's identifiers, copied
and never parsed. Labels fall back to the id; lists are always present. Containment
lists hold the nodes themselves in the document's reference order, keeping repeats
and leaving out unresolved or differently typed references; reused and recursive
journeys are the same objects, so the graph may contain cycles. Associations hold ids.
The graph is readonly at the TypeScript boundary and nothing edits it.

Supported versions: the Editor's Draft (`ed`).

## Raw ED reading (`@journey-viewer/ujg-jsonld/ed`)

Readonly types and pure queries over canonical compact UJG Editor's Draft JSON-LD,
the ED adapter's input. Use them only for work that needs the source format itself.

```ts
import { getJourneyEntries, getNodesByType } from "@journey-viewer/ujg-jsonld/ed";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld/ed";

const document: UjgDocument = JSON.parse(source);
const journeys = getNodesByType(document, "Journey");
const entries = journeys.flatMap((journey) => getJourneyEntries(document, journey));
```

The caller supplies data in the supported shape. Queries select existing nodes;
their TypeScript return types are not proof that raw JSON satisfies those shapes.
Checking and deciding whether data is suitable for rendering are separate caller
responsibilities. This package does not perform either operation.

### Queries

| Function | Reads |
| --- | --- |
| `getNode(document, ref)` | Exact full-IRI identity; original node or `undefined` |
| `getNodesByType(document, type)` | Explicit `@type` tags, including string arrays and unknown types |
| `getJourneysContaining(document, ref)` | Journeys listing the node in `entryRefs`, `stateRefs`, `transitionRefs`, `exitRefs`, or `outgoingTransitionGroupRefs` |
| `getJourneyEntries(document, owner)` | `entryRefs` from a journey or entry index |
| `getJourneyStates(document, journey)` | `stateRefs`, selecting states and composites |
| `getJourneyTransitions(document, journey)` | `transitionRefs` |
| `getJourneyExits(document, journey)` | `exitRefs` |
| `getChildJourneys(document, composite)` | One-hop `subjourneyRefs`, including multiple/reused/recursive references |
| `getJourneyTouchpoints(document, journeyRef)` | Touchpoints explicitly listing the journey in `journeyRefs` |
| `getNodeSurfaces(document, nodeRef)` | Surfaces explicitly naming the node in `graphNodeRef` |

Global selections preserve node-array order; reference lookups preserve the
owner's reference-list order and repetitions. These orders are not traversal
semantics. Type selection matches declared tags only, without subclass inference.

Reference queries select existing targets of the requested type. Missing or
differently typed targets are omitted from results; the original reference lists
are untouched. Use the source refs and `getNode` to examine unresolved targets.
No findings are produced. Required owner fields are assumed to have the declared
shape; these queries do not make arbitrary malformed input safe.

All returned nodes are the original objects. No fields are added, IDs rewritten,
defaults chosen, ancestor ownership inferred, or touchpoints inherited. Query
arrays and nested data are readonly at the TypeScript boundary; the package never
freezes or mutates caller data. Consumers must honor that readonly contract.

### Representation

Types cover Core, Graph, and Surface terms from the current Editor's Draft:
[Core](https://ujg.specs.openuji.org/ed/core),
[Graph](https://ujg.specs.openuji.org/ed/graph), and
[Surface](https://ujg.specs.openuji.org/ed/surface).
Contexts are URL strings or arrays of URL strings. Plain Core-only documents may
omit `nodes`, and untyped addressable nodes can still be looked up by identity.
Unknown module properties and opaque extension payloads remain readonly JSON on
the original objects. No contexts, imports, or external resources are fetched;
aliases, prefixes, and JSON-LD expansion are not processed.

## Checks

`pnpm --filter @journey-viewer/ujg-jsonld test` builds the package, checks readonly
declarations of the raw types and the graph, and runs Node tests through both public
ESM exports. Tests use frozen minimal/OIDC data and protect identity, explicit
membership, reference order, multiple children, recursive references, unknown data
and baseline counts; version detection (supported, dated, mixed, missing, inline
contexts); and the projection: plain names with no JSON-LD keys, shared nodes for
reuse and recursion, roots and rootless journeys, and the entry and exit rule.

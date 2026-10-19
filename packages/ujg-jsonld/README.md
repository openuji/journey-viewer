# @journey-viewer/ujg-jsonld

Readonly types and pure queries over canonical compact UJG JSON-LD. There are no
runtime dependencies, stores, parser wrappers, validators, or document conversions.

Build with `pnpm --filter @journey-viewer/ujg-jsonld build`. Public imports use built
ESM and declaration files.

```ts
import { getJourneyEntries, getNodesByType } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";

// Native syntax parsing. The annotation does not validate the parsed data.
const document: UjgDocument = JSON.parse(source);
const journeys = getNodesByType(document, "Journey");
const entries = journeys.flatMap((journey) => getJourneyEntries(document, journey));
```

The caller supplies data in the supported shape. Queries select existing nodes;
their TypeScript return types are not proof that raw JSON satisfies those shapes.
Checking and deciding whether data is suitable for rendering are separate caller
responsibilities. This package does not perform either operation.

## Queries

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

## Representation

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
declarations, and runs Node tests through its public ESM export. Tests use frozen
minimal/OIDC data and protect identity, explicit membership, reference order,
multiple children, recursive references, unknown data, and baseline counts.

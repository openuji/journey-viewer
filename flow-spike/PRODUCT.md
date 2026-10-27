# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: product and UX stakeholders** who need to follow a user journey visually: where it
  starts, where it branches, where it loops back and where it ends, and what each step looks like.
  They do not know UJG vocabulary and should not need to.
- **Secondary: UJG specification readers and authors.** The same flow is embedded in the UJG
  specification context, where it must expose the complete canonical detail.

## Product Purpose

The Flow view is an alternative presentation of a User Journey Graph (UJG) document, beside the
existing Tree and Columns views of Journey Viewer. It shows a journey as a flow chart: states,
transitions, nested child journeys, and their entry and exit contracts.

Success means a reader sees the shape of a journey at a glance, and the amount of exposed detail
fits the audience:

- **Stakeholder detail:** the basic flow, access to each step's screenshot, and minimal metadata.
- **Spec detail:** the maximum. Every canonical transition, boundary mapping and identifier is
  reachable.

## Positioning

The flow is a projection of canonical UJG, never a separately drawn diagram. Topology is never
invented or silently dropped. The flow, Tree and Columns share one interaction state, so moving
between them keeps the selection and what is expanded.

## Operating Context

- An isolated Storybook spike (`flow-spike/`) that evaluates the approach before any production
  integration. It consumes the built public exports of `@journey-viewer/ujg-jsonld`,
  `@journey-viewer/design-system` and `@journey-viewer/viewer`.
- Data: the canonical Solid-OIDC sample in `examples/solid-oidc/`, unchanged.
- Reference that prompted the work: the Flow view of ebremer/lws-ujg (`web/flow.js`). Its type
  sizes, line weight and arrowheads are liked. Its parallel edges, cross-hierarchy line artifacts,
  disorienting composite disclosure and box-like entries/exits are the problems to solve.

## Capabilities and Constraints

- Expand and collapse work exactly like the tree: anything can be opened or closed, in any
  combination, with no budget or accordion.
- Detail level is explicit, readonly configuration supplied by the caller, not a hidden mode.
- UJG ED Graph semantics bound the presentation. An arrival into a composite without `toEntryRef`
  uses the child's `defaultEntryRef` when one exists and is otherwise unresolved. Entries are never
  inferred from order. Sibling child journeys have no order or edges between them.
  `OutgoingTransition` is a navigation affordance, not local topology.
- Undecided: production integration, public API shape and mobile diagram usability.

## Evidence on Hand

- Solid-OIDC sample: 10 journeys, 47 states (9 composites), 120 transitions, 20 entries, 24 exits,
  37 concept screens (`examples/solid-oidc/screens/`, mapped by `screenshots.json`), touchpoint
  colours and short labels in `touchpoints.json`.
- Viewer test fixtures covering reuse, recursion, multi-child composites and empty composites.
- No user research, usage data or comprehension measurements exist. None may be claimed.

## Product Principles

1. Canonical UJG is the truth. The flow never invents topology and never hides it to look tidy.
2. Reduce noise through presentation (one connector per pair of blocks, clean routing, distinct
   contract glyphs), never by dropping data.
3. Detail is a dial, not a fork. Stakeholder and spec readers see the same flow at different
   depths.
4. Disclosure is never restricted. Orientation is preserved instead: the same container stays
   recognizable and can always be collapsed back.

## Accessibility & Inclusion

WCAG 2.2 AA: AA contrast in light and dark themes, keyboard operation with visible focus, named
controls and glyphs, and a reduced-motion alternative for every animated transition.

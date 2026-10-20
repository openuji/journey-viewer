# Journey Viewer renderer

`@journey-viewer/viewer` renders static and interactive hierarchies from a readonly
canonical compact UJG document. React is a peer. The renderer uses the UJG query
package and design-system components; parsing, linting, file access, themes, and
browser effects belong to callers.

```tsx
import { JourneyHierarchy } from "@journey-viewer/viewer";
import "@journey-viewer/design-system/styles.css";
import "@journey-viewer/viewer/styles.css";

<main data-jv-theme="light">
  <JourneyHierarchy document={document} level={2} />
</main>
```

`JourneyHierarchy` retains its static contract: only `document` and optional
heading `level`. Its heading level defaults to 2; nesting increases it up to 6. No Tailwind processing
or global reset is required. The design system exports an optional `reset.css`
for hosts that need it.

Journeys with no incoming child reference from a journey's explicit state members
appear as roots, in document order. Every `stateRefs` and `subjourneyRefs`
occurrence is rendered in its original order, including all children and repeated
references at separate call sites. An unowned composite does not establish a
parent. Entry indexes remain catalogues rather than implicit journey membership
or root declarations.

The current ancestry bounds recursion: a journey already on that path appears
as a labeled recursive reference. Reuse on another path still renders normally.
Journeys unreachable from any root appear in a labeled “Journeys without a root”
group, with each journey shown as its own starting point. This also exposes
disconnected cycles without choosing an arbitrary root or assigning parents.

Each journey displays its explicit entries/exits and `defaultEntryRef`. Unlabeled
journeys and contracts use their full source IRI. State entry marks count the
containing journey's entries that name the state; exit marks count that journey's
listed exits reached by an explicit local transition from the state. No routes
or transitive boundary associations are inferred. All explicitly assigned
touchpoint labels are shown together, without inheritance or a chosen primary.
The hierarchy explains the meaning of state marks in a visible caption;
individual marks also carry precise accessible explanations and tooltips.
Journey wrappers are plain containers around their headings, without adding a
region landmark for every nested journey.

Unresolved and differently typed references follow the query package's omission
behavior. Empty documents, journeys, composites, and contract lists have explicit
empty messages. Rendering does not validate or produce findings.

Production code holds no hierarchy model, parent map, shared interaction store,
DOM refs, or effects. Each render recomputes selections of original source nodes and uses
readonly reference arrays solely to select roots and detect unreachable journeys.
Reachability passes new values through pure reductions, without mutating a set
or work queue. `StateSummary` renders labels, counts and nested content directly;
it has no interaction or mode props.

## Selection and inspection

```tsx
import { JourneyViewer } from "@journey-viewer/viewer";
import "@journey-viewer/design-system/styles.css";
import "@journey-viewer/viewer/styles.css";

<main data-jv-theme="light">
  <JourneyViewer document={document} />
</main>
```

`JourneyViewer` owns a local immutable interaction snapshot and composes the
controlled `JourneyExplorer` with `JourneyInspector`. Each instance is independent,
even when instances receive the same frozen document. The state boundary retains
the original document reference only to detect replacement. A new document object,
including one with the same `@id` and node objects, resets selection and expansion
before children render. No effect, ref, mutable store or identity registry is used.
Keep `document` referentially stable between actual replacements. Parsing or
rebuilding it inline, such as `<JourneyViewer document={JSON.parse(source)} />`,
resets selection and expansion on every parent render. Parse once when loading
an input and retain that result in application state, or memoize parsing by the
source input. Stage 10's local-file loader must keep the parsed object until the
next file load.

Initial selection uses the first root (or first rootless starting point), its
explicit default entry's member state, then its first member state, then the
journey itself when empty. An empty document has no selection. All journeys start
expanded. Reset restores this policy; expand/collapse preserves selection. A
collapse may hide the selected row: the inspector continues to show that item,
and no automatic reveal or selection clearing occurs. Selecting a descendant
again reveals its ancestors.

For externally owned state, `JourneyExplorer` takes `document`, `interaction`,
`onSelect`, `onToggleChildren` and optional heading `level`. `JourneyInspector`
takes `document`, `selection` and optional `level`. The controlled components hold
no state; their caller owns document replacement and snapshot reset.

The public pure functions are `createViewerInteraction(document)`,
`selectNode(document, current, selection)`,
`toggleChildJourneys(document, current, journeyRef, stateRef)`,
`expandAllJourneys(document, current)` and `collapseAllJourneys(current)`.
`ViewerInteraction` holds only a readonly selection and expanded-journey ID array.
A selection is `{ kind, journeyRef, nodeRef }`, where kind is `journey`, `state`,
`entry` or `exit`. Wrong owner/type and unresolved selections are no-ops. Useful
selection/expansion no-ops retain snapshot identity, and frozen inputs are supported.

Expansion follows journey identity across repeated call sites within one viewer;
collapsing a reused journey affects all its occurrences. A selected item is
highlighted at every occurrence of its journey/state/contract identity. There is
no per-call-site expansion or selected path. Stage 7 must explicitly resolve
occurrence context for focus and breadcrumbs rather than choose an arbitrary
parent.

A composite disclosure toggles its complete explicit child group. Selecting a
composite opens all children; selection reveals all explicit ancestor paths without
assigning a single parent. Programmatic descendant selection reveals each open
child independently of collapsed siblings; the group's disclosure collapses it
when any child is open and opens every child when all are closed. Recursion
remains bounded by the current rendered path.

Composites with no resolvable child journeys keep an indented “No child journeys.”
notice inside their selectable row container, including after collapse-all. They
have no disclosure control because there is no child journey to open.

Inspection derives local incoming/outgoing transitions, entry start states,
explicit entry/exit boundary annotations and commands, nested journeys, all entry
call sites and all parent continuation handlers. No boundary associations are
inferred. Inspector presentation data is computed per render and passed to the
design system's readonly `InspectorPanel`; contract selection uses the separate
`JourneyContractControls`. Static components have no interactive mode flags.
Transition rows are informational here; navigation, breadcrumbs/highlights,
screenshots and extension descriptors remain in later stages.

The layout uses the design system's public Tailwind bridge during the viewer
build to consume its shared `lg` breakpoint. Consumers only import compiled CSS;
they need no Tailwind plugin. No production CSS reaches into design-system source.

Large-document rendering remains deferred: fully expanding every occurrence can
produce exponentially many rows in a heavily shared graph. Queries scan source
collections, and there is no render-size or depth policy yet. Ancestor lookup on
selection can also revisit the same ancestors exponentially along shared diamond
paths, build duplicate reference arrays and rescan journeys/states/composites
before reference merging removes duplicates. Future performance work needs an
explicit display policy; a persistent graph/cache would violate the plan.
Local collections confined to one call do not retain state and may be used in
future pure traversal optimizations. The joined touchpoint caption is also
temporary: stage 7 must retain each touchpoint's identity when adding filtering.

From the workspace root:

```sh
pnpm storybook:viewer
pnpm build:storybook:viewer
pnpm test:viewer:browser
```

Viewer Storybook runs on port 6007. Its internal `.storybook` configuration extends
the design system's main configuration, preview decorators/theme toolbar,
accessibility settings and Vite setup. The inherited catalog appears under
“Design system”; viewer stories appear under “Viewer”. The design system keeps
its independent Storybook on port 6006 and never imports viewer code.

Colocated static, controlled, inspector and interactive stories cover Solid-OIDC,
multiple roots and recursion, empty documents, independent instances, same-ID
replacement, empty/unresolved composites and the compiled consumer. Native JSON parsing and
frozen demonstration documents are shared only at the development boundary in
`.storybook/documents.ts`. Story controls receive the heading level; document
editing is excluded from controls.

The compiled-consumer iframe reads built ESM/declarations/CSS without Tailwind
processing or source aliases. `tests/consumer` is a build-only smoke fixture,
served by Storybook at `/viewer-consumer/`; it has no standalone preview command.
The inherited design-system consumer remains available at `/consumer/`.
The Storybook commands build all required packages and both consumer fixtures.
`pnpm build:viewer` builds the renderer and its runtime dependencies independently
of Storybook.

`pnpm test` includes frozen-input rendering and readonly declaration checks.
The browser command builds viewer Storybook, verifies OIDC structure,
recursion/reuse, accessibility, themes and responsive wrapping in the compiled
consumer, then loads the full inherited catalog, both iframes and viewer stories.
It checks inherited light/dark/alternate theme globals, source-story wrapping,
native keyboard selection/disclosure, instance independence and document reset,
and closes its temporary server/browser. Screenshots remain in ignored `.test-output`.
Install Chromium once with
`pnpm --filter @journey-viewer/viewer exec playwright install chromium`, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing binary.

Production exports contain only the renderer and compiled layout CSS. Fixtures,
Storybook, consumer fixtures, tests and tooling stay outside `dist`. Navigation,
screenshots, extensions, app composition and deployment retain their later stage
boundaries in the root plan.

# Journey Viewer renderer

`@journey-viewer/viewer` renders static and interactive hierarchies from a readonly
canonical compact UJG document. React is a peer. The renderer uses the UJG query
package and design-system components; parsing, linting, file access, themes, and
asset path resolution belong to callers. Native image loading and modal effects
are isolated in the viewer's named browser adapters.

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

Graph rendering holds no hierarchy model, parent map, shared interaction store,
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
controlled `JourneyNavigation` (the explorer bar), `JourneyExplorer` (tree or
columns) and a sticky `JourneyInspector`, following the original Solid-OIDC
hierarchy layout. Each instance is independent, even when instances receive the
same frozen document. The state boundary retains the original document reference
only to detect replacement. A new document object, including one with the same
`@id` and node objects, resets selection, expansion, mode, search, filters, hover,
the hover preview and the lightbox before children render. No mutable store or
identity registry is used; DOM effects live only in the named `browser/` adapters.
Optional `headerStart` / `headerEnd` content replaces the default document summary
at the start of the explorer bar or is appended at its end.
Keep `document` referentially stable between actual replacements. Parsing or
rebuilding it inline, such as `<JourneyViewer document={JSON.parse(source)} />`,
resets the entire viewer snapshot on every parent render. Parse once when loading
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
`onSelect`, `onToggleChildren`, optional `onToggleContracts` and optional heading
`level`. `JourneyInspector` takes `document`, `selection` and optional `level`.
The controlled components hold no state; their caller owns document replacement
and snapshot reset.

The public pure functions are `createViewerInteraction(document)`,
`selectNode(document, current, selection)`,
`toggleChildJourneys(document, current, journeyRef, stateRef)`,
`toggleContracts(document, current, journeyRef)`,
`expandAllJourneys(document, current)` and `collapseAllJourneys(current)`.
`ViewerInteraction` holds a readonly selection, an expanded-journey ID array and
the `openContracts` journey IDs whose entry/exit lists are shown. Lists start
closed behind a “1 entry · 2 exits” summary; selecting an entry or exit opens its
journey's list.
A selection is `{ kind, journeyRef, nodeRef }`, where kind is `journey`, `state`,
`entry` or `exit`. Wrong owner/type and unresolved selections are no-ops. Useful
selection/expansion no-ops retain snapshot identity, and frozen inputs are supported.

Expansion follows journey identity across repeated call sites within one viewer;
collapsing a reused journey affects all its occurrences. A selected item is
highlighted at every occurrence of its journey/state/contract identity. There is
no per-call-site expansion. Navigation separately retains an explicit occurrence
path for columns and the inspector crumb, without changing this logical selection
policy. Every selected row marks the same graph identity, wherever it is reused.
The inspector crumb and its navigation describe the last chosen call site. They
identify the active occurrence; the repeated row highlights identify the shared
node. Consumers should keep this distinction when composing custom controls.

A composite disclosure toggles its complete explicit child group. Selecting a
composite opens all children; selection reveals all explicit ancestor paths without
assigning a single parent. Programmatic descendant selection reveals each open
child independently of collapsed siblings; the group's disclosure collapses it
when any child is open and opens every child when all are closed. Recursion
remains bounded by the current rendered path.

Composites with no resolvable child journeys keep an indented “No child journeys.”
notice inside their selectable row container, including after collapse-all. They
have no disclosure control because there is no child journey to open.

Inspection follows the original inspector. The head shows the occurrence crumb,
title, touchpoints, kind (“State”, “Composite state”, “Journey entry”, “Journey
exit” or “Journey”) and full ID. A selected state's screenshot appears as a
thumbnail. A composite lists each nested journey with its counts and an explicit
touchpoint-change note. Incoming and outgoing transitions are grouped by the node
at their other end; each group head navigates there, and items show the transition
label, the explicit boundary annotation (“enters at Start at login”, “on child exit:
IdP auth failed”) and tags. Entries show their start state and the call sites in
the parent at the current occurrence; exits show their producers and the parent's
continuation handlers. A footnote summarizes the journey's entries and exported
exits. No boundary associations are inferred. Presentation data is computed per
render and passed to the design system's readonly `InspectorPanel`; contract
selection uses `JourneyContractControls`. Static components have no interactive mode flags.
The informational inspector remains available through its original props. Supply
the complete optional `navigation: { occurrence, onNavigate }` contract to add
graph-navigation controls. Optional screenshot controls are described below;
explicit extension descriptors are described below.

## Navigation

The explorer bar holds the document summary (journeys, states, transitions and
mapped screens), a Tree/Columns switch, expand/collapse-all icons (tree only),
touchpoint chips, the search field and a reset icon. From the `md` breakpoint it
sticks to the top of the viewport and its height is exposed as
`--jv-explorer-offset`, which positions the sticky inspector and row scroll margins.
Below `md` the inspector precedes the graph, as in the original hierarchy.

`JourneyViewer` starts in the tree with all journeys expanded. Nested journeys
render as indented row lists beneath their composite, with a touchpoint guide line;
the composite row shows the child journey names and a dot when the child changes
touchpoint. “Columns” shows fixed-width columns along the selected occurrence path
plus the children of a selected composite: selecting a composite in a column opens
its children to the right, and selecting elsewhere trims the columns. Each column
has an ancestor crumb (“Root journey” for a starting point), its state count, rows
with decorative carets (accented when open) and its collapsed entry/exit summary.
The newest column scrolls into view. Opening a screenshot follows its call path
without opening a composite's children. “Reset view” restores selection, expansion,
the tree, blank search, all touchpoints and no hover, and scrolls the viewer into view.

Rows show relations to the active state — the hovered state, else the selection —
in the same journey: incoming rows are tinted green with ←n, outgoing rows purple
with →n, both with a split stripe, unrelated rows are dimmed and the active row
gets a dark stripe. The selected row is highlighted as a whole. Marks count
explicit local transitions and their title lists them; hovering the marks shows
relations to the selection. Entry/exit counts are not shown on rows.

Search matches journey/state/entry/exit labels, full IDs and tags without case
sensitivity, in hierarchy traversal order. “/” focuses the field from outside a
text input. Results appear in a popover with the touchpoint dot, the journey
context and a phone icon when a screenshot is mapped; an outside click closes it,
and focusing the field reopens it. Whitespace produces no results; at most 18
results are returned, and at the limit the status says “Showing first 18 matches”.
Repeated call sites remain separate results, distinguished by their occurrence
path. Enter picks the first result, Escape clears the query and leaves the field.
A search pick clears the query, selects and reveals the target. Row, inspector
and column navigation preserve the query.

The touchpoint filter is single-select: “All” shows every journey, and selecting a
chip replaces the previous one. Chips retain each source identity; colliding labels
include the full touchpoint ID. Assignments are never inherited. Nonmatching scope
headers, own rows and contracts are dimmed while all topology stays present; a
matching nested journey gets a solid guide line and a matching card head a tint.
A matching child is not dimmed by its parent. Search results follow the filter.

Inspector group heads and detail buttons follow local transition endpoints, entry
start states, nested journeys and the explicit parent call sites/continuations at
the current occurrence, and bring the target into view. An absent or unresolved
mapping produces no invented target. No journey acquires a preferred parent.

The readonly `ViewerSnapshot` contains `interaction`, a `navigation` snapshot
(`mode`, `lanes`, selected `occurrence`, `query`, `touchpointRefs` with at most one
ID, `hover`, `hoverOccurrence`) and a `lightbox` identity or null.
`ViewerOccurrence` is `{ startJourneyRef, steps }`, with each step
holding zero-based `stateIndex` and `childIndex` into the typed query results.
These indices preserve repeated reference positions. Paths only address finite
rendered occurrences: invalid indices, non-starting roots and recursion beyond
the current ancestry are rejected. Paths belong to their input object and must
be reset when that input is replaced.

Pure public operations are `createViewerSnapshot`, `navigateViewer`, `pickSearchResult`,
`setViewMode`, `setSearchQuery`, `selectTouchpoint` and `hoverNode`. Queries include
`getOccurrenceTrail` (original journey nodes), `getLanePath`, `searchViewer`,
`getNavigationItems`, `getViewerSummary`, `matchesTouchpoints`, `getRowHighlight`,
`getRouteDescription` and `occurrenceLabel`; `getPreviewPosition` and
`getPreviewWidth` place hover previews. Nothing retains derived results between
calls. Valid unchanged navigation/hover operations preserve snapshot identity.

Snapshot consumers must use `navigateViewer` or `pickSearchResult` for selection
so the selected identity and its occurrence are validated and updated together.
`navigateViewer` preserves the query; `pickSearchResult` clears it after validating
the target. The stage-6 `selectNode` API remains supported for callers that own
only a `ViewerInteraction`. Spreading its result into a `ViewerSnapshot` without
updating navigation can leave stale occurrence context. Expansion-only transitions
can be composed without changing the navigation context; reset the whole snapshot
through `createViewerSnapshot` when replacing the input.

Externally controlled compositions can use `JourneyNavigation` with its snapshot
and explicit callbacks (`onMode`, `onExpandAll`, `onCollapseAll`, `onTouchpoint`,
`onQuery`, `onSearchPick`, `onReset`); `searchOpen` / `onSearchFocus` control the
result popover. `JourneyExplorer.onSelect` receives the occurrence as its second
argument. Its optional `navigation`, `onHover`, `onToggleContracts` and `media`
props supply presentation and actions. `JourneyInspector.navigation` couples
occurrence context with its required navigation callback. `JourneyViewer` remains
the sole React graph-interaction state owner; controlled components invoke no
callbacks during rendering. Scrolling, the “/” shortcut, outside clicks, DOM
measurement and image preloading stay in the `browser/` adapters, which use their
own elements' `ownerDocument`/`defaultView` and receive no graph types.

The layout uses the design system's public Tailwind bridge during the viewer
build to consume its shared `lg` breakpoint. Consumers only import compiled CSS;
they need no Tailwind plugin. No production CSS reaches into design-system source.

Large-document rendering remains deferred: fully expanding every occurrence can
produce exponentially many rows in a heavily shared graph. Queries scan source
collections, and there is no render-size or depth policy yet. Ancestor lookup on
selection can also revisit the same ancestors exponentially along shared diamond
paths, build duplicate reference arrays and rescan journeys/states/composites
before reference merging removes duplicates. Hover updates the root snapshot,
which re-renders the hierarchy and recomputes navigation summaries, paths and
search. Per-row relation queries repeat selection resolution and linear scans.
A no-match search traverses every finite occurrence; shared diamond paths can
make this work exponential even though the returned list is capped at 18.
Future performance work needs an
explicit display policy; a persistent graph/cache would violate the plan.
Local collections confined to one call do not retain state and may be used in
future pure traversal optimizations, including per-render lookups. Moving hover
to another state owner would require an explicit change to the agreed single
React graph-interaction state boundary. Touchpoint captions are
presentation-only: filtering retains each source touchpoint identity independently.

## Screens and presentation

Screenshot paths are an independent readonly input. A plain JSON object starts
the contract; it needs no JSON-LD context, version envelope or asset registry:

```json
{
  "urn:example:surface": "./screens/sign-in.png"
}
```

The caller reads/parses that document and resolves relative paths against an
explicit mapping-document or asset base. It then passes the resulting map:

```tsx
import type { ScreenshotMap, TouchpointPresentation } from "@journey-viewer/viewer";

const screenshots: ScreenshotMap = {
  "urn:example:surface": "https://example.test/screens/sign-in.png",
};
const touchpoints: TouchpointPresentation = {
  "urn:example:app": { shortLabel: "App", color: "var(--jv-color-category-orange)" },
};

<JourneyViewer document={document} screenshots={screenshots} touchpoints={touchpoints} />
```

`ScreenshotMap` is `Readonly<Record<string, string>>`. Exact surface IDs are
looked up only after querying the node's explicit UJG Surface associations. A
node can have several surfaces; each gets its own preview/open action. Unmapped
surfaces show an unavailable preview. Missing surfaces show an empty message.
No primary surface, filename or association is inferred. `TouchpointPresentation`
is a separate readonly record of exact touchpoint IDs to optional `shortLabel`
and `color`. Unconfigured labels fall back to source labels/IDs; unconfigured
colors use the design-system default. Short-label collisions retain full IDs in
filter buttons. Multiple journey touchpoints remain separate captions and dots.
The static `JourneyHierarchy` API retains its original presentation.

The selection alone supplies the inspector thumbnail; hovering rows never changes
it. Each mapped state has a row phone button that takes its journey's touchpoint
color on hover or focus. Hovering it, or focusing it with the keyboard, shows a
floating preview card beside the button (on the left when the right side would
overflow), sized to the viewport height and dismissed on scroll or resize. The
card is presentation only; the button remains the accessible control. Clicking
the button or the thumbnail opens the lightbox. Opening a screenshot updates selection
and occurrence, reveals ancestors, preserves search/filters/focus mode, and keeps
the selected composite's child disclosure unchanged. The native modal has
Previous/Next buttons, Left/Right keys, Escape/Close, forward/reverse Tab wrapping,
backdrop clicks and focus restoration to the opener. If that opener was removed
or disabled, focus returns to the owning viewer's first enabled control. The
screenshot is shown at phone size (at most 760px tall, within the viewport) above
a compact caption with the touchpoint dot, title, context, position and
previous/next/close icon buttons. Closing retains the last selected screen's graph
item. Ordinary graph navigation closes the modal.
The dialog uses an independent level-2 heading; `JourneyViewer.level` controls
the hierarchy and inspector headings.

The lightbox derives its gallery anew from original source nodes: source journey
order, each finite call-site occurrence, then journey/state/entry/exit member
order and explicit surface order. Reused journeys retain all distinct occurrence
contexts; identical repeated member/surface references are shown once per context.
When any surface repeats, the gallery counter counts views, and repeated images
also say, for example, “2 of 3 call sites.” Each view represents a surface at one
explicit call site; Next/Previous changes that context as well as the counter.
The full context caption identifies the parent path. A gallery with no repeated
surfaces retains the compact screen counter.
Traversal wraps and skips unmapped paths. Failed URLs stay navigable so they can
recover after a caller update. The Solid-OIDC gallery matches the captured source
order across all 37 screens. This derived list is never retained as a catalog.

Replace `screenshots` with a new readonly map while keeping `document` stable.
Selection, expansion, focus, query and filters remain intact. An open lightbox
retains only `{ surfaceRef, target }` and resolves its URL from the latest prop.
Removal clears the old image and displays Screenshot unavailable; adding/restoring
the mapping or changing its URL can recover it. Clear-all disables stepping.
Image error/loading state is local to the actual URL at the browser boundary,
separate from the immutable graph snapshot. After the page is idle, every mapped
image is preloaded into the document's image cache, so previews and lightbox steps
appear without blank frames. Images keep their natural aspect ratio.

New image bytes at an unchanged URL follow the host/browser cache policy. Supply
a revised URL, query revision, or blob URL through the same map when needed.
The viewer does not fetch/parse mappings, watch files or add cache busting. Native
UJG object replacement still resets the full snapshot, including the lightbox.

Pure operations are `getNodeScreens(document, screenshots, nodeRef)`,
`getScreens(document, screenshots)`,
`openScreenshot(document, screenshots, snapshot, target, surfaceRef)`,
`closeScreenshot(snapshot)` and
`stepScreenshot(document, screenshots, snapshot, -1 | 1)`. Invalid or unchanged
actions preserve snapshot identity. Node/surface query results reference original
document nodes; none mutate the supplied graph, maps or snapshots.

Controlled compositions can use `JourneyScreens` with a document, target, map and
required `onOpen(target, surfaceRef)`. `JourneyExplorer.media` takes the complete
`{ screenshots, onOpen }` contract plus an optional `onPreview(target, surfaceRef,
anchor | null)`; `JourneyInspector.media` additionally requires `target` (or null)
so thumbnail context and controls are supplied together.
`JourneyNavigation.screenshots` supplies availability markers. `JourneyLightbox`
receives the current identity, map and explicit close/previous/next callbacks.
`hoverNode` accepts an optional occurrence; `JourneyExplorer.onHover` reports it
as a second argument. Existing single-argument callbacks remain compatible.

The `browser/` adapters own every DOM effect: `BrowserScreenImage` (per-URL load
status), `BrowserLightbox` (native modal, keys, focus, backdrop), `BrowserScreenButton`
(measures its own rectangle), `BrowserScreenPreview` (placement and dismissal),
`BrowserScreenPreload`, `BrowserColumns` (scrolls to new columns),
`BrowserScrollPanel` (inspector scroll reset) and `BrowserViewerShell` (sticky
offset, “/”, outside clicks and reveal). They receive no UJG document or viewer
snapshot and reach the page only through their own elements. Business transitions
stay pure; no body locks, graph refs or shared state are added.

Stage 10D (hierarchy parity) replaced `focusJourney`/`showOverview` with
`setViewMode`, `toggleTouchpoint` with `selectTouchpoint`, and `getRowRelation`
with `getRowHighlight`; `ViewerNavigation.focus` became `mode` and `lanes`.
`occurrenceLabel` remains for readable call-site captions, and the five screen
functions and controlled screen components remain public. Prefer
`createViewerSnapshot(document)` over hand-built snapshots to obtain all defaults.
The optional fourth `hoverNode` argument supplies call-site context and defaults to null.

## Build-time extensions

Pass a readonly `ViewerExtensions` object through `JourneyViewer.extensions`.
Descriptors are imported functions/components in the caller's build. Matching
reads the current original document nodes; no registration, discovery, setup/
dispose lifecycle, parser selection or shared runtime state is involved.

```tsx
import { Badge, StateRow, Text } from "@journey-viewer/design-system";
import { JourneyViewer } from "@journey-viewer/viewer";
import type {
  ViewerExtensions, ViewerInspectorPanelProps, ViewerStateRenderProps,
} from "@journey-viewer/viewer";

function SourceNote({ node }: ViewerInspectorPanelProps) {
  return <Text as="p">Source identity: {node["@id"]}</Text>;
}
function ReviewedRow({ row }: ViewerStateRenderProps) {
  return <StateRow {...row} description="Review this step" />;
}
const extensions = {
  inspectorPanels: [{
    id: "source-note", title: "Source note",
    matches: () => true, Component: SourceNote,
  }],
  annotations: [{
    id: "review", matches: ({ selection }) => selection.kind === "state",
    Component: () => <Badge>Needs review</Badge>,
  }],
  stateOverrides: [{
    id: "reviewed-row", matches: ({ node }) => node.tags?.includes("review") ?? false,
    Component: ReviewedRow,
  }],
} as const satisfies ViewerExtensions;

<JourneyViewer document={document} extensions={extensions} />
```

All matching inspector panels append in array order after the built-in sections,
footnote and annotations. The viewer owns each panel's title and semantic heading; the component
receives the next heading `level`, capped at 6. All matching annotations render in
array order for journeys/states in the explorer and for the selected journey,
state, entry or exit in the inspector. They are separate content beside controls,
so custom annotation controls do not become nested buttons. Inspector annotations
appear after the built-in sections and footnote, before panels. Annotation lists
keep native list semantics without a repeated accessible label.

Descriptor IDs must be unique within each supplied array; they serve only as
React keys. Uniqueness is the caller's responsibility and is not checked by the
viewer. Duplicate IDs are unsupported input with undefined rendering behavior.

`ViewerNodeContext` contains the original `document`, `journey` and `node`, the
readonly `selection` identity, and an explicit `occurrence`. Repeated journeys
receive each finite call-site occurrence independently. An informational inspector
without navigation receives `occurrence: null`; invalid or absent selections
evaluate no inspector descriptors. Panel props additionally include an optional
`onNavigate` only when the controlled inspector supplies it. Hover previews do
not change the inspector's selected-node extension context.

The first matching `stateOverrides` descriptor wins; unmatched rows use the
ordinary `StateRow`. `ViewerStateRenderProps` contains the original state context
and the complete design-system `row` contract: selection/filter state, relation
tone and marks, child-journey description and touchpoint crossing,
selection/hover/disclosure callbacks, screenshot actions, empty-child notices and
nested content. Compose `<StateRow {...row} />` to preserve these
behaviors. A replacement that omits controls or children takes responsibility for
their presentation and accessibility; returning null deliberately hides that row's
content. It does not alter canonical membership, queries or selection state.
Annotations remain independent of the row override. Components follow normal
React composition; predicates and rendering must leave caller inputs unchanged.
Errors propagate to the host's error boundary.

Replacing/removing `extensions` recomputes presentation and preserves the viewer
snapshot, including selection, expansion, mode and columns, query, filters, hover and lightbox.
Removing descriptors restores built-in content. Only replacing `document` resets
interaction. For externally controlled hosts, `JourneyExplorer.extensions` takes
annotations/state overrides and `JourneyInspector.extensions` takes panels/
annotations. `JourneyHierarchy` keeps its separate static contract.

File reading, native `JSON.parse`, rule policy and choosing the imported viewer
component remain explicit caller operations. Stage 10 wires these into the app;
descriptors introduce no parser/view resolver or extra package dependency.

From the workspace root:

```sh
pnpm storybook:viewer
pnpm build:storybook:viewer
pnpm test:viewer:browser
pnpm test:parity   # requires the original hierarchy and the app dev server
```

Viewer Storybook runs on port 6007 and shows only the viewer stories, under
“Viewer”. Its own `.storybook` configuration supplies the light/dark theme
toolbar, scoped theme decorator, accessibility settings and Vite setup, and
imports only the design system's public exports (`styles.css` and components).
The design system keeps its independent Storybook on port 6006 and never imports
viewer code.

Colocated static, controlled, inspector and interactive stories cover Solid-OIDC,
multiple roots and recursion, empty documents, independent instances, same-ID
replacement, empty/unresolved composites and the compiled consumer. Native JSON parsing and
frozen demonstration documents are shared only at the development boundary in
`.storybook/documents.ts`. Story controls receive the heading level; document
editing is excluded from controls. Navigation stories include bounded search,
no matches, a selected touchpoint, equal-label touchpoints, capped results and
columns at a repeated child's second reference. A review fixture includes unresolved state/child
references to check that UI wording does not expose query-result positions.
Screen stories include all 37 OIDC assets, several opaque surface IDs, a missing
file and independent map/path replacement. The live-input story and compiled
consumer have caller-owned replace/remove/clear/restore controls.
Extension stories and the compiled consumer demonstrate an additive source panel,
boundary annotation and state-row override, with caller-owned replace/remove
controls alongside an independent default viewer.

The compiled-consumer iframe reads built ESM/declarations/CSS by package name,
without Tailwind processing or the `@/` source alias. `tests/consumer` is a
build-only smoke fixture, served by Storybook at `/viewer-consumer/`; it has no
standalone preview command. The Storybook commands build all required packages
and the consumer fixture.
`pnpm build:viewer` builds the renderer and its runtime dependencies independently
of Storybook.

`pnpm test` includes frozen-input rendering and readonly declaration checks.
The browser command builds viewer Storybook, verifies OIDC structure,
recursion/reuse, accessibility, themes and responsive wrapping in the compiled
consumer, then loads every viewer story and the consumer iframe.
It checks the light/dark theme globals, source-story wrapping,
native keyboard selection/disclosure, collapsed contracts, the explorer bar and
sticky inspector at the shared breakpoints, columns, single-select filtering,
search popover/“/”/outside dismissal, reveal-on-navigate, row tones and marks,
instance independence and document reset, all 37 PNG decodes, hover preview
placement, live map changes, image failure/recovery, modal focus/keys/backdrop,
extension matching/removal, preserved call-site state and custom-row keyboard controls,
and closes its temporary server/browser. Screenshots remain in ignored `.test-output`.
Install Chromium once with
`pnpm --filter @journey-viewer/viewer exec playwright install chromium`, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing binary.

`pnpm test:parity` is a development-only comparison with the original
`journey-graph` hierarchy. With the original (`ORIGINAL_URL`, default
`http://localhost:5174/hierarchy`) and the app (`VIEWER_URL`, default
`http://localhost:4321/app/examples/solid-oidc/`) already running, it checks the
first-row offset, inspector column and order, control count, hover preview,
lightbox ratio, columns, filter and search popover at 1440/1099/859/375px, and
writes paired screenshots to `.test-output/parity/`.

Production exports contain only the renderer and compiled layout CSS. Fixtures,
Storybook, consumer fixtures, tests, example assets and tooling stay outside `dist`.
App composition and deployment retain their later stage boundaries in the root plan.

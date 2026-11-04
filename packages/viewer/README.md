# Journey Viewer renderer

`@journey-viewer/viewer` renders static and interactive hierarchies from a readonly
`JourneyGraph`: the version-independent graph `@journey-viewer/ujg-jsonld` derives
from a UJG document with `projectJourneyGraph`. React is a peer. The renderer reads
only that graph and uses design-system components; it never sees the UJG source
format or its version. Parsing, version detection, linting, projection, file access,
themes, and asset path resolution belong to callers. Native image loading and modal effects
are isolated in the viewer's named browser adapters.

```tsx
import { projectJourneyGraph } from "@journey-viewer/ujg-jsonld";
import { JourneyHierarchy } from "@journey-viewer/viewer";
import "@journey-viewer/design-system/styles.css";
import "@journey-viewer/viewer/styles.css";

// Once per document, after the caller's checks; keep the result.
const graph = projectJourneyGraph(document);

<main data-jv-theme="light">
  <JourneyHierarchy graph={graph} level={2} />
</main>;
```

`JourneyHierarchy` retains its static contract: only `graph` and optional
heading `level`. Its heading level defaults to 2; nesting increases it up to 6. No Tailwind processing
or global reset is required. The design system exports an optional `reset.css`
for hosts that need it.

Journeys with no incoming child reference from a journey's explicit state members
appear as roots, in document order. Every state and child-journey reference is
rendered in the graph's order (the document's), including all children and repeated
references at separate call sites. An unowned composite does not establish a
parent. Entry indexes remain catalogues rather than implicit journey membership
or root declarations.

The current ancestry bounds recursion: a journey already on that path appears
as a labeled recursive reference. Reuse on another path still renders normally.
Journeys unreachable from any root appear in a labeled “Journeys without a root”
group, with each journey shown as its own starting point. This also exposes
disconnected cycles without choosing an arbitrary root or assigning parents.

Each journey displays its explicit entries/exits and its default entry. Unlabeled
journeys and contracts use their full id, which the graph gives them as label. State entry marks count the
containing journey's entries that name the state; exit marks count that journey's
listed exits reached by an explicit local transition from the state. No routes
or transitive boundary associations are inferred. All explicitly assigned
touchpoint labels are shown together, without inheritance or a chosen primary.
The hierarchy explains the meaning of state marks in a visible caption;
individual marks also carry precise accessible explanations and tooltips.
Journey wrappers are plain containers around their headings, without adding a
region landmark for every nested journey.

Unresolved and differently typed references are left out of the graph by
`ujg-jsonld`. Empty documents, journeys, composites, and contract lists have explicit
empty messages. Rendering does not validate or produce findings.

Graph rendering holds no hierarchy model, parent map, shared interaction store,
DOM refs, or effects. Each render recomputes selections of the graph's nodes and uses
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
  <JourneyViewer graph={graph} />
</main>;
```

`JourneyViewer` is the default arrangement of the composition kit described in
“Composing a viewer” below: a `Viewer` with the explorer bar's pieces, Tree and
Columns (`JourneyExplorer`) and a sticky `JourneyInspector`, following the original
Solid-OIDC hierarchy layout. Its state is one local immutable `ViewerState`. Each instance is independent, even when instances receive the
same frozen graph. The state boundary retains the graph reference only to detect
replacement. A new graph object, including one projected again from the same
document, resets selection, expansion, mode, search, filters, hover,
the hover preview and the lightbox before children render. No mutable store or
identity registry is used; DOM effects live only in the named `Browser*` adapters.
Optional `headerStart` / `headerEnd` content replaces the default document summary
at the start of the explorer bar or is appended at its end.
Keep `graph` referentially stable between actual replacements. Projecting it
inline, such as `<JourneyViewer graph={projectJourneyGraph(JSON.parse(source))} />`,
resets the entire viewer snapshot on every parent render. Parse and project once
when loading an input and retain the graph in application state, or memoize by the
source input. The application keeps the graph until the next file load.

Initial selection uses the first root (or first rootless starting point), its
explicit default entry's member state, then its first member state, then the
journey itself when empty. An empty document has no selection. All journeys start
expanded. Reset restores this policy; expand/collapse preserves selection. A
collapse may hide the selected row: the inspector continues to show that item,
and no automatic reveal or selection clearing occurs. Selecting a descendant
again reveals its ancestors.

For externally owned state, `JourneyExplorer` takes `graph`, `interaction`,
`onSelect`, `onToggleChildren`, optional `onToggleContracts` and optional heading
`level`. `JourneyInspector` takes `graph`, `selection` and optional `level`.
The controlled components hold no state; their caller owns graph replacement
and snapshot reset.

The public pure functions are `createViewerInteraction(graph)`,
`selectNode(graph, current, selection)`,
`toggleChildJourneys(graph, current, journeyId, stateId)`,
`toggleContracts(graph, current, journeyId)`,
`expandAllJourneys(graph, current)` and `collapseAllJourneys(current)`.
`ViewerInteraction` holds a readonly selection, an expanded-journey ID array and
the `openContracts` journey IDs whose entry/exit lists are shown. Lists start
closed behind a “1 entry · 2 exits” summary; selecting an entry or exit opens its
journey's list.
A selection is `{ kind, journeyId, nodeId }`, where kind is `journey`, `state`,
`entry` or `exit`. Wrong owner/type and unresolved selections are no-ops. Useful
selection/expansion no-ops retain snapshot identity, and frozen inputs are supported.
Every string identifier in the API is named `*Id` (`journeyId`, `nodeId`,
`startJourneyId`, `touchpointIds`, `surfaceId`); `Ref` only ever names a React ref.
The markup keeps its `data-*-ref` attributes.

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
mapped screens), a Tree/Flow switch, touchpoint chips, the search field and a
reset icon. The composition places Tree's Rows/Columns icons with tooltips in the bar,
followed by expand/collapse-all in Rows. Flow has its own canvas controls and
expand/collapse in the explorer bar. From the `md` breakpoint it
sticks to the top of the viewport and its height is exposed as
`--jv-explorer-offset`, which positions the sticky inspector and row scroll margins.
Below `md` the inspector precedes the graph, as in the original hierarchy.

`JourneyViewer`, like every viewer, starts in the tree with every composite
closed: root journeys show their states, and Expand all, Collapse all or a chevron
open and close the rest. A `Viewer` can start elsewhere through `initialCommands`.
Nested journeys
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

Rows show relations to the selected state in the same journey: incoming rows are
tinted green with ←n, outgoing rows purple with →n, both with a split stripe,
unrelated rows are dimmed and the active row gets a dark stripe. The selected row is
highlighted as a whole. Marks count explicit local transitions and their title lists
them. Entry/exit counts are not shown on rows. `JourneyViewer` does not report row
hover, so hovering a row changes nothing (Stage 14). A controlled composition can still
pass `JourneyExplorer.onHover` and `hoverNode`: `getRowHighlight` then relates rows to
the hovered state, else the selection.

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
(`mode`, `lanes`, selected `occurrence`, `query`, `touchpointIds` with at most one
ID, `hover`, `hoverOccurrence`) and a `lightbox` identity or null.
`ViewerOccurrence` is `{ startJourneyId, steps }`, with each step
holding zero-based `stateIndex` and `childIndex` into the graph's lists.
These indices preserve repeated reference positions. Paths only address finite
rendered occurrences: invalid indices, non-starting roots and recursion beyond
the current ancestry are rejected. Paths belong to their input object and must
be reset when that input is replaced.

Pure public operations are `createViewerSnapshot`, `navigateViewer`, `pickSearchResult`,
`setViewMode`, `setSearchQuery`, `selectTouchpoint` and `hoverNode`. Queries include
`getOccurrenceTrail` (the graph's journey nodes), `getLanePath`, `searchViewer`,
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
measurement and image preloading stay in the `Browser*` adapters, which use their
own elements' `ownerDocument`/`defaultView` and receive no graph types.

The layout uses the design system's public Tailwind bridge during the viewer
build to consume its shared `lg` breakpoint. Consumers only import compiled CSS;
they need no Tailwind plugin. No production CSS reaches into design-system source.

The flow's layout cost grows with the connections that skip layers: one dummy vertex
per skipped layer, and ordering must keep track of all of them. Ordering judges each
swap by its gain, a pure function of the swapped vertices' neighbours, so a journey of
56 states and 1,278 transitions lays out in well under a second; `roots: "one"` lays out
only the root in view. Layout still runs synchronously during render.

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
import type {
  ScreenshotMap,
  TouchpointPresentation,
} from "@journey-viewer/viewer";

const screenshots: ScreenshotMap = {
  "urn:example:surface": "https://example.test/screens/sign-in.png",
};
const touchpoints: TouchpointPresentation = {
  "urn:example:app": {
    shortLabel: "App",
    color: "var(--jv-color-category-orange)",
  },
};

<JourneyViewer
  graph={graph}
  screenshots={screenshots}
  touchpoints={touchpoints}
/>;
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
screenshot opens in Fit mode, centered at its natural ratio without upscaling
and at most 760px tall. The stage and footer stay in place across image shapes
and loading states. Original size shows one image pixel per CSS pixel, with native
scrolling inside the image stage; Fit to window returns to Fit. Navigation to a
different view (including another call site of the same image), URL replacement,
and reopening reset to Fit; window resizing preserves the mode.
The caption has a bounded scrollable title/context region and a separate counter
and control toolbar. Close receives focus on opening. Both scroll regions are
keyboard accessible; arrow keys scroll a focused region and step screenshots
elsewhere. Closing retains the last selected screen's graph
item. Ordinary graph navigation closes the modal.
The dialog uses an independent level-2 heading; `JourneyViewer.level` controls
the hierarchy and inspector headings.

The lightbox derives its gallery anew from the graph's nodes: source journey
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

Replace `screenshots` with a new readonly map while keeping `graph` stable.
Selection, expansion, focus, query and filters remain intact. An open lightbox
retains only `{ surfaceId, target }` and resolves its URL from the latest prop.
Removal clears the old image and displays Screenshot unavailable; adding/restoring
the mapping or changing its URL can recover it. Clear-all disables stepping.
Image error/loading state is local to the actual URL at the browser boundary,
separate from the immutable graph snapshot. After the page is idle, every mapped
image is preloaded into the document's image cache. Complete cached images become
ready before paint; fresh loads decode before being revealed. Pending loads show
an explicit status in the stable stage, without a portrait-shaped placeholder.
Superseded loads and decode results cannot replace the selected image. Images keep
their natural aspect ratio.

New image bytes at an unchanged URL follow the host/browser cache policy. Supply
a revised URL, query revision, or blob URL through the same map when needed.
The viewer does not fetch/parse mappings, watch files or add cache busting. Native
UJG object replacement still resets the full snapshot, including the lightbox.

Pure operations are `getNodeScreens(graph, screenshots, nodeId)`,
`getScreens(graph, screenshots)`,
`openScreenshot(graph, screenshots, snapshot, target, surfaceId)`,
`closeScreenshot(snapshot)` and
`stepScreenshot(graph, screenshots, snapshot, -1 | 1)`. Invalid or unchanged
actions preserve snapshot identity. Node/surface query results reference the graph's
nodes; none mutate the supplied graph, maps or snapshots.

Controlled compositions can use `JourneyScreens` with a graph, target, map and
required `onOpen(target, surfaceId)`. `JourneyExplorer.media` takes the complete
`{ screenshots, onOpen }` contract plus an optional `onPreview(target, surfaceId,
anchor | null)`; `JourneyInspector.media` additionally requires `target` (or null)
so thumbnail context and controls are supplied together.
`JourneyNavigation.screenshots` supplies availability markers. `JourneyLightbox`
receives the current identity, map and explicit close/previous/next callbacks.
`hoverNode` accepts an optional occurrence; `JourneyExplorer.onHover` reports it
as a second argument. Existing single-argument callbacks remain compatible.

The `Browser*` adapters own every DOM effect. Single-file adapters live in `browser/`; an
adapter with its own styles has a folder beside the other components, with a story
(`Viewer/Browser*`). They are `BrowserScreenImage` (per-URL load
status), `BrowserLightbox` (native modal, keys, focus, backdrop), `BrowserScreenButton`
(measures its own rectangle), `BrowserScreenPreview` (placement and dismissal),
`BrowserScreenPreload`, `BrowserColumns` (scrolls to new columns),
`BrowserScrollPanel` (inspector scroll reset) and `BrowserViewerShell` (sticky
offset, “/”, outside clicks and reveal). They receive no graph or viewer
snapshot and reach the page only through their own elements. Business transitions
stay pure; no body locks, graph refs or shared state are added.

Stage 10D (hierarchy parity) replaced `focusJourney`/`showOverview` with
`setViewMode`, `toggleTouchpoint` with `selectTouchpoint`, and `getRowRelation`
with `getRowHighlight`; `ViewerNavigation.focus` became `mode` and `lanes`.
`occurrenceLabel` remains for readable call-site captions, and the five screen
functions and controlled screen components remain public. Prefer
`createViewerSnapshot(graph)` over hand-built snapshots to obtain all defaults.
The optional fourth `hoverNode` argument supplies call-site context and defaults to null.

## Build-time extensions

Pass a readonly `ViewerExtensions` object through `JourneyViewer.extensions`.
Descriptors are imported functions/components in the caller's build. Matching
reads the current graph's nodes; no registration, discovery, setup/
dispose lifecycle, parser selection or shared runtime state is involved.

```tsx
import { Badge, StateRow, Text } from "@journey-viewer/design-system";
import { JourneyViewer } from "@journey-viewer/viewer";
import type {
  ViewerExtensions,
  ViewerInspectorPanelProps,
  ViewerStateRenderProps,
} from "@journey-viewer/viewer";

function SourceNote({ node }: ViewerInspectorPanelProps) {
  return <Text as="p">Source identity: {node["@id"]}</Text>;
}
function ReviewedRow({ row }: ViewerStateRenderProps) {
  return <StateRow {...row} description="Review this step" />;
}
const extensions = {
  inspectorPanels: [
    {
      id: "source-note",
      title: "Source note",
      matches: () => true,
      Component: SourceNote,
    },
  ],
  annotations: [
    {
      id: "review",
      matches: ({ selection }) => selection.kind === "state",
      Component: () => <Badge>Needs review</Badge>,
    },
  ],
  stateOverrides: [
    {
      id: "reviewed-row",
      matches: ({ node }) => node.tags?.includes("review") ?? false,
      Component: ReviewedRow,
    },
  ],
} as const satisfies ViewerExtensions;

<JourneyViewer graph={graph} extensions={extensions} />;
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

`ViewerNodeContext` contains the `graph` with its `journey` and `node` (a journey,
state, entry or exit, told apart by `kind`), the readonly `selection` identity, and
an explicit `occurrence`. Extensions see the graph, never the UJG source; one that
needs source data closes over the document its caller already holds. Repeated journeys
receive each finite call-site occurrence independently. An informational inspector
without navigation receives `occurrence: null`; invalid or absent selections
evaluate no inspector descriptors. Panel props additionally include an optional
`onNavigate` only when the controlled inspector supplies it. Hover previews do
not change the inspector's selected-node extension context.

The first matching `stateOverrides` descriptor wins; unmatched rows use the
ordinary `StateRow`. `ViewerStateRenderProps` contains the state context
and the complete design-system `row` contract: selection/filter state, relation
tone and marks, child-journey description and touchpoint crossing,
selection/hover/disclosure callbacks, screenshot actions, empty-child notices and
nested content. Compose `<StateRow {...row} />` to preserve these
behaviors. A replacement that omits controls or children takes responsibility for
their presentation and accessibility; returning null deliberately hides that row's
content. It does not alter the graph, queries or selection state.
Annotations remain independent of the row override. Components follow normal
React composition; predicates and rendering must leave caller inputs unchanged.
Errors propagate to the host's error boundary.

Replacing/removing `extensions` recomputes presentation and preserves the viewer
snapshot, including selection, expansion, mode and columns, query, filters, hover and lightbox.
Removing descriptors restores built-in content. Only replacing `graph` resets
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
replacement, empty/unresolved composites and the compiled consumer. Native JSON parsing, projection
and frozen demonstration documents are shared only at the development boundary in
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

## Composing a viewer

`JourneyViewer` is one arrangement. The same pieces compose any other: a different
toolbar, a Flow view, controls on the canvas, or the canvas alone. An arrangement is a
different JSX tree, not a set of flags, and there is no plugin runtime or registry.

```tsx
import {
  DocumentSummary,
  ExpandCollapse,
  FlowPlacement,
  FlowSettings,
  FlowZoom,
  GraphSearch,
  ResetView,
  TouchpointFilter,
  TreeLayout,
  Viewer,
  ViewerBar,
  ViewerMain,
  ViewSwitch,
  WhenView,
  WhenTreeLayout,
  flowView,
  treeView,
} from "@journey-viewer/viewer";
import { FlowKey } from "@journey-viewer/design-system";

<FlowSettings>
  <Viewer
    graph={graph}
    screenshots={screenshots}
    touchpoints={touchpoints}
    views={[treeView, flowView()]}
  >
    <ViewerBar>
      <DocumentSummary />
      <ViewSwitch />
      <WhenView id="tree">
        <TreeLayout />
        <WhenTreeLayout mode="tree">
          <ExpandCollapse />
        </WhenTreeLayout>
      </WhenView>
      <WhenView id="flow">
        <FlowPlacement />
        <FlowZoom />
        <FlowKey />
      </WhenView>
      <WhenView id="flow">
        <ExpandCollapse />
      </WhenView>
      <TouchpointFilter />
      <GraphSearch>
        <ResetView />
      </GraphSearch>
    </ViewerBar>
    <ViewerMain />
  </Viewer>
</FlowSettings>;
```

- **`Viewer`** is the state boundary. It holds one immutable `ViewerState` (the
  shared snapshot, the node the flow's path leads to, the active view, search, reveal
  and the hover preview) and resets it when `graph` changes identity. Around its
  children it adds the screen preview, the lightbox and the browser shell (sticky-bar
  offset, “/” for search, reveal scrolling). `initialView` and `initialCommands` set
  what it opens with, and what Reset returns to. The initial commands are ordinary
  commands applied in that view, so an initial selection is a `navigate` with its
  occurrence: `initialCommands={[{ type: "collapseAll" }, { type: "navigate", target }]}`.
  Reset also returns the flow canvas to its first view.
- **Views** are readonly `ViewerView` descriptors `{ id, label, render, enter?, inspector? }`.
  `ViewSwitch` lists them and `ViewerMain` renders the active one beside the inspector.
  `treeView` renders the hierarchy only. The composition places `TreeLayout` in the bar;
  its Rows/Columns icons have tooltips and dispatch
  `{ type: "treeLayout", mode: "tree" | "columns" }`. The layout survives view switches,
  while reset restores the initial layout. `flowView({ commands })` renders `JourneyFlow` under a canvas header: the journey
  path on the left and, when given, `commands` in its command plane on the right, on
  one row from the `md` breakpoint. All views share selection and expansion.
- **Pieces** read the enclosing viewer and dispatch commands: `ViewerBar`,
  `DocumentSummary`, `ViewSwitch`, `WhenView` (children only while a view is active),
  `ExpandCollapse`, `TreeLayout`, `TouchpointFilter`, `GraphSearch` (with trailing tools as
  children), `ResetView` and `ViewerMain`. `JourneyNavigation`, the controlled bar,
  arranges the same parts for callers that own the snapshot.
- **Conditional composition.** `WhenTreeLayout mode="tree"` shows its children in Rows;
  `mode="columns"` shows them in Columns. It tests layout only: nest it inside
  `WhenView id="tree"` to also require Tree. Controls do not choose their own placement
  or visibility; the JSX composition does.
- **Flow settings.** Placement, zoom and the root scope are not graph state.
  `FlowSettings` explicitly wraps `Viewer` in compositions and holds settings for
  `FlowPlacement`, `FlowZoom`, `FlowRoots` and the flow view. Either nesting order works
  when the provider encloses all consumers; the examples consistently place it outside
  `Viewer`. Without it the flow draws every root journey, median at
  100%, and the three controls throw. The three draw their options as glyphs; each
  option's label is its accessible name and its tooltip. `FlowRoots` switches between every root journey
  on the canvas (the default) and one at a time; `initialRoots="one"` starts there.
  One at a time, the first step of the journey path gains a chevron that switches
  roots, the root shown follows the flow's location (a click, a search result, an
  inspector link, a switch on the path), and only that root is laid out. Roots are
  independent frames that no connector joins, so no topology within a root is dropped.

### Writing a control

Any component inside a `Viewer` can be a control. `useViewer()` returns the inputs
(`graph`, `views`, `screenshots`, `touchpoints`, `level`, `extensions`), the current
`state` and `dispatch`:

```tsx
function OpenEverything() {
  const { dispatch } = useViewer();
  return (
    <Button onClick={() => dispatch({ type: "expandAll" })}>Open all</Button>
  );
}
```

`ViewerCommand` is the complete vocabulary. Selecting, screens and disclosure:
`navigate` (with `reveal: true` it also scrolls the target into view, as the
inspector's links do), `pick` (a search result), `toggle`, `expandAll`, `collapseAll`,
`openScreen`, `stepScreen` and `return` (an earlier step on the flow's journey path).
The rest are `view`, `query`, `searchFocus`, `searchDismiss`, `touchpoint`,
`toggleContracts`, `closeScreen`, `preview`, `hidePreview` and `reset`.
`reduceViewer(inputs, state, command)` and `createViewerState(inputs)` are the pure
functions behind `dispatch`: frozen inputs are supported, and unchanged results keep
the state's identity. A module with state of its own, as Flow's settings show, brings
its own provider instead of extending `ViewerState`.

### Flow internals

- `src/flow/`: the projection of the graph plus the shared expansion into a scene with
  plain ids (`scene.ts`, the only flow module that reads the graph), the bottom-up composer over
  `@journey-viewer/flow-layout` (`compose.ts`, `geometry.ts`), text sizing (`text.ts`), the
  highlight and active-route geometry (`highlight.ts`, `strokes.ts`) and block rects.
- `src/disclosure.ts`: `disclose`, the reducer behind every navigation, screen and
  disclosure command; it also marks `location`, the node the journey path leads to.
- `JourneyFlow`: the controlled canvas with its journey path, composed of the design
  system's `Flow/*` primitives. `BrowserTextMeasure` sizes text with the rendered fonts,
  `BrowserFlowViewport` owns scrolling, fit, anchoring and reveals, and `BrowserInsetMap`
  follows and moves the canvas from the inset map.
- `src/dev/artifacts.ts`: layout metrics for tests and stories; never in `dist`.
- Storybook: `Viewer/JourneyFlow` (scopes and placements, each reporting its artifacts) and
  `Viewer/Flow scenarios`, five arrangements written as plain compositions, including a
  custom command.

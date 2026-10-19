# Journey Viewer renderer

`@journey-viewer/viewer` renders a fully expanded static hierarchy from a readonly
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

`document` and optional heading `level` are the only props at this stage. The
heading level defaults to 2; nesting increases it up to 6. No Tailwind processing
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

Production code holds no hierarchy model, parent map, interaction store, DOM refs,
or effects. Each render recomputes selections of original source nodes and uses
readonly reference arrays solely to select roots and detect unreachable journeys.
Reachability passes new values through pure reductions, without mutating a set
or work queue. `StateSummary` renders labels, counts and nested content directly;
it has no interaction or mode props. Interaction snapshots and callbacks arrive
in stage 6.

Large-document rendering remains deferred: fully expanding every occurrence can
produce exponentially many rows in a heavily shared graph. Queries scan source
collections, and there is no render-size or depth policy yet. Future performance
work needs an explicit display policy; a persistent graph/cache would violate the
plan. The joined touchpoint caption is also temporary: stage 7 must retain each
touchpoint's identity when adding filtering.

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

Colocated `JourneyHierarchy` stories cover Solid-OIDC, multiple roots and
recursion, an empty document and the compiled consumer. Native JSON parsing and
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
It checks inherited light/dark/alternate theme globals and source-story wrapping,
and closes its temporary server/browser. Screenshots remain in ignored `.test-output`.
Install Chromium once with
`pnpm --filter @journey-viewer/viewer exec playwright install chromium`, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing binary.

Production exports contain only the renderer and compiled layout CSS. Fixtures,
Storybook, consumer fixtures, tests and tooling stay outside `dist`. Selection, inspection,
navigation, screenshots, extensions, app composition and deployment retain their
later stage boundaries in the root plan.

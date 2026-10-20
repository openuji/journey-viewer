# Journey Viewer implementation plan

## Current checkpoint

- Current stage: **8 — Screens and presentation (complete, uncommitted)**.
- Next stage: **9 — Build-time extensions**. Do not start it in the stage-8 request.
- Stage-8 deliverable: standalone exact-surface-ID screenshot JSON, all 37 copied
  OIDC assets, selection/hover previews, native keyboard lightbox, live mapping
  replacement and separate touchpoint short labels/token colors. Mapping updates
  preserve the loaded graph object and all interaction state.
- Changed modules/interfaces: viewer `ScreenshotMap`, screen queries/transitions,
  `ViewerSnapshot.lightbox`, `ViewerNavigation.hoverOccurrence`, optional media
  and presentation props, `JourneyScreens`, `JourneyLightbox`, and named image/
  modal browser adapters; design-system `ScreenImage`, `ScreenPreview`,
  `ScreenLightbox`, row/inspector content slots and multi-touchpoint headers;
  DTCG category/scrim/screen-size tokens; explicit example inputs, development
  stories, readonly/unit/browser checks and documentation.
  Static `JourneyHierarchy` and existing stage-6 transition APIs remain intact.
  Data/lint packages, application source, canonical UJG bytes, `baseline.json`,
  dependency manifests and lockfile remain unchanged.
  `BASELINE.md` prose was updated to record the completed asset copy.
- The viewer owns its Storybook and UJG examples. It may reuse the design system's
  internal Storybook configuration/catalog in development. The design-system
  package retains its independent Storybook and imports no viewer/UJG code.
- **Only the user may commit.** Leave implementation and documentation changes
  uncommitted for review. This overrides earlier checkpoint commit instructions.

## Fixed architectural constraints

1. Parsing handles syntax; checking uses explicitly injected rules; reporting
   belongs to the application. Native `JSON.parse` is sufficient for the agreed
   compact JSON-LD input. Parsing must not validate, normalize, or return findings.
2. Canonical UJG data remains the source of truth. No normalized domain model,
   registry class, or mirrored hierarchy graph. Derived lookups may reference
   original nodes without copying or owning domain data.
3. Queries and state transitions are pure. UI state consists of local immutable
   snapshots. Derived values are computed rather than synchronized in stores.
4. Components receive data and callbacks. File reading, image loading, DOM
   measurement, and scrolling stay at browser/application boundaries. Refs must
   not hide mutable business state. Static and interactive presentations have
   distinct contracts; do not use mode flags that silently ignore supplied props.
5. The design system owns component data contracts. Fixture generation and fixture
   checking are separate operations. Generation must not invoke checking.
6. Extensions use explicit functions/components and readonly configuration. No
   plugin runtime, event bus, service container, discovery, or mutable registry.
7. Planned packages: `@journey-viewer/ujg-jsonld`, `@journey-viewer/lint`,
   `@journey-viewer/design-system`, and `@journey-viewer/viewer`. Add each package
   when its stage starts. Generic helpers stay with their owners.
8. The viewer uses UJG queries and design-system components. Parsing and rendering
   never depend on lint. The design system has no UJG or viewer dependency.
   Packages never import application code.
9. DTCG tokens own shared design values. Tailwind utilities and component styles
   consume their generated output. Shared controls, typography, and surfaces have
   one primitive owner; composed components reuse that implementation. This
   ownership rule applies to the design system, viewer, and application.

## Scope and defaults

Create an independent repository under the Journey Viewer brand. Preserve the
current hierarchy layout and behavior; leave the original repository working.
The final application includes a landing page, the Solid-OIDC example, local-file
loading, and a separate Cloudflare static deployment.

V1 supports self-contained canonical compact UJG Editor's Draft JSON-LD, including
Core/Graph/Surface data, entry indexes, multiple roots and child journeys, and
repeated/recursive references. Do not invent topology or turn the source graph
into a single-parent tree.

Packages remain private but independently consumable, with built ESM, declarations,
and compiled CSS. Storybook is internal. YAML, path discovery, browser/surface
resolution tooling, remote context/import fetching, and local-file persistence
remain outside this extraction. Stage 11 prepares deployment without publishing
packages or changing the existing site.

## Stages

| Stage | Deliverable | Acceptance gate |
| --- | --- | --- |
| 1. Repository and baseline | Standalone pnpm workspace, minimal web app, build configuration, plan, behavior capture, and committed OIDC JSON-LD. | Fresh install and app build; recorded 10/47/120/37 baseline; source repository unchanged. |
| 2. UJG data access | Readonly canonical types and pure queries for node lookup, journey membership, entries, exits, child journeys, and touchpoints. Native JSON parsing. | Minimal fixtures and OIDC work; frozen inputs unchanged; no validation, findings, inferred topology, or alternate graph representation. |
| 3. Independent linting | `lint(value, rules)` with separately exported document-shape and reference rules; rule selection outside the runner. | Rules handle malformed structures independently; injected lists change checks; findings never modify data. Rule order establishes no prerequisites. |
| 4. Design-system foundation | DTCG-driven tokens, scoped themes, shared reusable primitives, mobile-first hierarchy compositions, readonly contracts, deterministic fixtures, separate checks, internal Storybook. | Shared styles have one primitive owner and are reused; token generation, theming, responsive behavior, contracts, fixture checks, package/CSS and Storybook builds pass the detailed gates below. |
| 5. Static hierarchy | Viewer package renders journeys, states, entries, exits, and nested composition directly from UJG queries; add required presentational components. | OIDC structure matches the baseline; multiple roots/children and recursive references are handled explicitly; no persistent hierarchy model or interaction store. |
| 6. Selection and inspection | Immutable selection/expansion transitions and inspector, connected through explicit data and callbacks. | Interactions work with frozen-input transition tests; viewer instances are independent; document replacement resets interaction state. |
| 7. Navigation controls | Overview/focus switching, search, touchpoint filtering, entry/exit navigation; derive highlights, breadcrumbs, summaries. | Existing behavior and nested boundaries are preserved; no derived-data synchronization or mutable cache. |
| 8. Screens and presentation | Previews/lightbox with a separate replaceable surface-ID-to-screenshot JSON document; explicit OIDC assets, colors and short labels. | All 37 screens resolve; replacing screenshot mappings updates previews/lightbox without replacing UJG or resetting interaction; missing images and keyboard navigation work; no OIDC filenames or ID guessing in reusable code; DOM effects isolated. |
| 9. Build-time extensions | Readonly descriptors for inspector panels, annotations, and rendering overrides; parser/view selection stays explicit in the app. | Small custom panel and annotation work without changing built-ins; removal restores defaults; no registration, lifecycle, or shared runtime state. |
| 10. Standalone application | Journey Viewer brand, landing page, catalog, routes, local-file loading, finding presentation; compose reading/parsing/checking/rendering explicitly. | OIDC and local files open; syntax failures/findings displayed separately; blocking policy only in app; no upload/persistence. Routes: `/`, `/examples/solid-oidc`, `/viewer`. |
| 11. Distribution and Cloudflare | Finish independent ESM/declaration/CSS exports and app-local Cloudflare config; separate package/app builds, Storybook, and deploy commands. | External-consumer smoke check; Cloudflare dry run and deep-link refresh; no development fixtures/Storybook in deployment; no package publication. |

## Stage-8 refinement: independent screenshot document

Agreed before Stage-8 implementation: screenshots are a separate input owned by
the caller. Start with a plain JSON object whose keys are exact UJG `Surface`
IDs and whose values are screenshot paths or URLs:

```json
{
  "urn:ujg:solid-oidc:app-sign-in-required-surface": "./screens/app-sign-in-required.png",
  "urn:ujg:solid-oidc:app-logged-in-surface": "./screens/app-logged-in.png"
}
```

- Keep this document independent of canonical UJG JSON-LD and the captured
  provenance/baseline. Do not add screenshot URLs to UJG nodes or interpret the
  baseline's migration records as runtime configuration. Keep colors and short
  labels separate from this screenshot-only input. No version envelope, JSON-LD
  context, asset registry or extensible configuration runtime is needed initially.
- Resolve graph nodes to their explicitly associated UJG surfaces, then look up
  each exact surface ID in the supplied map. Do not derive filenames or surface
  IDs from state IDs, labels, naming conventions or OIDC-specific logic. One
  screenshot path per surface is sufficient for the initial contract.
- File reading, native JSON parsing and relative-path/base-URL resolution belong
  to the caller/browser boundary. Paths use an explicit asset or mapping-document
  base, independently of the UJG document's location. Reusable queries receive
  readonly data; they do not fetch files, discover assets or watch the filesystem.
- The viewer receives the screenshot map as a separate readonly prop. Callers
  can replace that prop while the same UJG object stays loaded. Preview, inspector,
  search availability and lightbox resolve against the latest supplied map;
  no screenshot URLs or derived screen catalog are synchronized into interaction
  state. An open screen is identified by surface ID rather than a captured URL.
- A mapping-only update preserves selection, expansion, focus, search and filters.
  An open lightbox uses the updated path for the same surface. Removal of a mapping
  or an image-load failure produces an explicit unavailable presentation, without
  displaying a stale screenshot or inventing a replacement association.
- Updating image content at an unchanged URL is a caller/browser cache concern.
  The caller may supply a changed URL (including a query revision or blob URL)
  through the same map. Add no implicit cache-busting or file-watching service.
- Stage-8 verification must demonstrate live map replacement, path replacement
  for an already open screen, mapping removal and independent viewer instances,
  alongside the existing 37-image, missing-image and keyboard gates. Native
  document-object replacement retains its existing full interaction reset policy.

This refinement was agreed before implementation. Stage 8 follows it through
separate readonly props and caller-owned path resolution. Its implementation and
verification evidence are recorded below. The canonical UJG and baseline capture
remain independent of the new screenshot/presentation inputs.

## Stage-4 refinement

Keep the architectural boundaries from stages 1-3. Implement stage 4 in the
following order and complete its gates before beginning the viewer. Verification
results belong in the stage-4 evidence section below.

### 1. DTCG tokens and generated styles

- Author foundation and semantic light/dark tokens in DTCG 2025.10 JSON. Capture
  the existing hierarchy appearance first, including its currently separate
  palette. Include spacing, sizing, fonts, typography, colors, radii, borders,
  and effects actually needed by the initial components.
- DTCG files are the editable source. Deterministic build-time translation emits
  namespaced CSS variables and a Tailwind theme bridge. CSS modules and utility
  classes use the same values. Keep translation local to the package and support
  the token types used here; introduce no runtime token model or theme registry.
- Check token shapes and references separately from generation. Document the
  supported DTCG authoring subset. Invalid or unsupported inputs must not silently
  produce partial CSS. Generated outputs contain no hand-maintained token values.
- Select themes at an explicit container boundary using a theme attribute. Light
  and dark themes can coexist and nest. Additional themes provide the same semantic
  keys and may vary colors, fonts, and spacing. Theme selection belongs to callers.
- The compiled component stylesheet provides the required component styling
  without requiring consumers to run Tailwind. Global document resets are opt-in.

### 2. Shared primitive catalog and ownership

Establish and document these primitives before writing hierarchy compositions:

| Primitive | Owns | Reuse requirement |
| --- | --- | --- |
| `Button` | Native button semantics, shared sizing, typography, tones, disabled/hover/active/focus states, and hit areas. | All button controls compose this implementation. Variants cover real visual differences; callers supply content and layout. |
| `IconButton` | Accessible icon-only button contract and icon layout. | A thin composition of `Button`; inherits its interaction, sizing, and focus styling. |
| `Heading` | Heading typography and native heading levels. | Visual size is independent of semantic level; journey and section titles reuse it. |
| `Text` | Shared body, label, caption, and code typography roles. | Compositions select a documented role instead of recreating font declarations. |
| `Badge` | Non-interactive compact labels/counts and their shared presentation. | Interactive chips use `Button`; badge markup does not acquire button behavior. |
| `Surface` | Shared background, border, radius, and elevation variants. | Cards and panels compose it instead of restating their common surface styles. |

- Each primitive owns its readonly contract, implementation, styles, stories, and
  public export. Use direct functions and components, with a small explicit set of
  variants. Keep contracts next to their owners; add no component factory,
  universal rendering configuration, or style registry.
- Initial hierarchy compositions are `TouchpointDot`, `JourneyHead`, `JourneyCard`,
  and `StateRow`. They own arrangement and journey-specific decoration, and receive
  explicit presentation data, callbacks, and children. They reuse the primitive
  catalog and do not perform graph queries or recursive hierarchy construction.
- Component-specific CSS may define layout, composition, and distinct decoration.
  Shared button behavior, typography roles, and surface styling remain with their
  primitive owners. A new shared visual treatment extends the appropriate owner.
- Add later primitives when a concrete stage needs them. Use CSS layout/utilities
  directly where an extra component would only wrap a div.

### 3. Colocation and mobile-first behavior

Use `src/components/Component/Component.tsx`, `Component.module.css`, and
`Component.stories.tsx`. Preserve the existing singular `.module.css` convention.
Colocate `Component.fixtures.ts` and `Component.checks.ts` where relevant.

- Base styles serve mobile. Named minimum-width breakpoints enhance the layout.
  Start with the existing hierarchy thresholds as shared DTCG dimensions:
  `md = 53.75rem` and `lg = 68.75rem` (860px/1100px with a 16px initial font size).
  Reset unused Tailwind default breakpoints and use this same generated set in
  modules and utilities. Add a breakpoint only when a concrete layout needs it.
- Breakpoint values are build-time constants shared by all themes. Components
  introduce no private viewport thresholds or JavaScript breakpoint state.
- Long content wraps; controls work without hover and keep visible keyboard focus.
  Provide mobile hit areas while preserving the existing compact desktop layout.

### 4. Fixtures, Storybook, and build boundaries

- Fixture generation is a pure operation returning readonly component data only.
  Separate checks inspect it against the owner component's contract. Neither
  generation nor rendering invokes checking. Use explicit component fixture
  functions rather than a fixture registry or a generated hierarchy model.
- Storybook lives inside the design-system package and renders components directly.
  Include a primitive catalog, hierarchy composition stories, token documentation,
  theme comparisons, and long-content/mobile cases. Story controls own any demo
  interaction snapshots; production components use explicit props and callbacks.
- Expected changes: add `packages/design-system` (tokens, build/check scripts,
  styles, colocated components/fixtures/checks, tests, and `.storybook`), root
  commands/catalog/lockfile, README, and this plan. Existing data/lint packages,
  web app, OIDC capture, and source repository remain unchanged in this stage.
- Provide separate token checking/generation, fixture checking, package/CSS build,
  Storybook development/build commands. Fixtures, checks, stories, and Storybook
  dependencies stay outside production exports/output.

### Acceptance gates and required evidence

| Gate | Evidence required to close stage 4 |
| --- | --- |
| Token ownership | Changing a source token changes both utility output and component styling. Repeated generation is identical. Required semantic keys are independent of theme order; missing keys in the first or only theme are detected. Separate checks catch malformed values and broken references, and foundation findings are emitted once. |
| Primitive reuse | Stories document every primitive and supported variant. Source review confirms a single native button implementation, reused by `IconButton` and other controls, and shared owners for heading/text/surface styles. Compositions contain no copied primitive interaction or typography recipes. |
| Theming | Browser stories demonstrate light/dark side by side and nested boundaries. An additional development theme varies color, font, and spacing through token configuration without editing component logic. |
| Responsive behavior | Browser checks at 320px and immediately below/at/above both named thresholds show wrapping, usable controls, and no page overflow. Modules and utilities use the same breakpoints. |
| Component boundaries | Every primitive and hierarchy composition renders from readonly presentation props without UJG/viewer/application imports, shared stores, or graph context. |
| Fixture separation | Deterministic generators accept frozen inputs without mutation. Separate checks accept valid fixtures and reject malformed data and cross-field violations, including expanded non-composite rows. Generation and rendering never import checks. |
| Accessibility and visual states | Controls expose accessible names, native keyboard behavior, visible focus, and usable mobile hit areas. Entry/exit explanations appear in the accessibility tree; a visible touchpoint caption is announced once. Row labels inherit their button hover/active/selected colors. Heading semantics are independent of visual sizes. |
| Build isolation | Independent ESM/declaration/CSS and Storybook builds pass. A browser story renders the built components with compiled CSS and no consumer Tailwind processing. Production output excludes stories, fixtures, checks, and Storybook. |
| Regression | All existing tests and app builds pass. The original repository and captured OIDC baseline remain unchanged. Record commands and browser evidence here and leave changes uncommitted for user review. |

References for implementation: [DTCG 2025.10 format](https://www.designtokens.org/tr/2025.10/format/),
[Tailwind theme variables](https://tailwindcss.com/docs/theme),
[shared responsive variants](https://tailwindcss.com/docs/responsive-design), and
[CSS module references](https://tailwindcss.com/docs/functions-and-directives#reference-directive).

## Checkpoint procedure

Implement **one stage per implementation request**.

At the start of each stage:

1. Read this plan and inspect the working tree.
2. Identify the deliverable and acceptance gate.
3. List the specific modules/interfaces expected to change.

At completion:

1. Run checks appropriate to that stage.
2. Review the diff against the fixed constraints.
3. Record completed work, evidence, unresolved issues, and the next stage here.
4. Leave one stage's scoped changes uncommitted and report their outcome. Only
   the user may create commits; do not stage files or change git history.

Work discovered for later stages goes in the stage list. Call out changes to
agreed responsibilities or public interfaces before implementing a different
architecture. A failing acceptance gate keeps the current stage open.

## Stage-1 evidence

- Original source: `journey-graph`, commit
  `6d9deaf0b57ba59fc22d232ca25bc999e1ce365e`.
- Existing hierarchy checks: 3 files, 29 tests passed on 2026-10-19 (model, store,
  and preview placement).
- One-time export uses the source repository's existing exporter. The new
  repository has no runtime/build dependency on that exporter or its YAML parser.
- Export and source checksums, counts, root/initial selection, and the 37 PNG
  source asset identities/checksums are recorded in the OIDC capture. Screen
  images and runtime presentation configuration are deferred to stage 8.
- Fresh installation: removed both workspace dependency directories and the web
  build output, then ran `pnpm install --frozen-lockfile` successfully (24 packages,
  unchanged lockfile). Dependencies use registry package versions, with no links
  to the source repository.
- `pnpm build:app`: passed TypeScript checking and Vite production build after
  that clean installation. `pnpm build` also passed for all current workspaces.
- `pnpm test`: 3 baseline regression checks passed (export checksum/identity,
  10/47/120/37 counts, and representative root/entry/exit contracts).
- Production HTTP smoke: HTML returned 200 with the Journey Viewer title; its
  JavaScript bundle returned 200. The temporary loopback server was stopped.
- Installed dependency inventory: no YAML parser, Zustand, Storybook, Wrangler,
  or source-workspace packages. Only the minimal app's dependencies are installed.
- Source repository working tree: clean at the same pinned commit after the
  export and checks. No source changes were needed.

## Stage-2 evidence

- Added `@journey-viewer/ujg-jsonld`: readonly Core/Graph/Surface document/node
  types and ten pure query functions. The package exports built ESM/declarations
  and has no runtime dependencies; TypeScript is its only development dependency.
- Public queries cover identity/type selection, explicit journey membership,
  entries (including entry indexes), states, transitions, exits, child journeys,
  journey touchpoints, and graph-node surfaces. Results reference original nodes.
  Global selections retain source-node order; reference selections retain list
  order. Unresolved/differently tagged targets are omitted from query results,
  without editing the source references or producing findings.
- `pnpm test`: 13 package tests plus the 3 unchanged OIDC baseline tests passed.
  Package tests import its built public ESM export, use deeply frozen minimal and
  OIDC fixtures, and cover multiple/reused/recursive child references, entry
  indexes, optional Core-only collections, untyped/unknown nodes, opaque JSON,
  deterministic results, and the original 10/47/120/37 counts.
- Compile-only readonly checks passed for document identity/collections,
  reference arrays, typed query results, children, and opaque extension payloads.
- `pnpm build`: package declarations/ESM and the unchanged web app both built.
- `pnpm install --frozen-lockfile`: passed. The lockfile only adds the new
  workspace's existing TypeScript catalog dependency; no new dependency versions.
- The web app, committed OIDC example, original source repository, and stage-1
  baseline remain unchanged. No parser wrapper, validator, findings, inferred
  topology, index/store class, or alternate graph representation was added.

## Stage-3 evidence

- Added `@journey-viewer/lint`, with no runtime or workspace dependencies. Its
  main export is a pure synchronous `lint(value, rules)` function plus readonly
  `Finding`/`Rule` types. The runner only concatenates supplied rule outputs;
  it has no default rules, exception conversion, short-circuiting, or reporting.
- Findings carry rule identity, an original-input property/index path, and a
  message. Severity and blocking decisions are caller policy. No validated
  document or alternative graph representation is produced.
- The separate `/ujg` export supplies three independent rules: `documentShape`,
  `uniqueNodeIds`, and `referenceTargets`. They inspect raw parsed data directly
  and safely skip inapplicable/malformed slots without calling another rule or
  depending on a previous result. Reference checks use exact source node IDs and
  supported target classes, including ambiguous and missing targets.
- `pnpm test`: 17 new runner/rule tests, the 13 unchanged data-query tests, and
  the 3 unchanged OIDC baseline tests all passed (33 total). Tests cover custom
  injection, empty lists, error propagation, malformed roots/nodes/refs, locations,
  known target classes, duplicate identities, reordered rules, unknown payloads,
  and deterministic results on frozen OIDC data. All three UJG rules return no
  findings for the captured OIDC export, without altering it.
- Compile-only checks passed for readonly findings/locations/results/rule lists,
  required explicit rule injection, and generic input compatibility.
- `pnpm build`: all three packages/app workspaces built, including ESM and
  declarations for the new package. The existing web bundle is unchanged.
- The lockfile only adds the lint workspace's existing TypeScript catalog
  dependency; it introduces no new dependency versions or schema/RDF library.
- The data-query package, web source, OIDC capture, and original source repository
  remain unchanged. No parsing, rendering, I/O, registry, repair, or input
  mutation was added to the lint runner/rules.

## Stage-4 evidence

The following records the initial checkpoint. Correction verification is recorded
separately below.

- Added `@journey-viewer/design-system`, with React as its only runtime peer.
  Six shared primitives (`Button`, `IconButton`, `Heading`, `Text`, `Badge`,
  `Surface`) own repeated control, typography, and surface styling. Four hierarchy
  compositions reuse them: `TouchpointDot`, `JourneyHead`, `JourneyCard`, `StateRow`.
  Source checks confirm one native button implementation and primitive reuse.
- All ten components have colocated implementation, CSS module, Storybook,
  fixture generation, and fixture checking files. Public contracts are readonly;
  rendering receives data/callbacks/children without graph context, checking,
  effects, or owned interaction state. No UJG/viewer/application imports exist.
- DTCG foundation/semantic files drive production light/dark themes, namespaced
  CSS variables, and Tailwind sizing/color/font utilities. Checking and translation
  are separate pure functions, with file access in CLI scripts. The build composes
  checking before generation. Unsupported authoring features are reported rather
  than silently accepted; the documented subset is not a full DTCG implementation.
- Shared `md = 53.75rem` and `lg = 68.75rem` breakpoints drive both modules and
  utilities. Theme boundaries redeclare semantic values and provide inherited
  fonts/colors/backgrounds; nested and simultaneous themes work. An internal
  alternate theme demonstrates independent font/color/spacing configuration.
- Presentation adjustments: mobile/coarse-pointer hit areas are at least 44px,
  while fine-pointer desktop sizes stay compact (30px/36px). Subtle light-theme
  text is slightly darker than the original faint text for readability. Long
  labels wrap and mobile descriptions follow the source hierarchy's hiding rule.
- `pnpm install --frozen-lockfile`: passed in the destination with a fresh root
  dependency directory (191 packages, unchanged lockfile). An incomplete link
  from the initial incremental install was resolved by recreating `node_modules`.
  Dependency versions remain pinned; Storybook/Tailwind/Playwright are development
  dependencies and are absent from the library runtime output.
- `pnpm test`: 22 new design-system tests, 17 lint tests, 13 data-query tests, and
  3 baseline tests passed (55 total). Tests cover native semantics, controlled
  rendering, primitive ownership, frozen deterministic fixtures, independent
  malformed-fixture checks, token references/types/theme keys, deterministic
  translation, and production export isolation. Compile-only readonly checks and
  all ten fixture contract checks passed independently.
- `pnpm build`: every current package and the unchanged web app built. Package
  ESM is about 5.8 kB and component/theme CSS about 9.8 kB before gzip; React is
  external. ESM, declarations, compiled styles, tokens, optional Tailwind bridge,
  and opt-in document reset have separate exports. Production output excludes
  stories, fixtures, checks, alternate themes, and Storybook.
- `pnpm build:storybook`: passed with 26 stories, including all primitives and
  hierarchy compositions, variants, controlled composition, token docs, theme
  comparisons, and a compiled-consumer iframe. The consumer is typechecked and
  built directly from `dist` without a Tailwind plugin or source alias.
- `pnpm test:design-system:browser`: six Chromium acceptance checks passed in
  the destination. They cover independent/nested themes, 320px and 859/860/861px
  plus 1099/1100/1101px boundaries, long content/no page overflow, module/utility
  breakpoint agreement, 44px coarse-pointer targets, native keyboard activation
  and focus, disabled/form behavior, independent controlled demo snapshots, and
  every story loading without page errors. Changing source DTCG values changes
  both primitive styling and utility output in the browser, including typography.
- Browser screenshots were inspected and remain in ignored development output:
  `packages/design-system/.test-output/stage4-mobile.png` and
  `packages/design-system/.test-output/stage4-themes.png`. Test browsers and the
  temporary local server are closed by the test runner.
- The original repository remains clean at
  `6d9deaf0b57ba59fc22d232ca25bc999e1ce365e`. Data/lint packages, web source, OIDC
  capture, and the 10/47/120/37 baseline remain unchanged. The web bundle remains
  `index-Dzl6dVgS.js`; no viewer, routing, deployment, or example-specific
  presentation configuration has been introduced.
- Updated this plan and `AGENTS.md` to require user-only commits. All stage-4
  changes remain unstaged and uncommitted; repository HEAD is still
  `659a8b2668dbc243bfa8a2789bcecbf94111423c`.

## Stage-4 corrections and re-verification

- Addressed the review in the Journey Viewer working tree. No later stage started,
  no dependencies were added, and no files were staged or committed.
- `Badge` now exposes its explanatory label as visually hidden text and hides its
  visual glyphs from the accessibility tree when a label is supplied. Entry/exit
  counts use singular/plural spoken labels. Native span attributes are explicitly
  included in its readonly contract and forwarded; an explicit tooltip is retained.
- Default `Text` color inherits from its parent, so row-label hover, active, and
  selected colors follow `Button`. Explicit semantic tones remain independent.
- `TouchpointDot` has a readonly `decorative` option. `JourneyHead` uses it beside
  the visible caption; standalone dots remain named. Shared class composition
  no longer adds empty class segments.
- The explicit readonly 54-key semantic contract in `tokens/semantic-keys.mjs`
  drives both checking and the Tailwind bridge. First/only incomplete themes are
  detected, and reordering themes does not change the bridge. Foundation
  authoring/value checks run once, with findings at their original source paths.
- Alias parsing requires a complete brace-delimited reference. Literal font names
  containing braces and CSS punctuation are quoted safely; generic CSS font
  families remain unquoted. Documentation explicitly states that foundation
  values are build-time data and only semantic CSS variables are public.
- Fixture checking rejects expansion without a composite, without changing or
  checking generation/rendering. The existing mobile rule hiding descriptions is
  retained, including its effect on the accessible button name.
- Re-ran `pnpm test` in the destination: 31 design-system tests, 17 lint tests,
  13 query tests, and 3 baseline tests passed (64 total). Readonly compile checks
  and the independent ten-component fixture checks passed. New regressions cover
  accessible label markup, decorative dots, native attributes, class composition,
  cross-field fixture rules, incomplete first/only themes, ordering independence,
  one-time foundation findings, and literal font serialization.
- Re-ran `pnpm build` successfully. Current design-system output is about 6.3 kB
  ESM and 10.0 kB CSS before gzip, with React external. The web bundle remains
  `index-Dzl6dVgS.js`.
- Re-ran `pnpm build:storybook` successfully and read its generated index: exactly
  26 stories. Re-ran `pnpm test:design-system:browser`: all eight Chromium checks
  passed. The new browser regressions inspect real accessibility-tree text and
  computed row-label colors for hover/active/selected states in all three themes.
  Previous responsive, keyboard, theme, consumer and story-loading checks passed.
- Updated the acceptance gates to require these accessibility, visual-state,
  semantic-key and fixture-invariant checks. Stage 5 remains unstarted; all
  corrections remain unstaged and uncommitted for user review.

## Stage-5 evidence

This records the initial implementation. The corrections below supersede its
static-mode and local traversal-set implementation details and verification counts.

- Added `@journey-viewer/viewer`, with built ESM/declarations and a separate
  compiled layout stylesheet. It depends on the UJG query and design-system
  packages, with React as a peer. Its only public component is `JourneyHierarchy`;
  its readonly props are `document` and optional semantic heading `level`.
- Rendering uses original canonical nodes returned by queries. Explicit journey
  state membership and every child-reference occurrence retain source order.
  Multiple children and repeated journeys render at each call site. No parent
  assignment, normalized hierarchy graph, persistent cache, context, interaction
  store, effects, I/O, parsing, or lint dependency was introduced.
- Roots are journeys not referenced by the explicit composite states belonging
  to journeys. Unowned composites do not establish parentage. Local reference
  sets select roots and determine reachability for each render, without retaining
  another graph. Journeys unreachable from roots appear in an explicit
  “Journeys without a root” group, each as a separate starting point. This makes
  disconnected cycles visible without inventing a root. Recursion stops only at
  a repeated journey in the current ancestry and renders a labeled reference;
  other paths still render normally.
- Added design-system `JourneyContracts`, with readonly entry/exit presentation
  arrays, explicit default markers, named noninteractive lists, and empty states.
  It composes `Badge`/`Text`, with colocated CSS, stories, deterministic fixtures,
  and independent checking. `StateRow` gains an opt-in static presentation using
  labels and decorative carets; its existing controlled button mode is unchanged.
  Fixture checking includes the static flag and rejects conflicting defaults.
- Root cards and nested journey headings reuse the shared compositions. Each
  journey displays its own entries/exits/default and all explicit touchpoint
  labels. State marks count local entries naming that state and listed exits
  reached by explicit local transitions, without transitive boundary inference.
  Labels fall back to full IRIs where optional. Entry indexes do not manufacture
  journey membership or root declarations. Screenshot colors/short labels,
  selection/expansion, navigation and inspector behavior remain in later stages.
- `pnpm install --offline` and `pnpm install --frozen-lockfile --offline` passed.
  The lockfile adds only the viewer workspace, linking the two existing packages
  and reusing catalog tooling; it adds no dependency versions.
- `pnpm test`: **75 tests passed** (35 design-system, 17 lint, 13 UJG query,
  7 viewer, and 3 captured-baseline checks). Readonly compile checks and all
  11 independent component fixture checks passed. Frozen-input rendering tests
  cover the complete OIDC hierarchy, multiple roots/children, repeated references,
  self/mutual recursion, disconnected cycles, unowned composites, empty/unresolved
  references, explicit defaults, scoped boundary marks, stable rendering, and
  independent inputs. Existing 10/47/120/37 data counts remain unchanged.
- `pnpm build` passed for every package and the web app. Viewer output is about
  4.4 kB ESM and 0.3 kB CSS before gzip, with React and workspace dependencies
  external. Production output excludes tests, fixtures, preview, Storybook, and
  example data. The web bundle remains `index-Dzl6dVgS.js`.
- `pnpm build:storybook` passed with **30 stories**, including the new static row
  and default/empty/long-contract stories. `pnpm test:design-system:browser`
  passed all **8 Chromium checks**, preserving themes, primitive interaction,
  keyboard focus, accessibility, shared breakpoints and compiled-consumer behavior.
- `pnpm test:viewer:browser` passed all **4 Chromium checks** against a compiled
  consumer with no Tailwind processing or source aliases. The browser verifies
  all **10 journeys, 47 states, 20 entries and 24 exits**, each journey's exact
  explicit membership order, and the SMS scope beneath its three ancestors.
  It also verifies reuse/cycle notices, accessible entry/exit lists and default
  explanations, the absence of inactive controls, independent light/dark themes,
  and no page/hierarchy overflow at **320, 859, 860, 861, 1099, 1100 and 1101px**.
- Mobile/desktop screenshots were visually inspected. Evidence remains in ignored
  `packages/viewer/.test-output/stage5-mobile.png`, `stage5-oidc.png` and
  `stage5-dark.png`. The development-only preview is available through
  `pnpm build:viewer` then `pnpm preview:viewer`. Test servers/browsers are closed
  by their runners. The production web app is not wired to the viewer in this stage.
- Diff review and `git diff --check` passed. The original source repository
  remains clean at `6d9deaf0b57ba59fc22d232ca25bc999e1ce365e`; data/lint packages,
  captured OIDC files, and web source are unchanged. No files were staged or
  committed; destination HEAD remains `922f4a9588bbf8111914e76bba1005a31ef0c75a`.
  Stage 5 has no unresolved acceptance failures. Stage 6 remains unstarted.

## Stage-5 corrections and re-verification

- Addressed the review within stage 5. Removed the `static` mode entirely and
  restored all five `StateRow` component/style/fixture/check/story files exactly
  to their stage-4 versions. No selection/inspection or other stage-6 work began.
- Added the separate design-system `StateSummary` component with only readonly
  `label`, `entryCount`, `directExitCount` and nested `children`. It uses `Text`
  and `Badge`, always renders supplied content, and has no mode, composite,
  expansion, selection, filtering or callback props. Its colocated fixtures and
  independent checks reject extra properties. Compile-only regressions reject
  interaction props on summaries and the removed mode on `StateRow`.
- The viewer composes `StateSummary` directly. Replaced the mutable reachability
  set/work queue with pure reductions carrying readonly reference arrays; no
  `.add`, `.push`, `.pop`, flags, retained cache or store is used for traversal.
  Contract fixture checks likewise compose returned findings without accumulating
  them through array mutation. Query results still reference original nodes.
- Journey wrappers are plain containers; their headings remain semantic and
  named region landmarks are no longer generated for every journey. Contract
  groups use native description-list terms with entry/exit lists as definitions,
  eliminating repeated visible/ARIA captions without IDs or state hooks.
- Direct-exit meaning is now explicit in the visible hierarchy caption and in
  each count's accessible explanation/tooltip. Reference-occurrence keys remain
  deliberate: repeated references are preserved; independent linting owns source
  identity findings. Large-document cost and individual touchpoint identity are
  recorded as deferred work below, without adding caches or filtering here.
- Re-ran `pnpm test`: **77 tests passed** (37 design-system, 17 lint, 13 data-query,
  7 viewer and an explicit **3/3 baseline pass**). Readonly compile checks and
  all **12 independent fixture checks** passed. Existing frozen-input, topology,
  recursion, boundary and deterministic-rendering regressions remain green.
- Re-ran `pnpm test:viewer:browser`: all **4 Chromium checks passed**. New
  assertions verify **zero region landmarks**, one announced Entries/Exits term
  per contract group, and precise direct-exit explanations. The same run verified
  **10/47/20/24** rendered journeys/states/entries/exits and source membership
  order, all repeated/cyclic references, light/dark themes, and no overflow at
  **320, 859, 860, 861, 1099, 1100 and 1101px**. Updated mobile and desktop
  screenshots were visually inspected in the existing ignored evidence paths.
- Re-ran `pnpm build:storybook`: **32 stories** built, including the new summary
  default/nested/long-content cases. Re-ran `pnpm test:design-system:browser`:
  all **8 Chromium checks passed**, including controlled `StateRow` interaction,
  keyboard/focus, themes, accessibility, responsive styling and all-story loading.
- Re-ran `pnpm build` successfully for every package/app. The web bundle remains
  `index-Dzl6dVgS.js`. No dependencies were added for these corrections. Data/lint
  packages, web source, captured OIDC files, and the original source repository
  remain unchanged. `git diff --check` passes. All stage-5 work remains unstaged
  and uncommitted; stage 6 remains unstarted.

## Stage-5 viewer Storybook refinement

- Replaced the standalone Vite development preview with viewer-owned Storybook.
  Removed both the viewer `preview` script and root `preview:viewer` alias. The
  current development command is `pnpm storybook:viewer` (port 6007), with a
  separate `pnpm build:storybook:viewer` command. The standalone design-system
  commands remain on port 6006. This supersedes the earlier preview instructions.
- Viewer `.storybook/main.ts` extends the existing design-system configuration,
  adds its catalog under “Design system” and the viewer stories under “Viewer”,
  and serves both built-consumer fixtures. Preview configuration reuses the same
  theme globals, scoped decorators, accessibility settings and layout. The viewer
  Vite configuration reuses the design system's development setup. Nothing is
  imported from the viewer into the design system; runtime/public contracts and
  production component implementations are unchanged.
- Added colocated `JourneyHierarchy` stories for Solid-OIDC, multiple roots and
  recursion, an empty document and a compiled-consumer iframe. Readonly frozen
  demonstration documents and explicit JSON parsing stay in the development-only
  `.storybook/documents.ts` module. Storybook and the smoke fixture share those
  inputs. Heading level is controllable; document editing is excluded from controls.
- `tests/consumer` is retained solely as a build-only ESM/declaration/CSS smoke
  fixture without Tailwind processing or source aliases. Storybook serves it at
  `/viewer-consumer/`; the inherited design-system fixture stays at `/consumer/`.
  Production declaration generation starts at the public entry point and excludes
  stories, Storybook and fixtures. Separate package builds remain available.
- `pnpm install --offline` and `pnpm install --frozen-lockfile --offline` passed.
  Viewer Storybook uses the existing catalog versions as development dependencies;
  no new dependency versions or runtime dependencies were introduced.
- `pnpm test`: **77/77 tests passed**, including 37 design-system, 17 lint,
  13 query, 7 viewer and the explicit 3 baseline checks. All 12 fixture checks
  and readonly compile checks passed. Viewer source, stories and inherited
  configuration also passed TypeScript checking after the final preview change.
- `pnpm build` passed for every package/app; the web bundle remains
  `index-Dzl6dVgS.js`. Output-isolation checks confirm no Storybook/demo modules
  enter the renderer's production exports. No app routes or later stages started.
- `pnpm build:storybook:viewer` built **36 stories: 32 inherited + 4 viewer**.
  `pnpm build:storybook` independently rebuilt the design system's **32 stories**.
  The viewer development server passed the CLI startup smoke test on
  `127.0.0.1:6007` and exited, with no CSF parsing warnings.
- `pnpm test:viewer:browser` passed **6 Chromium checks** against the final built
  Storybook: all 36 stories load without page errors, both consumer iframes work,
  light/dark/alternate globals affect viewer stories, source and compiled OIDC
  retain **10/47/20/24** counts, repeated/cyclic references remain explicit, and
  compiled/source stories wrap at **320, 859, 860, 861, 1099, 1100 and 1101px**.
  The existing accessible-label, contract-term and zero-region checks also pass.
  `pnpm test:design-system:browser` passed all **8 independent regression checks**.
- Storybook mobile/desktop screenshots were visually inspected at ignored
  `packages/viewer/.test-output/stage5-storybook-mobile.png` and
  `stage5-storybook-oidc.png`. Browser runners and the startup smoke test close
  their servers/browsers. `git diff --check` passes; all changes remain unstaged
  and uncommitted. Data/lint packages, web source, OIDC capture and the original
  source repository remain unchanged. Stage 6 remains unstarted.

## Stage-6 evidence

- Started from a clean working tree at user-created commit
  `3754b53f25f3cd83439694949baea89585b3b0c9`. Implemented selection/inspection only;
  stage-7 navigation, search/filtering, breadcrumbs/highlights, screenshot
  resolution, extension descriptors and app wiring remain unstarted.
- Added readonly `ViewerSelection` (`kind`, `journeyRef`, `nodeRef`) and
  `ViewerInteraction` (selection and an expanded-journey ID array), plus the pure
  `createViewerInteraction`, `selectNode`, `toggleChildJourneys`,
  `expandAllJourneys` and `collapseAllJourneys` functions. Frozen inputs remain
  unchanged; no mutable sets, queues, patches, caches, parent maps or hierarchy
  model are retained. Invalid owner/type/ref selections are no-ops. Useful
  selection/expansion no-ops preserve snapshot identity.
- Initial selection follows the first root (or rootless starting point), an
  explicit default entry's member state, then the first member state, then an
  empty journey itself. Empty documents have no selection. The captured OIDC
  default remains `app-sign-in-required` in `app-auth-journey`. Expansion starts
  with all journeys open. Expand/collapse preserves selection; reset restores
  initial selection and expansion.
- Static `JourneyHierarchy` retains its existing readonly contract and output.
  Shared UJG traversal stays in the private `HierarchyTree`, receiving explicit
  presentation callbacks from the static and controlled compositions. Added
  `JourneyExplorer` with required snapshot/selection/disclosure callbacks and
  `JourneyInspector` with an explicit selection. Neither owns React state.
  Recursion, ordering, multiple roots and repeated references remain explicit.
- Expansion follows journey identity within one instance. Disclosure toggles
  the complete child group: any open child can be collapsed; a closed group
  opens every child. Selecting a composite opens all children. Selecting a
  descendant reveals every explicit ancestor path, and the traversal renders
  each open child independently of collapsed siblings. A frozen-input/SSR
  regression covers the multi-child case that previously hid a selected shared
  child when its sibling was closed. No arbitrary parent assignment is used.
- Added `JourneyViewer`, the sole production React state boundary. It keeps one
  readonly local snapshot and the original document reference for replacement
  detection. A changed input object, including one with the same `@id` and same
  node objects, resets state before children render. Stale updaters for replaced
  inputs are ignored. This uses React's documented
  [guarded render-time state adjustment](https://react.dev/reference/react/useState#storing-information-from-previous-renders),
  with no effects, refs, context, subscriptions or global store. Instances sharing
  the same frozen input remain independent.
- Inspection derives local incoming/outgoing transitions, entry start states,
  all explicit child journeys/touchpoints, boundary entry/exit annotations and
  commands, entry call sites and parent continuation handlers. It checks every
  explicit caller rather than inventing one parent. Inspector rows are
  informational; transition navigation and breadcrumbs belong to stage 7.
  Data/lint packages and canonical documents remain unchanged.
- Added design-system `JourneyContractControls` and `InspectorPanel`, each with
  readonly presentation contracts, colocated CSS/stories/fixtures/checks and
  public exports. Static contract lists/rows acquire no mode flags. Controls use
  the existing `Button`/`Text`; the panel uses `Surface`, `Heading`, `Text` and
  `Badge`. Fixture checks cover selected contract identity/kind and malformed
  nested inspector data. Primitive behavior, typography, tokens and surfaces
  retain their original owners. All interaction is explicit data and callbacks.
- The mobile-first viewer layout consumes the design system's public compiled
  Tailwind bridge for the shared `lg` breakpoint. Its build adds only the existing
  catalog `@tailwindcss/vite` development dependency; no versions or runtime
  dependencies were introduced. Consumers import compiled CSS without Tailwind.
  `pnpm install --offline` and `pnpm install --frozen-lockfile --offline` passed.
- `pnpm test`: **97 tests passed** (42 design-system, 22 viewer, 17 lint, 13 query
  and 3 baseline). All readonly compile checks and **14 independent component
  fixture checks** passed. Regressions cover explicit/nonfirst default entries,
  invalid selections, all ancestor paths, all child groups, partial sibling
  expansion, self/mutual recursion, stable no-ops, frozen independent snapshots,
  all parent call sites, explicit exit handlers and controlled rendering without
  callback invocation. Production-boundary checks permit React state only in
  `JourneyViewer`, and continue excluding effects, refs, context, I/O and lint.
- `pnpm test:viewer:browser` passed all **10 Chromium checks** against the final
  built renderer/Storybook. Tests verify native Enter/Space selection/disclosure
  and visible focus; state/journey/entry/exit inspection; expand/collapse/reset;
  independent instances; same-ID, empty and different-document replacement;
  repeated/recursive child groups; source and compiled consumers; and preserved
  static **10 journeys / 47 states / 20 entries / 24 exits**. No overflow occurs
  at **320, 859, 860, 861, 1099, 1100 and 1101px**; viewer columns use the same
  `lg = 68.75rem` threshold as the design system. The six existing stage-5 checks
  remain green, including accessible contract terms and inherited themes.
- Viewer Storybook built and loaded **53 stories**: **38 inherited + 15 viewer**.
  The new examples cover controlled exploration, each inspector selection kind,
  independent viewers and same-ID replacement. `pnpm build:storybook` independently
  built **38 design-system stories**. `pnpm test:design-system:browser` passed all
  **8 Chromium checks**, preserving the existing controlled row, keyboard/focus,
  typography colors, theme/token, responsive and package-consumer behavior.
- `pnpm build` passed for all packages/app. Viewer output is about **14.0 kB ESM**
  and **0.7 kB CSS** before gzip, with React/workspace dependencies external.
  Declarations/CSS exports remain independently consumable; production output
  excludes stories, fixtures, checks and example data. The app bundle remains
  `index-Dzl6dVgS.js`, and the captured **10/47/120/37** baseline is unchanged.
- Mobile/desktop presentation was visually inspected in ignored evidence:
  `packages/viewer/.test-output/stage6-mobile-viewport.png`,
  `stage6-inspector-mobile.png`, `stage6-viewer-viewport.png`, with full viewer
  screenshots alongside them. Test servers and browsers close in their runners.
  `git diff --check` passes; data/lint packages, web source and OIDC capture are
  unchanged. The original repository is clean at
  `6d9deaf0b57ba59fc22d232ca25bc999e1ce365e`. No files were staged or committed;
  destination HEAD remains `3754b53f25f3cd83439694949baea89585b3b0c9`.
  Stage 6 has no unresolved acceptance failures. Stage 7 remains unstarted.

### Stage-6 review corrections

- Documented the referential-stability requirement in `JourneyViewerProps` and
  the viewer README. Inline parsing/reconstruction resets interaction on each
  parent render; callers retain or memoize the parsed input. Object-identity
  replacement and same-ID reset semantics are unchanged.
- Added the readonly `StateRow.notice` content slot for persistent nested
  information, independently of expanded `children`. An empty or entirely
  unresolved composite remains selectable and renders “No child journeys.”
  inside its row container with design-system nesting. It has no disclosure
  control because there is no resolvable child to open. No mode flag, extra
  interaction state or graph logic was added to the design system.
- The private `renderChildren` callback now requires named options with an
  explicit `visibleJourneyRefs` list. Static rendering supplies every child ref;
  controlled rendering supplies expanded refs. There is no implicit `undefined`
  selection meaning “all”; `null` still denotes a non-composite without children.
- Removed the blanket prohibition on local collection construction and mutation
  methods. The boundary check now inspects module scope for mutable bindings and
  retained `Set`/`Map` collections while keeping state hooks restricted to
  `JourneyViewer` and excluding effects/refs/context. Frozen-input transition
  tests still check immutability. No traversal algorithm, cache or persistent
  collection was introduced in these corrections.
- Recorded the shared logical-ID interaction policy, selection retained after
  collapse, stage-7 occurrence-path requirement and ancestor-lookup performance
  cost below. The browser regression explicitly verifies that collapse can hide
  an entry while its inspector selection remains unchanged.
- `pnpm test`: **99 tests passed** (43 design-system, 23 viewer, 17 lint,
  13 query, 3 baseline), including readonly compile and independent fixture
  checks. Added frozen-input/SSR coverage for empty, unresolved and differently
  typed child references, persistent notices and ordinary leaf states.
- `pnpm test:viewer:browser`: **11 Chromium checks passed**, including the new
  empty-composite containment, indentation, selection and collapse regression.
  The final browser script also passed against the built Storybook. Both
  Storybooks build; the viewer loads **55 stories (39 inherited + 16 viewer)**
  and the standalone design system loads **39 stories**.
  `pnpm test:design-system:browser`: **8 Chromium checks passed**.
- Visually inspected the compiled consumer's mobile/desktop empty-composite
  screenshots at `packages/viewer/.test-output/stage6-empty-composites-320.png`
  and `stage6-empty-composites-1280.png`. These are ignored verification artifacts.
  `pnpm build` and `git diff --check` passed. No files are staged or committed;
  stage 7 remains unstarted.

## Stage-7 evidence

- Started from a clean working tree at user-created commit
  `7337595ebc2271e9330f06bb4203584738022d45`. Implemented navigation only;
  screenshots, presentation mappings, extension descriptors, application wiring
  and deployment remain unstarted. No dependencies or packages were added.
- Added readonly `ViewerOccurrence` paths: a root/rootless starting journey and
  ordered state/child query-result indices. Repeated child references at positions
  1 and 3 retain distinct contexts, as do shared children under different roots.
  `getOccurrenceTrail` returns original journey nodes. Traversal and resolution
  terminate at current-path recursion; invalid, unresolved and recursive-terminal
  navigation targets are no-ops. No parent map or alternate graph is retained.
- Added `ViewerSnapshot` / `ViewerNavigation` and pure creation, navigation,
  focus/overview, search-query, touchpoint-toggle and hover transitions. The
  original selection/expansion contracts remain unchanged. `JourneyViewer`
  remains the only production React state boundary and resets the entire
  snapshot on document-object replacement, including same-ID replacements.
  Useful navigation/hover no-ops retain identity; frozen inputs are unchanged.
- `JourneyNavigation`, explorer and inspector remain controlled. Explorer
  selection callbacks now receive explicit occurrence context as a second
  argument; single-argument callers remain compatible. Optional inspector
  navigation couples occurrence context with its callback. Focus shows columns
  along an explicit path, offers every child reference separately and retains
  native horizontal overflow. Breadcrumbs distinguish composite and child
  positions. Overview reuses the existing tree expansion snapshot.
- Search matches labels, full IDs and tags for journeys, states, entries and
  exits, case-insensitively, in traversal order. Blank queries return no results;
  results stop at 18 and preserve distinct occurrences. Enter picks the first
  result; Escape clears. Search picks clear the query and update selection/context.
  Screenshot availability remains scoped to stage 8.
- Touchpoint filters retain individual IDs, including equal labels and multiple
  assignments. Selected IDs use OR; no selection matches every journey. Filtering
  marks each scope's own header/rows/contracts and constrains search, without
  removing boundaries or dimming matching descendants through parent opacity.
  Summaries, breadcrumbs, search results and local incoming/outgoing row marks
  are computed per render. Hover overrides selection and pointer leave restores
  selection-derived marks. No derived values are synchronized or cached.
- Inspector navigation follows explicit local endpoints, entry start states,
  child journeys, `toEntryRef` / `fromExitRef`, every parent call site and every
  continuation handler. Unresolved, wrongly owned and unrelated mappings yield
  no target. Repeated child boundary targets retain their occurrence indices.
- Added design-system `SearchField` with colocated fixtures/checks/stories;
  `StateRow.relation` / `onHover`, local filtered presentation on headers/contracts,
  and the always-rendered `InspectorPanel.children` slot. Controls reuse `Button`,
  typography reuses `Text`/`Heading`, and styles consume existing DTCG tokens.
  No graph queries, viewer dependencies or local state enter the design system.
- `pnpm test`: **112 tests passed** (45 design-system, 34 viewer, 17 lint,
  13 query, 3 baseline). Readonly declaration checks and **15 independent fixture
  checks** pass. New frozen-input/SSR regressions cover repeated call sites,
  rootless cycles, finite occurrence paths, invalid targets, focus/overview,
  search limits, multiple/equal-label touchpoints, summary type overlap,
  hover precedence, explicit entry/exit boundaries and all parent callers.
- `pnpm build`, `pnpm build:storybook` and `pnpm build:storybook:viewer` passed.
  Viewer Storybook builds/loads **63 stories: 42 inherited + 21 viewer**; the
  standalone design-system Storybook independently builds/loads **42 stories**.
  Package boundaries and built ESM/declarations/CSS consumer checks pass, with
  development examples/stories/fixtures/checks excluded from production output.
- Final built-Storybook `pnpm --filter @journey-viewer/viewer test:browser`:
  **17 Chromium checks passed**, including all 11 stage-6 regressions. New checks
  cover native search keyboard/focus, repeated/rootless focus/breadcrumbs,
  touchpoint OR filtering and descendant opacity, explicit inspector navigation,
  hover precedence, independent instances and full navigation replacement/reset.
  Overview and focus wrap without page overflow at **320, 859, 860, 861, 1099,
  1100 and 1101px**; search results also pass at **320px**.
  `pnpm test:design-system:browser`: **8 checks passed**.
  Browser runners used approved local verification servers and closed their
  browsers/servers on completion.
- Visually inspected ignored screenshots under `packages/viewer/.test-output/`:
  `stage7-navigation-320.png`, `stage7-focus-320.png`, `stage7-focus-1280.png` and
  `stage7-search-320.png`. Static OIDC rendering remains **10 journeys / 47 states /
  20 entries / 24 exits**, with the **10/47/120/37** source baseline unchanged.
  The app bundle remains `index-Dzl6dVgS.js`. Data/lint packages, app sources,
  captured OIDC data, dependency manifests and lockfile remain unchanged. The
  original source repository remains clean. `git diff --check` passes; no files
  were staged or committed. Stage 7 has no unresolved acceptance failures.

### Stage-7 review corrections

- Continued the existing uncommitted Stage-7 work in response to review. Applied
  items **1 and 4–7**, documented the policies/costs in **2, 8 and 9**, and kept
  **3 and 10** as explicit nonblocking design follow-ups below. No later stage,
  dependency, cache or additional state owner was introduced.
- Ordinary `navigateViewer` calls now preserve the query. Added the explicit pure
  `pickSearchResult` transition and required `JourneyNavigation.onSearchPick`
  callback for result clicks and Enter. Search picks clear the query only after
  validating selection and occurrence; invalid picks remain no-ops. Row,
  breadcrumb, inspector and scope-focus navigation preserve search text. Valid
  unchanged operations retain snapshot identity, including search picks after
  their query is already clear. Controlled callers must wire the separate actions.
- Occurrence identities still use typed query indices internally. Breadcrumbs,
  search contexts and focus headers now use journey/composite labels. Only
  repeated sibling references get a qualifier such as “reference 2 of 2”; these
  are counts of the same identity, not query or source positions. Distinct sibling
  identities with equal labels include their IDs. Unambiguous child links say
  “Open Other child” instead of “Open child 2”. A fixture with leading unresolved
  state/child references verifies stable, readable disambiguation.
- Touchpoint buttons with equal labels now include their full IDs in visible
  text and accessible names, with separate pressed state and unchanged OR
  semantics. Renamed the reset action to **Reset view**. At the search limit,
  status says **Showing first 18 matches** and asks the user to refine the query.
  Search remains per occurrence; repeated hits can still occupy the result cap.
  The message does not claim there are more matches without checking for them.
- Kept logical-ID selection highlights across reused occurrences; documented
  that breadcrumbs and inspector navigation represent the last chosen call site.
  A browser regression checks all three reused state rows remain pressed while
  breadcrumbs identify the second reference. Documented that snapshot selection
  must use `navigateViewer` / `pickSearchResult`, rather than compose the raw
  interaction-only `selectNode` result with stale occurrence context. Extended
  the deferred performance note to root hover renders, relation scans and
  unbounded no-match search traversal on shared diamonds.
- `pnpm test`: **115 tests passed** (45 design-system, 37 viewer, 17 lint,
  13 query, 3 baseline), including readonly compile checks and the existing
  **15 independent fixture checks**. Frozen-input/SSR regressions now cover
  query preservation versus search picks, invalid/same-selection picks,
  ambiguous roots/states/children, unresolved references, accessible touchpoint
  names and the search-cap message.
- `pnpm build` and `pnpm build:storybook:viewer` passed. The compiled consumer
  still uses built ESM/declarations/CSS. Viewer Storybook builds and loads
  **65 stories: 42 inherited + 23 viewer**, including new equal-label touchpoint
  and capped-result stories. No design-system source changed in these corrections;
  its independent Stage-7 Storybook/browser evidence above remains applicable.
- Re-ran `pnpm --filter @journey-viewer/viewer test:browser` against the final
  built Storybook: **19 Chromium checks passed**. This includes all 17 prior
  checks plus direct-navigation/search-pick separation and a combined review
  case covering equal accessible names, independent touchpoint toggles, search
  limits, unresolved references, readable focus labels and logical-ID highlights.
  Existing responsive checks remain green; the new review cases also fit at
  **320px and 1280px**. Browser/server cleanup remains in the runner.
- Visually inspected ignored `stage7-review-filters-320.png` and
  `stage7-review-contexts-320.png` under `packages/viewer/.test-output/` (desktop
  variants were also captured). Data/lint packages, application source, captured
  OIDC data, package manifests and lockfile remain unchanged; the application
  bundle remains `index-Dzl6dVgS.js`. `git diff --check` passes. All Stage-7 changes
  remain unstaged and uncommitted; Stage 8 is unstarted.

- Guarded `referenceLabel`'s indexed lookup: a missing node now returns an empty
  string instead of relying on a non-null assertion. An isolated check of the
  actual helper verified frozen empty lists, negative/out-of-range/fractional,
  NaN and infinite indices, plus unchanged valid/repeated-reference wording.
  `pnpm --filter @journey-viewer/viewer test` passed **37 tests**, package build
  and TypeScript/readonly checks; `git diff --check` passes. This small Stage-7
  correction remains uncommitted; Stage 8 is unstarted.

## Stage-8 verification evidence

- Implemented only Stage 8, starting from `9a8ef3af57eead9d98780781083cfbadcf78f9e2`
  and the agreed screenshot-document refinement. No later-stage package,
  extension runtime, application loader or deployment work was added.
- Added standalone `examples/solid-oidc/screenshots.json`: **37 exact UJG Surface
  IDs to screenshot paths**. Copied all 37 PNGs into `screens/`; each SHA-256
  matches the original capture. `touchpoints.json` independently provides seven
  short labels and generic DTCG category colors. Runtime code reads no baseline
  migration records and contains no OIDC filenames, ID guessing or path discovery.
  Native parsing and explicit asset-base URL resolution remain in development/
  caller boundaries; the canonical UJG and `baseline.json` remain unchanged.
- Added pure `getNodeScreens`, `getScreens`, `openScreenshot`, `closeScreenshot`
  and `stepScreenshot`, with readonly `ScreenshotMap` and `ViewerLightbox`.
  The lightbox retains surface/target identities only. Gallery derivation uses
  original nodes in source journey/member/surface order, preserving every finite
  call-site context. It matches all **37 source screens**, wraps at both ends,
  skips unmapped paths and keeps failed URLs navigable. Opening a composite's
  image reveals ancestry without opening its children. Ordinary graph navigation
  closes the lightbox; screenshot navigation preserves query/filter/focus mode.
- `JourneyViewer` receives independently replaceable `screenshots` and
  `touchpoints` props. Mapped state rows expose screen actions; selection/hover
  previews, inspector, search availability and lightbox resolve the latest map.
  A mapping/path update preserves selection, expansion, occurrence, focus, query
  and filters. Removal immediately clears stale images; restore/URL replacement
  recovers them. Independent instances remain isolated; same-ID UJG object
  replacement resets all interaction, including the open modal.
- Design-system `ScreenImage`, `ScreenPreview` and `ScreenLightbox` own readonly
  presentation contracts, pure fixtures, separate checks and stories. Existing
  primitives own controls, typography and surfaces. Added always-rendered
  `StateRow.actions` / `InspectorPanel.media` slots, optional multi-touchpoint
  header data, and DTCG category/scrim/screen-size values in all themes.
  The design system imports no UJG/viewer code and owns no browser effects.
- Browser-specific behavior is isolated in `browser/BrowserScreenImage` (per-URL
  loading/error state) and `browser/BrowserLightbox` (native modal ref/effect,
  local keyboard/focus). These adapters receive no document or business snapshot.
  No global listeners, body locks, hidden graph refs, retained catalog or shared
  store were introduced. `JourneyViewer` remains the sole graph-interaction state
  owner; existing static hierarchy and stage-6 transition APIs remain intact.
- `pnpm test`: **126 tests passed** (**49 design-system, 44 viewer, 17 lint,
  13 query, 3 baseline**), including readonly declaration checks and
  **18 independent fixture contracts**. Frozen-input/SSR checks cover exact
  opaque IDs, multiple surfaces, unresolved owners, inherited map keys, explicit
  reused contexts, composite disclosure, wrap/no-op/invalid actions, live map
  derivation and unchanged source data/snapshots. Token checking passes.
- `pnpm build`, `pnpm build:storybook` and `pnpm build:storybook:viewer` passed.
  Viewer Storybook builds and loads **78 stories: 51 inherited + 27 viewer**;
  the independent design-system Storybook builds/loads **51 stories**. Live-map,
  missing-image and several-surface stories use explicit example inputs.
  Both compiled consumer fixtures still import built ESM/declarations/CSS without
  Tailwind processing. Production outputs exclude example images/maps, fixtures,
  stories, checks and development tooling. The app bundle remains
  `index-Dzl6dVgS.js`.
- Final `pnpm --filter @journey-viewer/viewer test:browser`: **25 Chromium
  checks passed**, including all 19 prior checks. New cases verify all 37 PNG HTTP
  responses and native image decodes, source-ordered wrap/selection, arrow keys,
  Escape, forward/reverse Tab wrapping, opener/fallback focus restoration,
  independent live map/path replacement, remove/restore/clear, proper 404 image
  fallback/recovery, same-ID graph replacement, hover/selection previews, search
  availability, short labels/colors, multiple surfaces and second-reference
  context. The test server now reads files before sending successful headers so
  missing assets receive a real 404.
- Previews/lightbox fit at **320, 859, 860, 861, 1099, 1100, 1101 and 1280px**
  without page/dialog overflow; image bounds and containment are checked.
  Visually inspected final ignored `stage8-lightbox-320.png`,
  `stage8-lightbox-1280.png`, `stage8-preview-320.png`,
  `stage8-preview-1280.png` and `stage8-touchpoints-320.png` under
  `packages/viewer/.test-output/`. Visual QA caught and fixed intrinsic image
  cropping; full portrait screens now fit both bounded presentations.
  `pnpm test:design-system:browser`: **8 independent Chromium checks passed**.
  Both runners closed their temporary servers/browsers.
- Static OIDC rendering remains **10 journeys / 47 states / 20 entries /
  24 exits**, with the **10/47/120/37** source baseline unchanged. Data/lint
  packages, app sources, dependency manifests and lockfile are unchanged. The
  original repository remains clean. `git diff --check` passes; no files were
  staged or committed. Stage 8 has no unresolved acceptance failures.

### Stage-8 review corrections

- Adopted the review's explicit call-site labeling option. The gallery retains
  every finite context and uses a **views** counter when surfaces repeat.
  Repeated images additionally show an ordinal such as **2 of 3 call sites**;
  the context caption continues to identify the parent path. Next/Previous and
  wrap update both counts and the actual selected occurrence. Galleries with no
  repeated surfaces retain the existing compact counter, including OIDC's 37.
  Missing mappings recompute the counts without retaining stale call-site text.
- Documented that `ScreenLightbox` has an independent level-2 modal heading;
  `JourneyViewer.level` controls hierarchy/inspector headings. Corrected the
  checkpoint to identify unchanged **`baseline.json`**, while acknowledging the
  `BASELINE.md` prose update recording asset copying.
- Recorded gallery profiling as the next performance candidate, including full
  occurrence expansion and per-candidate duplicate scanning on every render/step.
  Added the Stage-8 exports, required snapshot fields and optional hover occurrence
  argument to the stage-9/stage-10 API review. No fields, arguments or exports
  were added in this correction. Safari opener capture and example token-string
  coupling remain explicit follow-up/context notes below.
- Re-ran `pnpm test`: **127 tests passed** (**49 design-system, 45 viewer,
  17 lint, 13 query, 3 baseline**), with readonly checks and all **18 fixture
  contracts**. The new frozen-input/SSR regression checks all three call-site
  ordinals, view totals, mapping replacement/removal and input preservation.
- `pnpm build:storybook:viewer` passed, building the required packages and both
  compiled consumers. Re-ran `pnpm --filter @journey-viewer/viewer test:browser`:
  **all 25 Chromium checks passed**, including 37 native image decodes, live map
  replacement, keyboard/focus behavior and responsive thresholds. Extended the
  reused-journey case to verify **5 / 6 views · 2 of 3 call sites**, stepping into
  the other parent's third call site, bidirectional wrapping, and captions fitting
  at **320px and 1280px** without page/dialog overflow. Visually inspected ignored
  `stage8-review-call-sites-320.png` and `stage8-review-call-sites-1280.png` in
  `packages/viewer/.test-output/`. The rebuilt catalog still has **78 stories**.
  Independent design-system Storybook/browser results above were not rerun in
  this correction; its component change is documentation only.
- Confirmed both package `dist` directories contain no PNGs or screenshot/
  presentation JSON inputs. Canonical UJG, `baseline.json`, manifests, lockfile,
  application and original repository remain unchanged. `git diff --check`
  passes. All Stage-8 work remains unstaged and uncommitted; later stages remain
  unstarted.

## Unresolved issues and deferred work

- No architectural changes have been made to the agreed plan.
- Large-document rendering needs an explicit depth/size/display policy: preserving
  every shared call site can grow output exponentially. Query scans, composite
  identity searches and repeated child selections also add cost. Ancestor lookup
  on selection revisits shared diamond paths with only an ancestry guard, builds
  duplicate arrays and rescans journeys/states/composites at each level; that
  work can also grow exponentially before merging removes duplicates. Defer
  profiling and per-call lookup improvements until scoped; local temporary
  collections can preserve purity, but add no retained cache, hierarchy model or
  arbitrary truncation in these corrections.
  Hover also replaces the root snapshot, re-rendering the hierarchy and repeating
  search, summary, path and per-row relation queries/linear selection scans.
  A no-match search walks every finite occurrence and can grow exponentially on
  shared diamonds despite the 18-result cap. Per-render local lookups are a
  possible optimization; moving hover to another state owner needs an explicit
  change to the agreed React state boundary.
  Profile Stage 8's gallery next: `JourneyLightbox` derives it on each render,
  and `stepScreenshot` derives it again on each step. Full finite-occurrence
  expansion can be exponential on shared diamonds; the per-candidate
  `screens.some(...)` duplicate scan can be quadratic. The call-site caption
  correction does not optimize this work. Measure representative reused graphs
  before selecting per-call traversal/lookups; add no persistent catalog/cache.
- Selection and expansion intentionally follow logical IDs across all reused
  occurrences within one instance. Stage 7 now records explicit occurrence
  context for focus and breadcrumbs; it assigns no arbitrary parent and adds no
  per-call-site expansion state. Occurrence paths belong to one document object
  and must be reset on replacement by externally controlled consumers.
  All occurrences of the selected logical identity remain highlighted, while
  breadcrumbs/inspector navigation use the last chosen occurrence. This is now
  explicit in the README. Snapshot consumers must use `navigateViewer` or
  `pickSearchResult` for selection; the interaction-only `selectNode` API does not
  update occurrence context and must not be spread into a snapshot on its own.
- Collapse intentionally preserves selection even when its row becomes hidden;
  the inspector continues to show that item, without automatic reveal or
  clearing. A new selection reveals its explicit ancestor paths. This behavior is
  documented; no hidden-selection flag or retained visibility state is added.
- `JourneyViewer.document` must stay referentially stable between actual input
  replacements. Stage 10's local-file loading must retain each parsed object
  until the next load rather than reconstruct it during parent renders.
- Touchpoint filtering retains individual source identities. Stage 8 adds
  explicit separate captions/dots and caller-supplied short labels/colors for
  interactive journeys, without selecting a primary touchpoint. Static hierarchy
  presentation retains its existing contract.
- Two nonblocking review proposals remain separate design work: introduce a
  distinct focus-row presentation rather than adapting `StateRow`'s disclosure
  contract, and review which current helper exports (notably `getRowRelation`
  and `occurrenceLabel`) should remain public before stage-9 extensions or app
  wiring. Current focus presentation and existing exports are retained in the
  Stage-7 UX corrections; no later stage is started by these proposals.
- The stage-9/stage-10 API pass must also review Stage 8's five exported screen
  functions and controlled screen components, the required `ViewerSnapshot.lightbox`
  and `ViewerNavigation.hoverOccurrence` fields, and `hoverNode`'s optional fourth
  occurrence argument (default null). Hand-built snapshots must include new
  fields; `createViewerSnapshot` supplies the complete defaults. This correction
  adds no new public fields, arguments or exports.
- Native modal focus restoration captures `activeElement` at mount. On Safari,
  clicking a button need not focus it, so the captured element may differ from
  the opener. Review explicit opener handoff at the browser boundary when scoped.
  Keep current keyboard focus wrapping and restore/fallback behavior meanwhile.
  Example touchpoint colors intentionally reference the design-system's public
  CSS variables; that example coupling remains documented without a new runtime
  color/token resolution abstraction.
- Focus columns use native horizontal overflow; programmatic reveal/scrolling
  and global keyboard shortcuts stay at a browser/application boundary. Stage 10
  may compose those effects explicitly without moving them into pure queries or
  controlled renderer components. Stage 8's modal-only keyboard/focus behavior is
  isolated in `BrowserLightbox`; it adds no global shortcut listeners.
- All stages after 8 remain unstarted. Extensions, routing,
  reporting UI and deployment are not implemented. Syntax
  parsing remains the caller's native `JSON.parse`; the app does not call lint yet.
- The initial rules check compact field shapes, node identity uniqueness, and
  target existence/classes. IRI grammar, context meaning, ownership, transition
  locality, boundary mappings, forbidden properties, and outgoing-target
  exclusivity need additional independently supplied rules when required. This
  checkpoint does not introduce a full SHACL/conformance engine or infer overall
  validity from an empty list of findings. Imports are not resolved or fetched.
- Stage 11 should make the shared Storybook development configuration an explicit
  supported export or copy the small needed setup, resolving the currently
  accepted relative dependency on design-system private development files.

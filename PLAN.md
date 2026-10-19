# Journey Viewer implementation plan

## Current checkpoint

- Current stage: **5 — Static hierarchy (complete with corrections and viewer Storybook, uncommitted)**.
- Next stage: **6 — Selection and inspection**. Do not start it in the stage-5 request.
- Stage-5 deliverable: a viewer package rendering the fully expanded hierarchy
  directly from canonical UJG queries, static state rows and entry/exit lists,
  explicit reuse/recursion/rootless presentation, and viewer Storybook extending
  the design-system catalog and development configuration.
- Changed modules/interfaces: `packages/viewer` (`JourneyHierarchy` with readonly
  document/heading-level props), design-system `JourneyContracts` and separate
  `StateSummary` presentation, their fixtures/checks/stories/tests, root commands/lockfile,
  `.gitignore`, READMEs, and this checkpoint. Existing data/lint packages, web app,
  and captured example remain unchanged.
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
| 8. Screens and presentation | Previews/lightbox with explicit OIDC screenshot mappings, colors, short labels. | All 37 screens resolve; missing images and keyboard navigation work; no OIDC filenames or ID guessing in reusable code; DOM effects isolated. |
| 9. Build-time extensions | Readonly descriptors for inspector panels, annotations, and rendering overrides; parser/view selection stays explicit in the app. | Small custom panel and annotation work without changing built-ins; removal restores defaults; no registration, lifecycle, or shared runtime state. |
| 10. Standalone application | Journey Viewer brand, landing page, catalog, routes, local-file loading, finding presentation; compose reading/parsing/checking/rendering explicitly. | OIDC and local files open; syntax failures/findings displayed separately; blocking policy only in app; no upload/persistence. Routes: `/`, `/examples/solid-oidc`, `/viewer`. |
| 11. Distribution and Cloudflare | Finish independent ESM/declaration/CSS exports and app-local Cloudflare config; separate package/app builds, Storybook, and deploy commands. | External-consumer smoke check; Cloudflare dry run and deep-link refresh; no development fixtures/Storybook in deployment; no package publication. |

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

## Unresolved issues and deferred work

- No architectural changes have been made to the agreed plan.
- Large-document rendering needs an explicit depth/size/display policy: preserving
  every shared call site can grow output exponentially. Query scans, composite
  identity searches and repeated child selections also add cost. Defer profiling
  and any per-render readonly lookups until that work is scoped; add no persistent
  cache, hierarchy model or arbitrary truncation in stage 5.
- Stage 7 must keep individual touchpoint identities when adding filtering. The
  current joined caption with one dot is only a static-stage presentation, not a
  primary-touchpoint selection or identity contract.
- All stages after 5 remain unstarted. Viewer interaction state/inspection,
  navigation, screenshots, extensions, routing, reporting UI, and deployment
  are not implemented. Syntax
  parsing remains the caller's native `JSON.parse`; the app does not call lint yet.
- The initial rules check compact field shapes, node identity uniqueness, and
  target existence/classes. IRI grammar, context meaning, ownership, transition
  locality, boundary mappings, forbidden properties, and outgoing-target
  exclusivity need additional independently supplied rules when required. This
  checkpoint does not introduce a full SHACL/conformance engine or infer overall
  validity from an empty list of findings. Imports are not resolved or fetched.

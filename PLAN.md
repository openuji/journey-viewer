# Journey Viewer implementation plan

## Current checkpoint

- Current stage: **3 — Independent linting (complete)**.
- Next stage: **4 — Design-system foundation**. Its refined scope and acceptance
  gates are recorded below; implementation has not started.
- Stage-3 deliverable: a pure `lint(value, rules)` runner, finding types, and
  separately exported document-shape, identity, and reference-target checks.
- Stage-3 acceptance: rules handle malformed parsed data independently, injected
  lists control checking, and findings never modify data. Rule order establishes
  no prerequisites. Parsing and reporting remain caller concerns.
- Expected changes for stage 3: `packages/lint` (runner/types, separate UJG rule
  export, tests, build, and documentation), lockfile, README, and this checkpoint.
  The data-query package, web app, and captured example remain unchanged.

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
   not hide mutable business state.
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

This is a planning checkpoint, not implementation evidence. Keep the architectural
boundaries from stages 1-3. Implement stage 4 in the following order and complete
its gates before beginning the viewer.

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
| Token ownership | Changing a source token changes both utility output and component styling. Repeated generation is identical. Separate checks catch malformed values and broken references. |
| Primitive reuse | Stories document every primitive and supported variant. Source review confirms a single native button implementation, reused by `IconButton` and other controls, and shared owners for heading/text/surface styles. Compositions contain no copied primitive interaction or typography recipes. |
| Theming | Browser stories demonstrate light/dark side by side and nested boundaries. An additional development theme varies color, font, and spacing through token configuration without editing component logic. |
| Responsive behavior | Browser checks at 320px and immediately below/at/above both named thresholds show wrapping, usable controls, and no page overflow. Modules and utilities use the same breakpoints. |
| Component boundaries | Every primitive and hierarchy composition renders from readonly presentation props without UJG/viewer/application imports, shared stores, or graph context. |
| Fixture separation | Deterministic generators accept frozen inputs without mutation. Separate checks accept valid fixtures and reject deliberately malformed fixtures. Generation and rendering never import checks. |
| Accessibility | Controls expose accessible names, native keyboard behavior, visible focus, and usable mobile hit areas. Heading semantics are independent of their visual sizes. |
| Build isolation | Independent ESM/declaration/CSS and Storybook builds pass. A browser story renders the built components with compiled CSS and no consumer Tailwind processing. Production output excludes stories, fixtures, checks, and Storybook. |
| Regression | All existing tests and app builds pass. The original repository and captured OIDC baseline remain unchanged. Record commands and browser evidence here before the scoped implementation commit. |

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
4. Produce one scoped commit and report its outcome.

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

## Unresolved issues and deferred work

- No architectural changes have been made to the agreed plan.
- All stages after 3 remain unstarted. Design-system contracts, viewer state,
  extensions, routing, reporting UI, and deployment are not implemented. Syntax
  parsing remains the caller's native `JSON.parse`; the app does not call lint yet.
- The initial rules check compact field shapes, node identity uniqueness, and
  target existence/classes. IRI grammar, context meaning, ownership, transition
  locality, boundary mappings, forbidden properties, and outgoing-target
  exclusivity need additional independently supplied rules when required. This
  checkpoint does not introduce a full SHACL/conformance engine or infer overall
  validity from an empty list of findings. Imports are not resolved or fetched.

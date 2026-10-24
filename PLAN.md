# Journey Viewer implementation plan

## Current checkpoint

- Current stage: **11C — library cleanup and library source conventions (complete,
  uncommitted)**. Stage 11 is split into 11A (deployment, user checkpoints `81c4e40`
  and `e7eb0a9`), 11B (site source layout, `@/` imports, Prettier; user checkpoint
  `d65c7f1`) and 11C. 11C changes only this library repository; `apps/web` is
  unedited. Decisions are in "Stage-11C decisions" and evidence in "Stage-11C
  verification evidence". Stage 11 is complete; no later stage is scoped yet.
- Stage-11C deliverable: no global CSS leaves the design system; `@types/react` is
  an optional peer; `pnpm test:consumer` installs the packed tarballs outside the
  workspace; the viewer Storybook is self-contained; the root README documents
  distribution. The four packages also follow the source conventions: tsconfig
  aliases and extensionless module imports instead of relative paths (`tsc-alias` resolves them in tsc output) and
  Prettier formatting, both enforced by `pnpm test`.
- Stage-10E deliverable (user checkpoint `81c4e40`): the compact app shell; 10D (hierarchy
  parity) is complete.
- Stage-10E-b deliverable: both app routes render only the compact shell header and
  the full-width viewer, or the no-document panel. The app browser suite covers the
  new structure (8/8 against the built output and a fresh dev server). Evidence is
  in `apps/web/PLAN.md`; the library interfaces are unchanged by 10E-b.
- Stage-10E-a deliverable: `apps/web` `Application/Shell` stories for one compact header
  (square icon, document title, check status with a findings popover, Open file, example
  link) and the no-document panel, plus design-system `color.warning`/`color.danger`
  (+soft) tokens and a solid-button hover fix. Details and evidence are in `apps/web/PLAN.md`.
- Stage-10D deliverable: the viewer and design system reproduce the original
  `journey-graph` hierarchy (`localhost:5174/hierarchy`). This covers the explorer
  bar, tree and columns, rows, collapsed contracts, the sticky grouped inspector,
  the hover preview, the phone-sized lightbox, the search popover and the
  single-select filter. The review and the approved interface changes are recorded
  below. `apps/web` is intentionally unchanged (app shell issues deferred).
- Stage-10A deliverable: an independent Astro repository at `apps/web` with
  native Astro Storybook, approved SVG logo, framework-neutral SVG eye geometry,
  local tokens/primitives, touchpoint tiles, continuous persona waves, fixed
  studies and a static single-persona teaser. No playback controls or app loader.
- Stage-10B deliverable: reference-based landing at `/`, composed from the
  reviewed components, with transparent SVG branding, borderless artwork,
  10px maximum cells, visible CTAs, native navigation and footer. Component
  studies live only in Storybook. Links target `/app/` and
  `/app/examples/solid-oidc/`; those screens and file reading belong to Stage 10C.
  The responsive hero uses recognizable heart/donut/star figures below the
  message, each with its own tempo and persona cycle. Each wave changes that
  figure's silhouette; existing colors persist and departed cells fade to zero.
- Stage-10C deliverable: `/app/` opens local JSON-LD; the explicit example route
  `/app/examples/solid-oidc/` reads unchanged UJG, presentation inputs and all 37
  screens under that app path. App-owned read/syntax reports stay separate from
  selected-rule findings. Shape/duplicate-ID errors block opening; reference
  findings are warnings. Rejected loads preserve the current viewer; successful
  loads retain the new parsed object until replacement. No upload/persistence.
- Changed responsibilities: `apps/web` owns its UI, Git metadata, dependencies,
  lockfile and catalog commands. It is excluded from the parent pnpm workspace
  and ignored by the parent. Root convenience commands delegate into it; parent
  builds/tests cover the four library packages. The six formerly tracked web
  paths remain in the parent index until the user performs the agreed untracking
  operation. No parent-index edits, commits or remote repository are created.
  Stage-9 source, library interfaces and canonical UJG/assets remain unchanged.
  Stage 10C explicitly links the four libraries' built public exports from the
  separate site dependency manifest. The app reuses the viewer/design-system;
  the landing keeps its local primitives. No workspace membership or source
  aliases are added. Install/build portability beyond these local checkouts
  remains Stage 11.
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
   ownership rule applies to the design system and viewer. The approved Stage-10A
   split gives the landing in the independent site repository its own local
   tokens/primitives; the landing does not import or duplicate the parent's
   design-system implementation. The Stage-10C application composes the built
   viewer and design-system in its own scoped theme.
   Future shared-brand extraction requires a separately scoped change.

## Scope and defaults

Create an independent repository under the Journey Viewer brand. Preserve the
current hierarchy layout and behavior; leave the original repository working.
The landing/catalog has its own nested repository at `apps/web`. The final site
includes a landing at `/` and application routes under `/app/`, including the
Solid-OIDC example and local-file loading inside the app. Cloudflare deployment
remains a separate later stage.

V1 supports self-contained canonical compact UJG Editor's Draft JSON-LD, including
Core/Graph/Surface data, entry indexes, multiple roots and child journeys, and
repeated/recursive references. Do not invent topology or turn the source graph
into a single-parent tree.

Packages remain private but independently consumable, with built ESM, declarations,
and compiled CSS. Storybook is internal. YAML, path discovery, browser/surface
resolution tooling, remote context/import fetching, and local-file persistence
remain outside this extraction. Stage 11A prepares deployment without publishing
packages or changing the existing site; Stage 11C finishes the library exports.

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
| 10A. Independent brand catalog | Independent Astro repo at `apps/web`; own UI/tokens, original logo, reusable eye geometry, native Storybook, animation and teaser studies. | Both Git/workspace boundaries documented; Astro and Storybook development/static rendering pass; small-size/responsive SVGs, continuous motion, reduced motion, suspension and instance cleanup verified. User performs parent-index removal; no commits. |
| 10B. Landing composition | Compose the approved reference-based landing from the reviewed components. | Responsive landing at `/`; no hero controls; links lead to `/app/`; no file handoff, graph filtering or deployment. |
| 10C. Standalone application | Application under `/app/`, Solid-OIDC and local-file loading, findings; compose reading/parsing/checking/rendering explicitly. | OIDC/local files open; syntax failures/findings displayed separately; blocking policy only in app; no upload/persistence. App-owned example routes remain under `/app/`. |
| 10D. Hierarchy parity | Port the original hierarchy's presentation and behavior into the design system and viewer; side-by-side parity harness. App shell excluded. | Paired original/viewer screenshots and metric assertions pass at 1440/1099/859/375px; all package unit/browser suites and Storybooks pass; `apps/web` unchanged. |
| 10E-a. App shell review | Compact application header and no-document panel as `apps/web` Storybook studies. | One ≤56px row with the 22px icon at desktop; keyboard file opening; findings popover; no overflow at 320–1440px; built and dev catalogs pass. |
| 10E-b. App shell integration | Replace the app routes' header/h1/file card/status with the approved shell; full-bleed viewer; update app browser tests. | App browser suite passes against the new shell; local files, findings and the example behave as in 10C. |
| 11A. Deployment | `apps/web` reaches the library repo only through its git-ignored `.journey-viewer` alias (local symlink, or a Cloudflare build clone); Wrangler static-assets config, `build:cloudflare` command and deployment test. | Cloudflare dry run; deep-link refresh through `wrangler dev`; no development fixtures/Storybook in `dist`; no package publication. |
| 11B. Site source layout | One `apps/web` component tree in semantic groups, one folder per component owning its styles, stories, studies and private modules; global CSS only in `src/styles`, CSS modules for React; `@/` tsconfig imports instead of relative paths; Prettier formatting; enforced by a layout test and `pnpm check`. | No behavior, URL, API or story-ID change: pages and stories pixel-identical to the pre-change build except the corrected cascade; all app suites and parity pass. |
| 11C. Library cleanup | Independent ESM/declaration/CSS exports, external-consumer smoke check, self-contained viewer Storybook; library source conventions: `@/`/`~/` tsconfig aliases instead of relative imports and extensionless module imports (resolved to `./module.js` in tsc output by `tsc-alias --resolve-full-paths`; `tsx` for Node runs), Prettier. | Smoke check installs the packed tarballs outside the workspace; no global CSS leakage; viewer Storybook imports no private design-system files; layout test and `format:check` pass in `pnpm test`; story IDs unchanged; all package, browser, parity and app suites pass. |

## Stage-10A refinement — approved 2026-10-22

- The independent site lives inside `apps/web`, with its own `.git`, pnpm
  workspace boundary, pinned versions and lockfile. Root ignores `/apps/web/` and
  no longer discovers it as a workspace member. The original minimal Vite shell
  is replaced in place; no placeholder app is moved elsewhere.
- Existing tracked files are not hidden by an ignore entry. Per the approved
  plan and no-staging rule, the user must run
  `git rm -r --cached -- apps/web` from the parent to finish the ownership
  transfer. This preserves all nested files. Agent work must not perform it,
  stage another path, create a gitlink/submodule, commit or add a remote.
- The landing owns its UI rather than consuming the parent's design system.
  Original reference bytes are preserved. The approved SVG replaces the rendered
  PNG with a transparent canvas. SVG geometry is independent of Astro and
  persona identity: square baseline plus checker, hearts, visor, shelf, brow and
  surprised variants. Both prototype sprite sets have fixed catalog stories.
- Hero waves loop continuously with no controls in production or stories.
  Reduced-motion users receive a still composition. Browser animation effects
  remain local, suspend offscreen/hidden, and clean up on removal. Fixed-frame
  studies support deterministic visual inspection without playback controls.
- The quieter teaser has fewer tiles and one expression. All mosaics are
  explicitly illustrative, without invented OIDC topology or extra personas.
  Graph mapping/filtering, shared-brand extraction, full landing composition,
  `/app/` loader and deployment remain outside Stage 10A.

## Stage-9 extension contract

- `ViewerExtensions` contains readonly `inspectorPanels`, `annotations` and
  `stateOverrides` arrays of explicit predicate/component descriptors. All
  matching panels/annotations render in supplied order; the first matching state
  override wins. Unmatched rows use the default. A matching component returning
  null intentionally suppresses its content. Descriptor IDs are caller-owned
  React keys, unique within each array, with no dispatch or registration meaning.
  Callers ensure uniqueness; the viewer does not check it. Duplicate IDs are
  unsupported input with undefined rendering behavior.
- Context references original document/journey/node objects, selection identity
  and the explicit occurrence. Informational inspectors without navigation get
  null occurrence; invalid/empty selections evaluate no inspector descriptors.
  Panels append after built-in content and get bounded heading levels plus the
  caller's navigation callback when supplied. Annotations appear beside journey/
  state controls and for every valid inspector selection kind. Inspector
  annotations follow the built-in sections and precede “Navigate graph”. Native
  annotation lists have no repeated accessible label.
- State overrides receive the design-system's complete readonly `StateRowProps`:
  controls/callbacks, marks, screenshot actions, focus/empty notices and children.
  Custom components can compose `StateRow` directly. Replacing those semantics
  is the caller's presentation/accessibility responsibility. The viewer still
  owns graph queries and interaction; no mirrored model, cache or state is added.
- `JourneyViewer.extensions` composes both outlets. Controlled explorer accepts
  annotations/state overrides; controlled inspector accepts panels/annotations.
  The static hierarchy keeps its existing distinct contract. Descriptors are
  not retained in snapshots, so replacement/removal changes only presentation.
  Predicate/render errors propagate to the host's error boundary.
- The API review retains `getRowRelation` for custom controlled rows and
  `occurrenceLabel` for human-readable call-site captions. The five screen
  functions and controlled screen components remain supported composition APIs.
  `ViewerSnapshot.lightbox` / `ViewerNavigation.hoverOccurrence` stay required;
  `createViewerSnapshot` supplies defaults. `hoverNode`'s optional fourth
  occurrence argument remains compatible and defaults to null. No exports are
  removed or existing state/transition contracts changed.
- Native parsing, rule policy and selection of imported parser/view components
  remain explicit caller/application operations. App wiring stays in Stage 10;
  descriptors add no parser adapters, resolver runtime, package or dependency.

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

## Stage-9 verification evidence

- Implemented only Stage 9 from clean user-created checkpoint
  `2937e52e7b72cb0503cd76c985d0206e8c1f6a37`. Added readonly inspector-panel,
  annotation and state-rendering descriptors, explicitly supplied to the viewer
  and controlled outlets. Built-in presentation stays unchanged when descriptors
  are absent, empty or unmatched. Static hierarchy retains its original contract.
  No runtime registration, lifecycle API, discovery, shared state, package,
  dependency, parser/view resolver or application/deployment work was introduced.
- Panels append to built-in inspection/navigation; annotations use separate
  content beside controls. Every context references the original canonical nodes
  and explicit finite call site. First-match state overrides receive the complete
  readonly design-system row contract, including callbacks, marks, media,
  focus/empty-child notices and children. The development example composes
  `StateRow`, `Text` and `Badge` without changing design-system components.
- Completed the navigation/screen public API review, retaining current exports
  for controlled compositions. Documented snapshot creation, selection/context
  rules and the existing optional hover occurrence argument. Existing snapshot,
  transition, media and static interfaces remain compatible; only optional
  extension props and their readonly descriptor/context types were added.
- Final `pnpm test`: **135 tests passed** (**53 viewer, 49 design-system,
  17 lint, 13 query, 3 baseline**), including readonly declaration checks,
  token checks and all **18 independent fixture contracts**. Eight new frozen-
  input/SSR tests cover unchanged defaults, ordered/matching panels and annotations,
  every inspector selection kind, original node identity, repeated occurrences,
  heading bounds, complete override callbacks/content, screenshots/focus/notices,
  removal, intentional null rendering, invalid selections and error propagation.
- `pnpm build` and final `pnpm build:storybook:viewer` passed. The latter builds
  the packages and both ESM/declaration/CSS consumer fixtures without consumer
  Tailwind processing. Viewer Storybook builds/loads **80 stories: 51 inherited
  + 29 viewer**, including new build-time and removable-extension examples.
  The compiled consumer imports the new public descriptor type and demonstrates
  replacement/removal alongside an independent default viewer. Package output
  contains no example descriptors, stories, fixtures or PNGs.
- Final `pnpm --filter @journey-viewer/viewer test:browser`: **28 Chromium
  checks passed**, including all 25 earlier checks and three extension cases.
  Native Space/Enter retain custom-row disclosure/selection and all shared-ID
  child occurrences. Panels work for journey/state/entry/exit selections. Replacing
  descriptors and removing/re-adding them preserve the second repeated call site,
  focus, query and touchpoint filters; removal also preserves collapsed shared
  children and restores default rows/panels/annotations. A separate viewer remains
  independent, and same-ID document-object replacement still resets interaction.
- Extension examples fit **320, 859, 860, 861, 1099, 1100, 1101 and 1280px**
  without page overflow. Visually inspected final ignored
  `packages/viewer/.test-output/stage9-extensions-320.png`,
  `stage9-extensions-1280.png`, `stage9-panel-320.png` and
  `stage9-panel-1280.png`. The browser runner closed its server/browser. The
  unchanged standalone design-system Storybook/browser suite was not rerun;
  its full inherited catalog and compiled consumer passed in the viewer suite.
- Static OIDC still renders **10 journeys / 47 states / 20 entries / 24 exits**;
  the **10/47/120/37** baseline and all 37 image checks remain green. Design-system,
  data/lint packages, application sources, captured UJG/baseline/assets, manifests
  and lockfile are unchanged. The app bundle remains `index-Dzl6dVgS.js`.
  `git diff --check` passes. No files were staged or committed. Stage 9 has no
  unresolved acceptance failures; Stage 10 remains unstarted.

### Stage-9 review corrections — 2026-10-22

- Addressed the nonblocking feedback within Stage 9. Documented descriptor-ID
  uniqueness as the caller's responsibility: duplicates are unsupported input
  with undefined rendering behavior. No runtime checker or public API was added.
- Removed the repeated “Annotations” accessible label from annotation lists,
  retaining native list markup and visible annotation content. Clarified that
  inspector annotations follow built-in sections and precede “Navigate graph”.
  Existing SSR/browser regressions now check the absent repeated list name,
  available annotation text and inspector ordering.
- Preserved all four unrelated scratch files (`tmp/animation.html`, `image.png`,
  `logo.png`, `landing_page.png`) and added an anchored `/tmp/` ignore rule.
  `git check-ignore` confirms all four are excluded; no scratch file was changed
  or deleted, and none is part of the Stage-9 deliverable.
- Re-ran `pnpm test` and inspected every suite summary: **135/135 passed**
  (**53 viewer + 49 design-system + 17 lint + 13 query + 3 baseline**), plus
  readonly/token checks and all **18 independent fixture contracts**. This
  confirms the complete count, rather than only the trailing baseline suite.
- Rebuilt `pnpm build:storybook:viewer`: **80 stories (51 inherited + 29 viewer)**
  and both compiled consumers passed. Re-ran the final viewer browser suite:
  **28/28 Chromium checks passed**, including annotation accessibility/content,
  extension removal/state preservation and all prior screenshot/navigation gates.
  The runner closed its temporary browser/server. The independent design-system
  browser suite was not rerun; its source remains unchanged.
- `git diff --check` passes. Changes remain unstaged and uncommitted. Stage 9
  still has no unresolved acceptance failures; Stage 10 remains unstarted.

## Stage-10A verification evidence — 2026-10-22

- Implemented only the approved independent brand/catalog stage from clean
  checkpoint `6e724861a1b71f281c262c306bb6d1b9a3d91211`. Replaced the minimal
  Vite shell in place with a local-only Astro repo at `apps/web`. It has its own
  Git metadata, pnpm workspace marker, pinned versions, lockfile, Storybook,
  plan and working agreement. No remote, commit, submodule or gitlink was added.
- Parent pnpm membership now contains only its four library packages; root
  `build`/`test` run independently. The root lockfile only removes the former
  web importer, preserving every dependency version. Root `dev`, `build:app`,
  `storybook:web` and `build:storybook:web` delegate into the nested checkout.
  `/apps/web/` is ignored, while all six previously tracked paths remain in the
  parent index for the user's explicit `git rm -r --cached -- apps/web` handoff.
  No index was modified or staged by the agent.
- Site-local DTCG tokens and `Heading`, `Text`, `Surface`, original-logo,
  eye-path, eye-pair and tile components have one owner per responsibility.
  Seven deliberately drawn SVG eye variants share a 32 × 16 canvas; both
  supplied expression sets retain their own named stories. Geometry is readonly
  and framework-independent, without persona identity or UJG dependencies.
  All four supplied reference files and the rendered logo preserve original bytes.
- Static mosaics, the animated hero and quiet teaser have separate contracts.
  The hero reuses existing paths and continuously cycles three illustrative
  personas per set, using the source 4200ms wave duration. It has no controls.
  Browser-only effects suspend offscreen/hidden, respect changing reduced-motion
  preferences and clean up per instance. The teaser has fewer tiles and exactly
  one square-eye pair. No graph model, filtering, app loader or landing CTA was added.
- Site `pnpm test`: **8/8 passed**, plus clean Astro/TypeScript diagnostics,
  readonly compile checks and **38 independent token checks**. A source-only
  temporary copy outside this parent passed a frozen offline install, Astro
  production build and native Astro Storybook build, proving independent use.
  The copy was removed afterward. Both root delegated site build commands passed.
- Native Astro Storybook builds and loads **34 stories**, from primitives and
  individual eyes through proof sheets, tiles, both hero sets, still frames,
  teaser and multiple instances. The same actual Astro components are inspected
  in development and built Storybook. No React/HTML stand-in renderer or custom
  playback/Controls UI was added. Storybook uses a narrow localhost/127.0.0.1
  allowlist for its development preview.
- Site browser suite: **7/7 Chromium checks passed against built output**, and
  the same **7/7 passed against running Astro and Storybook development servers**.
  Checks verify every story's styles/assets/slots/scripts, preserved logo bytes,
  all eye bounds, no playback controls, reduced-motion changes, actual full loop
  cadence, every persona's visible expression, retained paths, offscreen/hidden
  suspension, detach/reconnect cleanup, independent instances and static teaser.
  CSS minification exposed a `4200ms` → `4.2s` timing bug; explicit unit handling
  and a duration/cadence regression fix it. Small-size square-eye proofs now use
  colored backing so the white frames remain visible.
- Layout checks pass at **320, 375, 768, 1024 and 1440px** without page overflow.
  Visually inspected ignored catalog, eye-sheet, hero and teaser screenshots at
  mobile/desktop sizes under `apps/web/.test-output/`; Storybook instance
  screenshots are captured too. Original references are not shipped in the
  production output. Browser runners close their own servers/browsers; ordinary
  development servers are stopped after verification.
- Parent `pnpm test`: **135/135 passed** (**53 viewer + 49 design-system +
  17 lint + 13 query + 3 baseline**), with existing readonly/token checks and
  all **18 component fixture contracts**. Parent `pnpm build` passed for all
  four libraries. No library sources/interfaces, examples or canonical UJG/assets
  changed. Both repositories pass `git diff --check`, have unstaged changes and
  no commits created. Stage 10A has no unresolved implementation gate failures;
  the user-owned parent-index transfer remains documented. Stage 10B is next.

### Stage-10A logo and hero-size correction — 2026-10-22

- Replaced the rendered PNG with the user's supplied `tmp/logo.svg`. Preserved
  the original SVG byte-for-byte in the nested repository's references. The
  production SVG removes the full white canvas and tightens its viewport;
  every other path and gradient is retained. Astro and Storybook serve the
  same transparent `public/brand/logo.svg` asset. Scratch originals are untouched.
- Hero and deterministic-frame mosaics now shrink with their container and cap
  each cell at **10 × 10 CSS pixels**, centered in larger containers. The cap
  belongs to the local DTCG token source; animation geometry/timing, expressions,
  teaser and library interfaces are unchanged. Full landing composition remains
  Stage 10B; this correction does not begin it.
- All **8 unit tests** pass. Astro/TypeScript/readonly checks and **39 token
  checks** pass; Astro and native Storybook production builds pass. Browser
  verification passes **7/7 against built output and 7/7 against development**,
  including logo decoding/transparency, maximum cell dimensions at 320/375/768/
  1024/1440px, all 34 stories and the existing animation/lifecycle checks.
- Inspected the updated mobile catalog, desktop hero and transparent-logo
  screenshots under `apps/web/.test-output/`. Screenshot review caught an
  unsupported static Storybook asset URL; sharing the public asset directory
  fixes it, and logo decoding is now checked in every relevant story. Logs use
  the `review-logo-cells-` prefix. Existing user development servers were reused
  and left running; temporary test servers/browsers closed normally.
- Parent libraries/examples remain unchanged, so their previously passing
  135-test/build results were not rerun. Both Git indexes remain untouched;
  whitespace checks pass. All changes remain uncommitted.

### Stage-10A teaser alignment correction — 2026-10-22

- Applied the same **10 × 10 CSS pixel** cell cap to the static teaser. It now
  stays compact in every composition and Storybook instance. Existing readonly
  artwork, touchpoint colors and the single square-eye pair are preserved.
- Added a reusable native `ExamplePreview` composition, inspected through the
  existing teaser study. It follows `tmp/landing_page.png`: example label,
  Solid-OIDC heading/copy, artwork beside the copy on desktop, and a visible
  softly filled “Open example” CTA. The teaser has no enclosing surface/card
  border and stacks at narrow widths, with its CTA before the artwork.
- The native link accepts an explicit destination and defaults to the agreed
  `/app/` path. That application route remains Stage 10C; verification checks
  its destination and presentation, without claiming the app is implemented.
- `pnpm test`: **8/8 passed**, with clean Astro/TypeScript/readonly diagnostics
  and **39 token checks**. Astro and native Storybook production builds pass.
  Browser checks pass **7/7 built and 7/7 development**, covering all 34 stories,
  the 10px cap for hero/still/teaser cells, borderless composition, visible
  keyboard-reachable CTA at 320/375/768/1024/1440px and existing motion behavior.
- Visually compared the supplied landing reference with mobile/desktop teaser
  screenshots in the page and standalone Storybook. Evidence is under
  `apps/web/.test-output/`, with `review-teaser-*.log` logs. Temporary browser/test
  servers closed; existing user development servers remain running. Parent
  libraries/examples are unchanged, and their prior checks were not rerun.
  Both repositories pass whitespace checks; changes remain unstaged/uncommitted.

## Stage-10B verification evidence — 2026-10-22

- Implemented only the landing stage over the user's nested-repo checkpoint
  `3d84116`. Replaced the duplicated catalog at `/` with the approved reference's
  sequence: original SVG brand/header, headline and animated hero, journey CTA,
  Solid-OIDC teaser and muted footer. The later size/border corrections take
  precedence over the initial screenshot: no card borders, and every hero/teaser
  cell stays at most **10 × 10 CSS pixels**. Existing logo, eye geometry, colors,
  static teaser and animation controller/timing are unchanged.
- The page imports actual landing components directly. It imports no catalog
  studies, proof sheets or fixed frames. Added native Astro stories for the
  header, hero, journey CTA, footer and complete page. Local typography primitives
  now support hero/lead treatments; shared `ActionLink` owns CTA semantics and
  sizing, including reuse by the existing teaser. The teaser's heading level is
  explicit. Three additional DTCG tokens own the new type sizes/page width.
- Links lead to `/app/` and `/app/examples/solid-oidc/`. The GitHub footer URL
  matches the existing parent origin. Native disclosure navigation, section
  links and a keyboard skip link work without a navigation controller. The
  landing contains no file input, drop target, parser, upload/handoff, app-route
  placeholder, persona filter or deployment setup. Application routes remain
  deliberately unimplemented until Stage 10C; hrefs/presentation are verified.
- Site `pnpm test`: **8/8 passed**, with zero Astro/TypeScript diagnostics,
  readonly checks and **42 token checks**. Astro production and native Storybook
  builds pass. Storybook contains **44 stories**, retaining all 34 brand studies
  plus ten new primitive/landing stories. Actual native slots, images, styles and
  browser scripts load correctly. Dependencies and lockfile are unchanged.
- Site browser suite: **8/8 passed against built output and 8/8 against local
  Astro/Storybook development servers**. Checks cover landing-only content,
  transparent SVG decoding, h1/h2 structure, CTA targets/keyboard reachability,
  native menu and skip link, section targets, no file handling or overflow, all
  44 stories, all seven eye shapes, reduced-motion changes, complete wave cadence,
  offscreen/hidden suspension, detach/reconnect cleanup and independent instances.
- Responsive checks pass at **320, 375, 640, 768, 940, 1024 and 1440px**.
  Compared the reference with full-page screenshots at **320/940/1440px** and
  inspected the hero/teaser captures in `apps/web/.test-output/`. Logs use the
  `stage10b-` prefix. CTA measurements center links before checking bounds,
  avoiding fractional nearest-edge scroll rounding without changing the layout.
- Parent `pnpm test`: **135/135 passed** (**53 viewer + 49 design-system +
  17 lint + 13 query + 3 baseline**), plus existing readonly/token checks and
  **18 independent fixture contracts**. Parent `pnpm build` passed independently.
  No library interfaces/sources, canonical examples, package dependencies or
  supplied references changed. Temporary test browsers/servers and the owned
  Astro preview were stopped; the existing user Storybook server is untouched.
- Both repositories pass `git diff --check`; both indexes remain untouched.
  No commits, remotes or publication were created. The previously agreed
  user-owned parent-index handoff remains unchanged. Stage 10B is complete;
  Stages 10C and 11 remain unstarted.

## Stage-10B responsive figures and independent motion — 2026-10-22

- The hero accepts the actual message through a native Astro slot and measures
  its container and message with `ResizeObserver`. One to three large, recognizable
  heart/donut/star silhouettes fit the context. Artwork stays below the message;
  the upper and left text area remains clear. Cells stay at most **10 × 10px**.
- Framework-independent readonly geometry owns the silhouettes, placements and
  coordinate-based colors/memberships. A separate pure motion function gives
  each figure its own tempo, starting phase and persona cycle: **4.2 / 5.46 /
  6.93 seconds** per wave. Each figure changes silhouette at its own boundary,
  without restarting the other figures. The schedule lets every persona encounter
  every silhouette; expressions are not assigned to particular shapes.
- Native `WaveMosaic` owns instance-specific SVG symbols and the tile template;
  the browser controller reuses existing cell elements and colors. Departed cells
  fade fully to **opacity 0**. Invalid regions clear immediately after text reflow.
  Reduced motion uses deterministic still figures, and offscreen/hidden clocks
  suspend. Removal/reconnection cleans up frames, observers and listeners.
- `pnpm test`: **15/15 passed**, zero Astro/TypeScript diagnostics, readonly
  compilation and **44 token checks**. Astro and native Storybook production
  builds pass. The catalog now has **45 native stories**, including a resizable
  message context using the actual hero. Dependencies/lockfile are unchanged.
- Browser verification: **9/9 built and 9/9 development**. Checks cover independent
  figure clocks/personas, shape changes, retained cell nodes/colors, complete
  fading, native sprite ownership, reduced-motion changes, suspension/reconnect,
  all 45 stories, CTAs and responsive bounds. Preference changes are sampled at
  the event boundary rather than polling the media query inside every frame;
  this fixes a reproduced Chromium preference-notification failure.
- No overflow at **320/375/640/768/940/1024/1440px**, with container-only resizing
  at **272/620/360px** and message reflow. Inspected mobile/desktop landing and
  hero screenshots, independently progressing figures and the narrow context.
  Evidence is in ignored `apps/web/.test-output/` with `hero-independent-*.log`,
  `landing-*.png`, `hero-context-*.png` and `hero-independent-shapes.png`.
- Parent library/example sources, approved references, eye geometry, static
  teaser and nested dependencies remain unchanged. Prior parent **135-test/build**
  evidence remains applicable and was not rerun. Temporary browser/test servers
  closed; existing user Astro/Storybook servers remain running. Both indexes are
  untouched, whitespace checks pass, and all changes remain uncommitted. This is
  a Stage-10B refinement; Stage 10C and deployment/publication remain unstarted.

## Stage-10C verification evidence — 2026-10-22

- Implemented only the application stage over the nested site's user-created
  checkpoint `f2d3e84`. Added static `/app/` and `/app/examples/solid-oidc/` pages.
  `ApplicationPage.astro` owns the branded shell, native navigation and skip link;
  `app/mount.tsx` mounts the actual React `JourneyViewer` through `createRoot`.
  Native navigation owns its lifetime. The landing imports no application mount,
  file reader or viewer code; its source/artwork and all 45 catalog stories remain
  unchanged. No additional Astro renderer, router or placeholder package.
- The separate site manifest/lockfile explicitly links the four libraries'
  **built public exports**, with React/ReactDOM **19.2.7** and matching types.
  Vite deduplicates React. Application UI reuses design-system primitives and
  compiled component/viewer CSS inside a scoped theme. No parent workspace
  membership, source aliases, library/interface changes or package publication.
  The site requires the local library/example checkouts and a prior parent
  install/build; portable distribution is still Stage 11.
- Browser reading (`File.text` or explicit example fetches), native `JSON.parse`,
  `checkDocument` rule composition and `Findings` presentation are separate app
  operations. The app supplies `documentShape`, `uniqueNodeIds` and
  `referenceTargets`; shape/duplicate-ID findings block opening, while reference
  findings are warnings. Read errors, syntax errors and findings have distinct
  presentations; findings include rule IDs and exact source paths. Blocking is
  derived from findings in the app, with no parser/viewer/lint-runner policy.
  An empty finding list does not claim full UJG conformance.
- Successful loads retain the **original parsed object** until the next load,
  including same-ID replacements. Rejected attempts leave the current viewer
  mounted with its interaction intact. Browser effect lifetimes abort superseded
  example reads and discard late file completions; no business state is hidden
  in refs. Local files get empty screenshot/presentation inputs, clearing example
  media without filename/ID inference. No upload, storage, import/context fetching
  or asset discovery was added.
- `prepare-example.mjs` copies only the canonical JSON-LD, independent screenshot
  and touchpoint documents and their **37 explicitly mapped PNGs** into ignored
  public output under `/app/examples/solid-oidc/`. The browser resolves map paths
  against that explicit asset base. Graph and image response hashes match source;
  every image decodes. Baseline/provenance, references, fixtures and Storybook do
  not enter application deployment output. Canonical source bytes are unchanged.
- Site `pnpm test`: **19/19 passed**, including four new frozen-input/report-policy
  checks, clean Astro/TypeScript/readonly diagnostics and **44 token checks**.
  Frozen-lockfile install, Astro production build (**three pages**) and native
  Astro Storybook build (**45 stories**) pass. Running Astro and Storybook
  together reproduced stale optimized-dependency **504** responses from a shared
  Vite cache. Separate app/catalog cache directories resolve it; simultaneous
  development rendering now passes without expanding the loopback host allowlist.
- App browser suite: **7/7 built and 7/7 development**. Checks cover actual landing
  navigation, direct-route refresh, **10/47/20/24** rendered journey/state/entry/exit
  counts, all 37 image hashes/decodes, search/filter/focus and keyboard lightbox,
  local opening, failed-load selection/query preservation, same-file/same-ID
  reset, distinct syntax/shape/duplicate/reference reports, cancellation, late
  reads, example HTTP failure/recovery, independent tabs and no persistence or
  external graph requests. Existing landing/catalog suite: **9/9 built and 9/9
  development**, including all 45 actual Astro stories and motion/lifecycle gates.
- No app overflow at **320/375/768/859/860/861/1099/1100/1101/1440px**. File input
  focus/hit area and native skip navigation pass; image/dialog bounds pass at
  **320/1440px**. Inspected application, findings and lightbox screenshots in
  ignored `apps/web/.test-output/stage10c-*.png`; final logs use `stage10c-`.
- Parent `pnpm test`: **135/135 passed** (**53 viewer + 49 design-system +
  17 lint + 13 query + 3 baseline**), with existing readonly/token checks and all
  **18 fixture contracts**. Parent `pnpm build` passes independently. Library,
  example and baseline sources remain unchanged. Both repositories pass
  `git diff --check`, with untouched indexes and unchanged HEADs. No commits,
  remotes, deployment or publication. The user-owned parent-index handoff remains
  unchanged. Test browsers/servers and the temporary app/catalog development
  servers were stopped; the user's existing servers/lockfile were preserved.
  Stage 10C has no unresolved acceptance failures; Stage 11 is next.

## Stage-10D hierarchy parity — review and approved interface changes (2026-10-22)

A review compared `localhost:4321/app/examples/solid-oidc/` with the original
hierarchy (`specs/solid-oidc/journey-graph/apps/graph-studio/.../JourneyHierarchyMap`).
It found that the earlier stages kept the data but not the layout or interaction
model. At 1440px the first state row sat at 905px (original 160px), the inspector
was not sticky and on phones followed the whole tree (7404px vs 324px), there was
no hover preview, the lightbox was a full-page panel, Columns was an ancestor-only
“Focus selected scope”, rows carried permanent entry/exit badges, contracts were
always open, and nested journeys had their own heading plus Inspect/Focus buttons.
Root cause: Stage 4 captured tokens only, and no gate compared the result with the
original. The user approved these changes (the app shell part was excluded):

- **Design system.**
  - `StateRow` ports the original row: `tone`/`marks` relative to the active
    state, whole-row selection, a decorative column caret when a composite has no
    `onToggle`, `description` for child labels, a `crossing` dot, and the new
    `ScreenAction` phone button. `entryCount`, `exitCount` and `relation` are removed.
  - `JourneyContractControls` gains a required `open`/`onToggle` summary toggle.
  - `InspectorPanel` is rebuilt (head, media, direction sections with transition
    groups and detail buttons, footnote).
  - `ScreenPreview` becomes the floating card and `ScreenLightbox` the phone
    figure plus caption; `ScreenImage` gains `fit`.
  - `SearchField` gains a result popover (`SearchResult`); `Button` gains the
    `bare`/`pill`/`segment`/`chip`/`panel` variants and the `xs` size; `Text`
    gains `weight` and the `accent` tone; `Heading` gains `xs`.
  - New owners: `Icon`, `SegmentedControl`, `ExplorerBar`, `JourneyNest` and
    `ScreenThumbnail`, plus 21 DTCG layout/shadow tokens and two repurposed
    screen sizes.
- **Viewer.**
  - `ViewerNavigation.focus` becomes `mode` and `lanes`, with `setViewMode` and
    `getLanePath`. `toggleTouchpoint` (OR) becomes single-select `selectTouchpoint`,
    and `getRowRelation` becomes `getRowHighlight`/`getRouteDescription`.
  - `ViewerInteraction` adds `openContracts` and `toggleContracts`.
  - `JourneyNavigation` becomes the explorer bar with new callbacks.
    `JourneyViewer` gains optional `headerStart`/`headerEnd`, and inspector media
    follows the selection only.
  - The duplicate “Navigate graph” list, breadcrumbs and per-journey Inspect/Focus
    buttons are removed; the `journey` selection kind stays available through search.
- **Browser boundary.** Every DOM effect lives in named `browser/` adapters
  (preview placement, reveal, idle preload, “/”, outside clicks, column scrolling,
  inspector scroll reset). They reach the page only via their own elements and
  never receive graph types; the boundary test now treats `browser/` as that set.

## Stage-10D verification evidence — 2026-10-23

- Implemented only Stage 10D over checkpoint `6e72486`, plus the existing
  uncommitted Stage-10 parent changes. No dependencies were added and neither
  lockfile was touched by this stage (only `test:parity` scripts were added). The
  nested `apps/web` working tree status is unchanged and both repositories pass
  `git diff --check`.
- Parent `pnpm test`: **143/143 passed**.
  - Counts: **56 design-system, 54 viewer, 17 lint, 13 query, 3 baseline**.
  - It includes **23 independent fixture contracts** and readonly declaration checks.
  - New and updated checks cover tones, marks, lane carets, collapsible contracts,
    grouped inspector sections, single-select filters, lane paths, open contracts,
    screens in columns, preview-free row actions and the browser-adapter boundary.
- `pnpm build` passes. `pnpm build:storybook` builds **73 design-system stories**;
  `pnpm build:storybook:viewer` builds **106 (73 inherited + 33 viewer)** and both
  compiled consumers.
- `pnpm test:design-system:browser`: **8/8**. Two checks were rewritten for
  accessible mark explanations and whole-row selection.
- `pnpm test:viewer:browser`: **28/28**. The suite covers:
  - the OIDC baseline (10/47/20/24 when expanded) and keyboard selection;
  - collapsed contracts and the compact explorer bar (≤2 lines);
  - the original grid: stacked below 860px with the inspector first, 300px then
    340px columns, the sticky bar and inspector;
  - columns: 284px lanes, crumbs, carets, opening and trimming, rootless starts;
  - search: popover, “/”, outside dismissal, reveal on pick;
  - single-select equal-label filters, matched nests, undimmed matching children;
  - inspector group-head/detail navigation with reveal, and hover tones/marks;
  - all 37 PNGs and lightbox order/wrap/focus trap/backdrop, live map changes;
  - floating preview placement beside its opener;
  - lightbox bounds and 840/1520 ratio at all thresholds, thumbnails 110/150px;
  - extensions and document reset.
  Evidence screenshots: `packages/viewer/.test-output/stage10d-*.png`.
- `pnpm test:parity` (new, development-only, both dev servers running): **7/7**.
  - At 1440px: first-row offset below the bar **56 vs 63px**, inspector **340 vs
    340px**, visible controls **119 vs 120**.
  - At 1099px: inspector **300 vs 300px**. At 859 and 375px the inspector precedes
    the tree on both sides.
  - Both show a portrait hover card, an ≤760px lightbox at the original ratio,
    identical columns after selecting Login (two 284px lanes), the IdP filter and
    an SMS search popover.
  - Paired screenshots are in `packages/viewer/.test-output/parity/` and were
    visually compared.
- Unchanged-app checks: `apps/web` `pnpm test` 19/19, `pnpm build` (3 pages) and
  the landing browser suite 9/9 pass against the rebuilt libraries.
- Its application browser suite now fails **4 of 7**, because it asserts the
  replaced viewer UI:
  - 20 always-visible entry chips;
  - the “Search results” list and Focus/Overview buttons;
  - `button[data-variant="row"]` rows;
  - “Open screenshot” buttons.

  Updating those assertions is an app follow-up, deliberately not done here.

## Stage-10D follow-ups and accepted differences

- **App (excluded from 10D).** Resolved in Stage 10E:
  - the shell replaces the logo header, h1, file card, status prose and document
    heading;
  - the stats open the explorer bar, and “Open file…” lives in the header;
  - the application browser suite is updated.

  The UJG footer and a JSON-LD source link were not requested for the shell and
  remain optional.
- **Accepted differences.**
  - Mobile-first breakpoints switch at ≥860/≥1100px, while the original used
    ≤860/≤1100px, so layouts differ only at exactly 860px and 1100px.
  - Rows and controls keep the Stage-4 44px touch targets below `md` and on
    coarse pointers (the original used 32px).
  - The inspector shows full IRIs, not local IDs.
  - Search stays constrained by the touchpoint filter (Stage 7), and the search
    reset scrolls the viewer root rather than the window.

## Stage-11C decisions — 2026-10-24

The Stage-11 audit (2026-10-23) recorded the cleanup scope; the user then folded
the library source conventions into 11C.

- **CSS leak.** Design-system `styles.css` emitted seven unused global utilities
  (`.hidden .visible .sticky .container .outline .filter .transition`), picked up by
  Tailwind from words in component source. The two `@source` lines in
  `src/styles/tailwind.css` are dropped: components only `@apply` in CSS modules,
  and stories keep their own `@source` in `.storybook/tailwind.css`. Both packages'
  boundary tests require every class selector in `dist/styles.css` to be a
  CSS-module class.
- **Types.** `design-system` and `viewer` declare `@types/react` ^19.2 as an
  optional peer.
- **Smoke check.** `tests/external-consumer.mjs` (`pnpm test:consumer`, outside
  `pnpm test` because it needs the registry or a warm store) packs each package
  into a temp folder outside the workspace and installs the tarballs there
  (`overrides` for the `0.0.0` inter-package versions). It checks tarball
  contents, runs `tsc` on `tests/external-consumer/consumer.tsx` (bundler and
  nodenext resolution, no Vite types, no `skipLibCheck`) and server-renders
  `JourneyViewer`.
  Simplification: CSS exports are checked with `import.meta.resolve` instead of a
  plain Vite build.
- **Viewer Storybook.** Its own `main`/`preview`/`vite.config`/`preview.css`
  replace the imports from private design-system `.storybook` files; it shows only
  its 33 stories and imports only the design system's public exports. The
  toolbar offers light/dark. The design system's development-only `alternate`
  theme, and its font/spacing checks, stay in the design-system Storybook, which
  owns that Stage-4 gate; the viewer CSS boundary test already rejects literal
  font values. Nothing new enforces the import rule: relative paths are banned by
  the layout test, and the design system's `exports` map blocks private subpaths.
- **Source conventions (library).** No relative imports. Each package's
  `tsconfig.json` declares `@/*` → `./src/*` (as in `apps/web`) and, for files
  outside `src`, `~/*` → the package root; the viewer adds `~/examples/*` →
  `../../examples/*`. A package's own `dist` is imported by its package name
  (self-reference through `exports`). TypeScript modules are imported without
  `.js`/`.ts` (user request after review); real file names keep their extension
  (`.module.css`, `.json`, `.jsonld?raw`, `.mjs`). All four packages use
  `Bundler` resolution (ujg-jsonld and lint moved from `NodeNext`). Only standard
  tooling resolves the aliases:
  - `tsc-alias --resolve-full-paths` (catalog `1.9.7`; 1.9.9 was two days old)
    runs after each `tsc`, because TypeScript never rewrites `paths` or adds
    extensions in emitted `.js`/`.d.ts`. Published output therefore names every
    internal module `./module.js`, as Node ESM and `nodenext` consumers require.
    A home-made rewrite script was rejected by the user.
  - Vite configs mirror the paths in `resolve.alias`. Vite 8's built-in
    `resolve.tsconfigPaths` (experimental) was tried first but does not reach
    Tailwind's CSS resolver (`@reference "@/styles/tailwind.css"` failed). Library
    builds alias only `@`, so published source cannot use `~`; compiled consumers
    alias only `~` for development data.
  - The design system runs its token scripts, fixture check and Node tests with
    `tsx` (catalog `4.23.15`), which reads tsconfig paths and resolves
    extensionless TypeScript modules. It replaces `--experimental-strip-types`; a
    `registerHooks` mirror like `apps/web/tests/alias.mjs` was used first and
    removed with the extensions, so Node `>=22.13.0` stays the minimum.
  - Prettier `3.9.10` (the `apps/web` version), default options; Markdown, the
    lockfile and `examples/` are excluded. `format:check` starts `pnpm test`.
  - `tests/source-layout.test.mjs` rejects relative `from`/`import()`/`@import`/
    `@reference` specifiers and `.js`/`.jsx`/`.ts`/`.tsx` alias specifiers in
    `packages/*/{src,tests,.storybook,scripts}` and root `tests`. In every built
    `dist` it rejects leftover aliases and relative specifiers that don't end in
    `.js`. Tailwind `@source` globs, `new URL()` file paths and config path strings
    are not imports.
  - The library layout (flat `components/<Name>/` folders) is unchanged by request.
- **README.** Root sections "Source conventions" and "Distribution" (packing, ESM
  only, peers, CSS import order, consumer resolution, CSS typing, `test:consumer`).

## Stage-11A verification evidence — 2026-10-23

- Implemented only Stage 11A over user checkpoints `81c4e40` (library repo) and
  `c342a1f` (`apps/web`). Both have GitHub remotes now (`openuji/journey-viewer`,
  `openuji/journey-viewer-web`); none was added or changed. Library packages,
  examples and the library lockfile are unchanged; only this plan and the root
  README's app setup lines changed here.
- **Alias.** Every `apps/web` path into the library repo goes through the git-ignored
  `apps/web/.journey-viewer`: dependencies `link:.journey-viewer/packages/<lib>`
  (lockfile records the same specs; `node_modules/@journey-viewer/*` link via the
  alias, so re-pointing needs no reinstall), `prepare-example.mjs`, two tests, and
  `fs.allow` (real path) in the Astro and Storybook configs. Locally it is
  `ln -s ../.. .journey-viewer`. A probed dev server read 1,181 paths including
  `references/`, `tests/` and `src/catalog/`, none through `.journey-viewer`, so
  the watcher does not recurse and needs no ignore rule.
- **Cloudflare.** `wrangler.jsonc`: static assets only from `./dist`, name
  `journey-viewer-web`, compatibility date 2026-10-19 (bundled workerd `1.20261019.1`),
  `send_metrics: false` (`wrangler telemetry status`: disabled by config). Added
  `wrangler@4.152.0` (exact) and `workerd` to `allowBuilds`. `build:cloudflare`
  clones the public `https://github.com/openuji/journey-viewer.git` into
  `.journey-viewer`, installs/builds it, then builds the site. Workers Builds needs
  only the build command `pnpm build:cloudflare`; no variables or secrets.
- `apps/web` with the local symlink: frozen install; `pnpm test` **20/20**, 0 Astro/TS
  diagnostics; `pnpm build` (3 pages); `pnpm build:storybook`; `pnpm test:browser`
  **10/10**; `pnpm test:app:browser` **8/8**.
- `wrangler deploy --dry-run` without Cloudflare credentials: exit 0, read the
  assets directory (49 files plus 7 folders), "--dry-run: exiting now".
- `pnpm test:cloudflare` **3/3**: `dist` holds exactly the 3 pages, 4 `_astro`
  files, 2 brand SVGs and the example's 3 JSON files and 37 mapped PNGs; through
  `wrangler dev`, `/`, `/app/` and `/app/examples/solid-oidc/` return 200 HTML,
  `/app` and `/app/examples/solid-oidc` redirect to the slashed path and an unknown
  path is 404; the application suite passes **8/8** against it, including deep-link
  reloads and all 37 image hashes. Wrangler/workerd processes exit afterwards.
- **Clone path.** With the symlink removed,
  `JOURNEY_VIEWER_REPOSITORY=git@github.com:openuji/journey-viewer.git pnpm build:cloudflare`
  cloned `81c4e40`, built the libraries and the site; the dry run and
  `test:cloudflare` (**3/3**, app **8/8**) passed on that output. The clone was
  removed and the symlink restored; a frozen install and build pass again. The
  HTTPS token URL differs only in authentication and was not exercised.
- **First Workers Build (user's).** It failed: the dashboard build command was
  `pnpm run build`, so nothing cloned `.journey-viewer` (ENOENT on the example).
  Reproduced on a fresh clone of the pushed `c78dade`: Cloudflare's auto-install
  passes with dangling alias links, `pnpm run build` fails identically, and
  `pnpm build:cloudflare` (SSH URL) then builds and dry-runs. `SKIP_DEPENDENCY_INSTALL`
  is unnecessary and the script's second site install was redundant; both removed.
  The dashboard build command must be `pnpm build:cloudflare`. The second build ran
  it but had no repository URL; the library repo is now public, so the script clones
  its HTTPS URL directly. Replayed anonymously (no credentials, no variables) on a
  fresh clone of `565a37e`: auto-install, `pnpm run build:cloudflare` and the dry run pass.
- No deploy, publication, staging or commit. `apps/web/package.json` shows as
  modified in this repo's status only because the parent index still tracks it
  (the pending user-owned `git rm -r --cached -- apps/web` handoff).
  Logs: `apps/web/.test-output/stage11a-*.log`.

## Stage-11B verification evidence — 2026-10-24

- Implemented only Stage 11B in `apps/web`, over user checkpoint `e7eb0a9`.
  - The library packages, examples and library lockfile are unchanged.
  - Parent edits: this plan and one selector in the development-only parity
    harness. `packages/viewer/tests/parity.mjs` now finds the app's viewer through
    `[data-application-viewer]` instead of the removed `.app-loaded` class.
  - Details, rationale and full evidence are in `apps/web/PLAN.md` ("Stage-11B
    source layout and formatting").
- **One component tree.**
  - `src/` holds only `pages`, `layouts`, `components`, `styles` and `site`.
  - Each `components/<group>/<Name>/` owns its component, scoped styles,
    stories, studies and private modules; group roots hold only shared modules.
  - The former `app/`, `catalog/`, `brand/` and `browser/` trees are gone, and
    no relative imports remain (`@/` tsconfig alias, with a Node `registerHooks`
    mirror for unit tests).
- **CSS.** Global CSS lives only in `src/styles`.
  - `global.css`: tokens, base and the shared touchpoint palette.
  - `application.css`: the libraries' compiled CSS.
  - Component rules moved into their components. React components use CSS
    modules, and tests use roles or `data-*` hooks.
- **Storybook-Astro.** The framework (1.13.0, the latest release) inlines nested
  styles in static builds only through relative `.astro` imports. A small
  `.storybook/main.ts` build plugin imports aliased children instead, matching
  its dev mode.
- **Formatting and enforcement.** Prettier 3.9.10 with `prettier-plugin-astro`
  1.1.1, default options. `format:check` is part of `pnpm check`.
  `tests/source-layout.test.mjs` enforces the roots, folders, imports and CSS
  placement.
- **Results.**
  - `apps/web` `pnpm test` passes 23/23 with 0 diagnostics; the build produces
    3 pages; the 51 story IDs are unchanged.
  - Against the pre-change build, 55/57 reduced-motion screenshots are
    byte-identical, and the dev Storybook matches 51/51. The two differences are
    the app's "Open file…" button gap at 1440px. It now matches the approved
    10E-a study; previously, library CSS loaded later in the app and overrode
    the component's own rule.
  - `test:browser` 10/10, `test:app:browser` 8/8, `test:cloudflare` 3/3 (app
    8/8) and the Wrangler dry run pass.
  - `pnpm test:parity` passes 7/7 with unchanged metrics.
  - Nothing is staged or committed.

## Stage-11C verification evidence — 2026-10-24

- Implemented only Stage 11C over user checkpoint `d65c7f1`, in this library
  repository. `apps/web` is unedited (its status stays clean). The baseline on the
  clean tree: `pnpm test` green, 73 design-system and 106 viewer stories (index
  files kept for the ID comparison).
- **Conversion.** A throwaway codemod (outside the repository) replaced 577
  relative specifiers in 164 files with `@/`, `~/`, `~/examples/` or the package's
  own name. The three viewer Storybook configs were rewritten by hand. `pnpm format`
  then formatted 163 files. Prettier wrapped three objects under
  `@ts-expect-error`, so those directives moved onto the wrapped property
  (design-system and viewer `readonly.test.ts`).
- **Extensionless modules (follow-up review).** A second throwaway codemod removed
  `.js` (338) and `.ts` (151) from 489 alias specifiers in 129 files whose target
  is a TypeScript module. The remaining extensions are file names: 48 `.css`,
  13 `.mjs`, 1 `.json`, 2 `.json?raw`, 5 `.jsonld?raw`. Before applying it, a
  scratch project confirmed that `tsc-alias --resolve-full-paths` writes
  `./module.js` into JS and declaration-only output, and that `tsx` resolves
  `@/`/`~/` with extensionless targets from `.mjs` scripts and `node:test` files.
  The design system's `allowImportingTsExtensions` and `scripts/alias.mjs` are
  gone. The lockfile only gains `prettier`, `tsc-alias` and `tsx`;
  `pnpm install --frozen-lockfile` passes.
- `pnpm test` passes: format check; **13 ujg, 17 lint, 56 design-system,
  54 viewer**; root **5/5** (3 baseline, 2 layout: no relative imports or module
  extensions in sources; every built specifier is a full `./module.js` path with
  no alias left).
- **CSS.** Design-system `dist/styles.css` shrinks from 31,210 to 29,217 bytes
  and contains none of the seven utilities. The new boundary assertion failed on
  the old output (`.visible`, `.hidden`, …) and passes now; the viewer had none.
- **Storybooks.** `pnpm build:storybook`: 73 stories, IDs identical to the
  baseline. `pnpm build:storybook:viewer`: 33 stories, IDs identical to the
  baseline's `Viewer/` subset; no design-system stories or consumer.
- `pnpm test:design-system:browser` **8/8**; `pnpm test:viewer:browser` **28/28**
  (own stories only, light/dark globals).
- `pnpm test:consumer` **4/4**: tarballs hold only `package.json`, `README.md` and
  `dist`, with no `workspace:`/`catalog:`; the install outside the workspace
  passes; `tsc` with `types: []` passes under bundler and nodenext resolution;
  Node imports all
  four packages, finds 10 journeys and 0 findings in the example, server-renders
  `JourneyViewer` (“App auth journey”) and resolves all 5 CSS exports.
- `pnpm test:parity` **7/7** against the original (5174) and a temporary app dev
  server (stopped afterwards). Metrics are unchanged: first-row offset 56 vs 63px,
  inspector 340/340 and 300/300px, controls 119 vs 120. The paired 1440px and
  columns screenshots were compared visually.
- `apps/web` against the rebuilt libraries: `pnpm test` **23/23**, `pnpm build`
  (3 pages), `test:browser` **10/10**, `test:app:browser` **8/8**.
- Everything above was re-run after the extension change, with the same results.
- `git diff --check` passes. Nothing is staged or committed.

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
  occurrences within one instance. Explicit occurrence context drives the columns
  and the inspector crumb (Stage 10D replaced focus mode and breadcrumbs); it
  assigns no arbitrary parent and adds no per-call-site expansion state. Occurrence paths belong to one document object
  and must be reset on replacement by externally controlled consumers.
  All occurrences of the selected logical identity remain highlighted, while
  the inspector crumb and its navigation use the last chosen occurrence. This is now
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
- Stage 10D's column rows reuse `StateRow` with a decorative caret, so no separate
  focus-row presentation is needed; state overrides still receive the complete
  row contract. The navigation/screen export review is complete: the
  decisions and snapshot-construction guidance are recorded in the Stage-9
  extension contract above and the viewer README. There are no breaking changes.
- Native modal focus restoration captures `activeElement` at mount. On Safari,
  clicking a button need not focus it, so the captured element may differ from
  the opener. Review explicit opener handoff at the browser boundary when scoped.
  Keep current keyboard focus wrapping and restore/fallback behavior meanwhile.
  Example touchpoint colors intentionally reference the design-system's public
  CSS variables; that example coupling remains documented without a new runtime
  color/token resolution abstraction.
- Columns use native horizontal overflow (with inline-size containment).
  Stage 10D composes reveal-on-navigate, the “/” shortcut, outside clicks, preview
  placement and idle preloading in named `browser/` adapters; pure queries and
  controlled components stay free of DOM effects. Only “/” listens on the owning
  document, and the first mounted viewer handles it.
- Stage 11A is complete: the app reaches the libraries and canonical example only
  through `.journey-viewer` and deploys through Wrangler. Stage 11B reorganized its
  source; Stage 11C cleaned up the libraries. Native `JSON.parse`, selected lint rules and
  blocking policy remain explicit
  application operations.
- The initial rules check compact field shapes, node identity uniqueness, and
  target existence/classes. IRI grammar, context meaning, ownership, transition
  locality, boundary mappings, forbidden properties, and outgoing-target
  exclusivity need additional independently supplied rules when required. This
  checkpoint does not introduce a full SHACL/conformance engine or infer overall
  validity from an empty list of findings. Imports are not resolved or fetched.
- Stage 11C made the viewer Storybook self-contained, resolving the accepted
  relative dependency on design-system private development files.

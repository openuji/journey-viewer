# Journey Viewer

A standalone library workspace for viewing User Journey Graph documents, with
an independent Astro landing site and Storybook nested at `apps/web`. The libraries include a captured Solid-OIDC baseline,
readonly document types/pure queries, independently selected lint rules, a
DTCG-driven design system with internal Storybook, static and interactive hierarchy
components, immutable selection/navigation snapshots, an inspector, and controls
for the tree and occurrence-aware columns, search, touchpoint filtering and graph
navigation, screenshot previews/lightbox, and explicit readonly extension descriptors.
Stage 10A adds the site's eye system and animation studies; Stage 10B composes the
landing at `/`. Stage 10C adds the application at `/app/`, the Solid-OIDC route,
local-file reading and application-owned findings. Stage 10D restores the original
`journey-graph` hierarchy layout and behavior in the viewer and design system;
`pnpm test:parity` compares the two side by side while both dev servers run.

## Run

Use Node.js 22.13 or newer and pnpm 11.9.0.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm format
pnpm test:consumer
```

```sh
ln -s ../.. apps/web/.journey-viewer
pnpm --dir apps/web install --frozen-lockfile
pnpm dev
pnpm storybook:web
```

`pnpm build` builds the four parent library packages; `pnpm test` checks the
formatting and source layout and verifies the packages and the captured baseline.
`pnpm format` applies Prettier. `pnpm test:consumer` installs the packed libraries
in a temporary project (see Distribution). None of them includes `apps/web`. The web convenience
commands delegate into that independent project: `pnpm build:app` builds its
Astro landing to `apps/web/dist`; `pnpm build:storybook:web` builds its 45-story
native Astro catalog. See [its README](apps/web/README.md) for all commands.

## Layout

- `apps/web`: independent nested Git/pnpm repository; Astro landing and application,
  local brand tokens/primitives and native Astro Storybook on port 6008. The app
  links the four built public library packages and mounts the React viewer.
- `packages/ujg-jsonld`: readonly source document types and pure data queries.
- `packages/lint`: pure rule runner, with UJG checks in a separate `/ujg` export.
- `packages/design-system`: tokens, shared primitives, hierarchy compositions,
  readonly presentation contracts, independent fixture checks, and Storybook.
- `packages/viewer`: static/controlled hierarchy rendering directly over UJG
  queries, immutable interaction/navigation, derived inspection/highlights,
  explicit occurrence paths and an instance-local React boundary with document-replacement reset.
- `examples/solid-oidc`: exported JSON-LD, provenance, and the behavior baseline.
- `tests`: checks protecting the captured export, the source layout check and the
  external-consumer smoke check with its fixture.
- `PLAN.md`: agreed architecture, stage boundaries, and verification evidence.

There are no placeholder packages. Open `/app/` to choose a local `.jsonld` or
`.json` document, or `/app/examples/solid-oidc/` for the captured example with all
37 screens. Local files stay in tab memory; there is no upload or persistence.
JSON syntax failures are separate from findings. Shape errors and duplicate IDs
block opening; unresolved references are warnings. Rejected replacements leave
the current viewer and its interaction intact. A successful replacement resets
the viewer, including when the document ID is unchanged. The example has explicit
screenshot/presentation inputs; local documents do not inherit them.

The new workspace does not import or link to the source repository. No YAML
compiler, graph store, or deployment tooling is installed at
this checkpoint. The library Storybooks stay internal to the viewer and design-system
packages; the independent site owns its native Astro catalog. The query
and lint packages have no runtime dependencies. Native
JSON parsing, rule selection, and reporting remain separate application operations.
No remote contexts or imports are fetched, and no findings from the selected
checks is not a claim of full UJG conformance.

Read [PLAN.md](PLAN.md) before continuing implementation and
[the baseline notes](examples/solid-oidc/BASELINE.md) before changing the example.
All workspaces are private; publication and deployment are separate later work.

The design system starts with shared `Button`, `IconButton`, `Heading`, `Text`,
`Badge`, and `Surface` primitives. Hierarchy compositions reuse them. DTCG is the
source for namespaced CSS variables and Tailwind utilities; light and dark themes
are selected with scoped `data-jv-theme` attributes.

```sh
pnpm check:tokens
pnpm check:fixtures
pnpm build:design-system
pnpm storybook
pnpm build:storybook
pnpm test:design-system:browser
```

See [the design-system documentation](packages/design-system/README.md) for exports,
primitive ownership, token authoring, theming, and browser-test setup. The site
owns a separate local landing UI. The application composes the built viewer and
design-system primitives/CSS inside a scoped theme without changing the landing.

The viewer has its own Storybook on port 6007 with its own light/dark theme
toolbar, decorator and Vite setup; it imports only the design system's public
exports and shows only viewer stories. It includes
Solid-OIDC, multiple roots/recursion, empty documents, independent interactive
instances, document replacement, and a compiled-consumer iframe for package/CSS
verification. Run:

```sh
pnpm storybook:viewer
pnpm build:storybook:viewer
pnpm test:viewer:browser
```

See [the viewer documentation](packages/viewer/README.md) for its readonly input
contract and root/recursion presentation. `pnpm storybook` still runs the independent
design-system catalog on port 6006. Navigation controls are available in the viewer
stories and compiled consumer. Stage 8 adds screenshot previews, a keyboard
lightbox, and live screenshot-map replacement. The example's
[screenshots.json](examples/solid-oidc/screenshots.json) maps exact UJG Surface IDs
to independent image paths; [touchpoints.json](examples/solid-oidc/touchpoints.json)
supplies separate short labels and token colors. Callers can replace the screenshot
map while retaining the loaded UJG object and its interaction state.
Stage 9 adds caller-supplied inspector panels, annotations and state-row rendering
overrides. Replacing/removing descriptors preserves interaction; removal restores
built-ins. Examples live in the viewer Storybook and compiled consumer. Parsing
and view selection stay explicit in the caller. The Stage-10C app imports native
JSON parsing, independently selected lint rules and `JourneyViewer` explicitly.
Its browser acceptance suite is `pnpm --dir apps/web test:app:browser` after building.

## Source conventions

- Imports never use relative paths. Each package's `tsconfig.json` declares
  `@/*` → `./src/*` and, for files outside `src` (Storybook, tests, scripts,
  tokens), `~/*` → the package root. The viewer adds `~/examples/*` for the shared
  example. A package's own `dist` is imported by its package name.
- TypeScript modules are imported without `.js`/`.ts` (`@/components/Button/Button`);
  real file names keep theirs (`.module.css`, `.json`, `.mjs`). All four packages
  use TypeScript's `Bundler` resolution.
- Tools read the same aliases: `tsc-alias --resolve-full-paths` turns them into
  full `./module.js` paths in each package's tsc output, so published JavaScript
  and declarations work in Node and under `nodenext`; Vite configs mirror them in
  `resolve.alias` (which also serves Tailwind's CSS `@import`/`@reference`); the
  design system runs its Node checks and tests with `tsx`, which reads tsconfig
  paths.
- Prettier formats the repository with default options; Markdown, the lockfile
  and `examples/` are excluded. `tests/source-layout.test.mjs` rejects relative
  imports, `.js`/`.ts` module extensions, and aliases or extensionless paths left
  in built output.

## Distribution

The packages stay private and unpublished, but each one packs into a
self-contained tarball (`pnpm --filter @journey-viewer/viewer pack`) holding only
its manifest, README and `dist`.

- ESM only, with declarations and compiled CSS. Consumers resolve the packages'
  `exports` with TypeScript's `bundler`, `node16` or `nodenext` resolution.
- Peers: `react` ^19.2 for the design system and viewer; `@types/react` is an
  optional peer for TypeScript consumers. The viewer depends on
  `@journey-viewer/ujg-jsonld` and `@journey-viewer/design-system`; their packed
  version is `0.0.0`, so install the tarballs together (with overrides if your
  package manager resolves them from a registry).
- CSS: import `@journey-viewer/design-system/styles.css`, then
  `@journey-viewer/viewer/styles.css`. Both contain only CSS-module classes and
  scoped `data-jv-theme` tokens. `reset.css` is an opt-in global reset;
  `tokens.css` and `tailwind.css` serve consumers that build their own styles on
  the tokens. Typing CSS side-effect imports is the consumer bundler's job (for
  example `vite/client`).
- `pnpm test:consumer` packs all four libraries, installs the tarballs in a
  temporary project outside the workspace, type-checks them without Vite types
  under `bundler` and `nodenext` resolution, server-renders `JourneyViewer` and
  resolves every CSS export. It needs registry access or a warm pnpm store.

## Nested repository ownership

`apps/web` is ignored by this parent and excluded from its pnpm workspace. It has
its own Git metadata, lockfile and dependency versions. Since Stage 11A it reaches
this repository only through its git-ignored `.journey-viewer` alias:
`link:.journey-viewer/packages/...` dependencies on the four built public libraries
and `.journey-viewer/examples/`. Locally the alias is a symlink to this checkout;
Cloudflare's build clones this repository there (see the app README). It does not
rejoin the parent workspace or alias library source. Run the parent install/build
before app checks or development. A fresh parent clone needs that independent
checkout supplied separately before the web convenience commands can run; library
builds/tests require no site checkout.

Six old web files remain tracked in the parent index until you finish the agreed
ownership transfer. From this parent directory, run:

```sh
git rm -r --cached -- apps/web
```

This preserves the files and nested repository on disk. The command is left to
you under the no-staging agreement. No gitlink/submodule, remote or commit was
created. Review parent changes and `git -C apps/web status` independently.

Only the user may commit. Agent changes remain uncommitted for review.

# Journey Viewer

A standalone workspace for viewing User Journey Graph documents. This is the
stage-4 checkpoint: a minimal React application, a captured Solid-OIDC baseline,
readonly document types/pure queries, independently selected lint rules, and a
DTCG-driven design system with internal Storybook. The hierarchy renderer arrives
in stage 5.

## Run

Use Node.js 22.13 or newer and pnpm 11.9.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm build:app
pnpm test
```

`pnpm build` builds all current workspaces. The web build is written to
`apps/web/dist`; run `pnpm --filter @journey-viewer/web preview` to serve it locally.

## Layout

- `apps/web`: minimal Vite/React/TypeScript application.
- `packages/ujg-jsonld`: readonly source document types and pure data queries.
- `packages/lint`: pure rule runner, with UJG checks in a separate `/ujg` export.
- `packages/design-system`: tokens, shared primitives, hierarchy compositions,
  readonly presentation contracts, independent fixture checks, and Storybook.
- `examples/solid-oidc`: exported JSON-LD, provenance, and the behavior baseline.
- `tests`: checks protecting the captured export.
- `PLAN.md`: agreed architecture, stage boundaries, and verification evidence.

Additional package directories will be added when their stages start; there are
no placeholder packages. The app does not consume or render document data yet.

The new workspace does not import or link to the source repository. No YAML
compiler, graph store, viewer, or deployment tooling is installed at
this checkpoint. Storybook stays internal to the design-system package. The query
and lint packages have no runtime dependencies. Native
JSON parsing, rule selection, and reporting remain separate caller operations;
the web app has not been wired to them yet.

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
primitive ownership, token authoring, theming, and browser-test setup. The minimal
web app is unchanged and does not use these components until its assigned stages.

Only the user may commit. Agent changes remain uncommitted for review.

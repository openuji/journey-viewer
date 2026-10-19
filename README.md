# Journey Viewer

A standalone workspace for viewing User Journey Graph documents. This is the
stage-1 checkpoint: a minimal React application and a captured Solid-OIDC baseline.
The hierarchy renderer and other packages arrive in their assigned stages.

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
- `examples/solid-oidc`: exported JSON-LD, provenance, and the behavior baseline.
- `tests`: checks protecting the captured export.
- `PLAN.md`: agreed architecture, stage boundaries, and verification evidence.

The workspace already includes the `packages/*` pattern. Package directories will
be added when their stages start; there are no placeholder packages.

The new workspace does not import or link to the source repository. No YAML
compiler, graph store, lint runner, viewer, Storybook, or deployment tooling is
installed at this checkpoint.

Read [PLAN.md](PLAN.md) before continuing implementation and
[the baseline notes](examples/solid-oidc/BASELINE.md) before changing the example.
All workspaces are private; publication and deployment are separate later work.

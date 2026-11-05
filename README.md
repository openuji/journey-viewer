<p align="center">
  <a href="https://journey-viewer.openuji.org/">
    <img
      src="https://journey-viewer.openuji.org/brand/logo.svg"
      alt="Journey Viewer"
      width="420"
    />
  </a>
</p>

<p align="center">
  <a href="https://github.com/openuji/journey-viewer/actions/workflows/tests.yml">
    <img
      src="https://github.com/openuji/journey-viewer/actions/workflows/tests.yml/badge.svg?branch=main"
      alt="Tests"
    />
  </a>
</p>

Journey Viewer is an open-source web application for exploring
[User Journey Graph](https://ujg.specs.openuji.org/) documents. It turns canonical
UJG JSON-LD into navigable tree and flow views, making journeys, states,
transitions, touchpoints, screenshots, and nested paths easier to understand.

Documents are read and visualised in the browser. Journey Viewer does not rewrite
the source graph, fetch remote JSON-LD contexts, or upload local files to a server.

[Open Journey Viewer](https://journey-viewer.openuji.org/app/)

## Install

Install the application package and its React peers:

```sh
pnpm add @journey-viewer/app react react-dom
pnpm exec journey-viewer --help
```

The renderer, design system, JSON-LD utilities, lint checks, and flow layout are
also published separately under the `@journey-viewer` scope.

## Examples

- [Solid-OIDC](https://journey-viewer.openuji.org/app/examples/solid-oidc/) — an
  authentication journey with nested paths, touchpoints, and 37 interface
  screenshots. [View the source](examples/solid-oidc/solid-oidc.ujg.jsonld).

## Development

Journey Viewer is a pnpm workspace and requires Node.js 22.13 or newer and
pnpm 11.9.0.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

The component catalogues are available through Storybook:

```sh
pnpm storybook          # design system
pnpm storybook:viewer   # viewer
pnpm storybook:app      # complete application
```

## Packages

- `@journey-viewer/app` — document loading, validation, application shell, and
  static-site generation.
- `@journey-viewer/viewer` — interactive Tree and Flow presentations.
- `@journey-viewer/design-system` — shared tokens, primitives, and journey
  components.
- `@journey-viewer/ujg-jsonld` — readonly UJG types, queries, and graph projection.
- `@journey-viewer/lint` — independently selectable UJG checks.
- `@journey-viewer/flow-layout` — dependency-free layered flow layout.

Package-specific usage and APIs are documented in each package directory.
Maintainer release instructions are in [Publishing](docs/publishing.md).

## License

Journey Viewer is available under the [MIT License](LICENSE), copyright 2026
Open User Journey Initiative.

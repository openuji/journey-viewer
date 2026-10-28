# Flow-chart spike

An isolated Storybook study of a flow-chart view of User Journey Graphs, beside the existing Tree
and Columns. It uses only the unchanged Solid-OIDC sample and the libraries' built public exports.
It is not an application feature. Findings and the recommendation are in [REPORT.md](REPORT.md).

## Run

From the repository root, with the root workspace installed:

```sh
pnpm --dir flow-spike install
pnpm --dir flow-spike prepare:libraries   # builds ujg-jsonld, design-system and viewer dist
pnpm --dir flow-spike dev                 # Storybook on http://127.0.0.1:6016
```

## Checks and evidence

```sh
pnpm --dir flow-spike test           # projection and layout invariants (Node, text estimator)
pnpm --dir flow-spike measure        # own engine vs ELK per disclosure scope → evidence/metrics.json
pnpm --dir flow-spike build          # tsc + static Storybook
pnpm --dir flow-spike capture        # browser evidence from the static build → evidence/*.png, browser.json
pnpm --dir flow-spike format:check
```

`capture` needs Playwright's Chromium (`pnpm --dir flow-spike exec playwright install chromium`)
or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

## Layout of the folder

- `src/model/` — the projection of canonical UJG plus the shared `ViewerInteraction` into a flow
  scene, the active journey path, and presentation helpers (detail presets, highlights). Pure.
- `src/layout/` — the composer (frames bottom-up, ports), the spike's own layered engine and
  channel router, the measure-only ELK adapter and the artifact metrics. Pure.
- `src/components/` — `primitives/` (state node, composite card, contract glyph, connector),
  `flow/` (scene, journey path) and `study/` (the study, stakeholder details, engine
  comparison), one folder per component with its CSS module and stories.
- `src/browser/` — DOM boundaries: canvas text measurement and the viewport (scrolling, fit,
  keeping a toggled card in place, the disclosure transition, revealing a returned-to journey).
- `PRODUCT.md`, `DESIGN.md`, `.impeccable/` — Impeccable context for styling conformance.

The empty `pnpm-workspace.yaml` keeps this folder out of the parent workspace. ELK is a
devDependency used only by `measure` and the engine-comparison story, never by the flow canvas.

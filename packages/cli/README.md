# journey-viewer

`journey-viewer` turns a User Journey Graph JSON-LD document into a
[Journey Viewer](https://journey-viewer.openuji.org/) site: a folder you can
deploy to any static host, one HTML file that opens straight from disk, or a
local server. The document is read and drawn in the browser; nothing is
rendered ahead of time.

```sh
npx journey-viewer run checkout.jsonld
```

It needs Node.js 22.13 or newer. To keep the command in a project, add it as a
development dependency and call it with `pnpm exec journey-viewer` (or
`npx journey-viewer`).

## Generate or run a document

```sh
# Write a static site for the document, ready to deploy.
npx journey-viewer generate checkout.jsonld \
  --screenshots screenshots.json \
  --touchpoints touchpoints.json \
  --out public/checkout

# Or write one self-contained file that opens directly from disk.
npx journey-viewer generate checkout.jsonld \
  --screenshots screenshots.json \
  --touchpoints touchpoints.json \
  --inline \
  --out portable/checkout

# Generate it and serve it locally with Vite until Ctrl+C.
npx journey-viewer run checkout.jsonld --screenshots screenshots.json
```

- `--screenshots <file>` maps Surface IDs to image paths or URLs.
- `--touchpoints <file>` gives Touchpoint IDs a short label and a color.
- `--out <folder>` is the new or empty folder to write (`generate`:
  `journey-viewer`; `run`: a temporary folder, removed when it stops).
- `--inline` puts the application, inputs and local screenshots in `index.html`.

### Try it with the Solid-OIDC example

From the repository root, after `pnpm build` (or
`pnpm --filter journey-viewer... build` once you change this package):

```sh
# Generate and serve; open the printed address. Ctrl+C stops it and removes the
# temporary folder (add --out tmp/solid-oidc to keep it).
node packages/cli/dist/cli.js run examples/solid-oidc/solid-oidc.ujg.jsonld \
  --screenshots examples/solid-oidc/screenshots.json \
  --touchpoints examples/solid-oidc/touchpoints.json

# Only write the deployable folder. tmp/ is git-ignored; remove the folder before
# generating into it again.
node packages/cli/dist/cli.js generate examples/solid-oidc/solid-oidc.ujg.jsonld \
  --screenshots examples/solid-oidc/screenshots.json \
  --touchpoints examples/solid-oidc/touchpoints.json \
  --out tmp/solid-oidc
```

The workspace does not link the package's own bin, so these call the built
`cli.js` directly; an installed copy runs the same with `npx journey-viewer`.

## What it writes

`generate` writes a new or empty folder (`journey-viewer` by default):

```text
public/checkout/
  index.html, assets/   the prebuilt site, unchanged
  journey/
    source.json         the document's name and the files below
    document.jsonld     the document, unchanged
    screenshots.json    the screenshot map, unchanged (optional)
    screens/…           the local images the map names, at the same relative paths
    touchpoints.json    the touchpoint presentation, unchanged (optional)
```

With `--inline`, it writes only `index.html`. The application code, CSS, icon,
document, presentation maps and every local screenshot are embedded in that
file. It can be opened directly with `file://` by double-clicking it; no local
server or other runtime is needed. Screenshot URLs with a non-file scheme such
as `https:` remain URLs, so those resources still require their original
network access.

`run` takes the same options. It generates into a temporary folder, removed when
it stops, unless `--out` names one to keep, and serves it with Vite's preview
server like a static host: a missing file answers 404. It prints the address
(`http://localhost:4173/`, or the next free port).

Nothing is rendered ahead of time. In the default output, the browser reads
`journey/source.json`, then the document, parses and checks it, and derives the
graph in memory. Every URL is relative, so the folder works on any static host
and under any path. Browsers do not let that default output's module script and
`fetch` calls read local files; use `--inline` for a double-clickable page or
`run` for a local server.

- Screenshot paths resolve against the map's own folder, as in the browser. Local
  paths must stay inside that folder; URLs with a scheme (`https:`, `data:`) are
  left as they are and are not copied.
- Before anything is written, the command checks that the screenshot map maps
  Surface IDs to paths, that every local image is a file, and that the touchpoint
  presentation maps Touchpoint IDs to an optional `shortLabel` and `color`. A
  copy that still fails removes what it wrote, so a retry can use the same folder.
  The command refuses a folder that is not empty.
- "Upload UJG" in the page still replaces the document with a local one, which
  stays in the tab's memory. A rejected file keeps the open journey.
- The prebuilt site without a `journey/` folder opens on the empty state and reads
  local files only, also on hosts that answer a missing file with the page.

"Download UJG assets" in the page saves a ZIP whose extracted files can be passed
back to `generate` with `--screenshots` and `--touchpoints`.

## How it works

This package only launches. The site it writes is the prebuilt application that
[`@journey-viewer/app`](../app) ships (its `site/*` export, built with relative
URLs), and the checks on the screenshot map and touchpoint presentation come
from that package too (`@journey-viewer/app/generated-site`), so the command and
the page agree on what a generated site contains. `src/generate.ts` copies the
site beside the document, or inlines it; `src/run.ts` serves the result with
Vite's preview server. To embed the application in your own React page instead,
use `@journey-viewer/app`.

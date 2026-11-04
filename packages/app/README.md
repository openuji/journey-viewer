# Journey Viewer application

`@journey-viewer/app` is the Journey Viewer application: it reads a User Journey
Graph JSON-LD document, checks it with the application's policy, reports the
outcome in its header and shows the document in the viewer's Tree and Flow
views. Tree offers Rows and Columns layouts. It ships as React components and as a prebuilt static site with a
command that puts a document beside it.

## Generate or run a document

```sh
# Write a static site for the document, ready to deploy.
journey-viewer generate checkout.jsonld \
  --screenshots screenshots.json \
  --touchpoints touchpoints.json \
  --out public/checkout

# Generate it and serve it locally with Vite until Ctrl+C.
journey-viewer run checkout.jsonld --screenshots screenshots.json
```

Until the packages are published, install the packed tarballs (see the root
README's Distribution) and run the bin with `pnpm exec journey-viewer`.

### Try it with the Solid-OIDC example

From the repository root, after `pnpm build` (or
`pnpm --filter @journey-viewer/app... build` once you change this package):

```sh
# Generate and serve; open the printed address. Ctrl+C stops it and removes the
# temporary folder (add --out tmp/solid-oidc to keep it).
node packages/app/dist/cli/cli.js run examples/solid-oidc/solid-oidc.ujg.jsonld \
  --screenshots examples/solid-oidc/screenshots.json \
  --touchpoints examples/solid-oidc/touchpoints.json

# Only write the deployable folder. tmp/ is git-ignored; remove the folder before
# generating into it again.
node packages/app/dist/cli/cli.js generate examples/solid-oidc/solid-oidc.ujg.jsonld \
  --screenshots examples/solid-oidc/screenshots.json \
  --touchpoints examples/solid-oidc/touchpoints.json \
  --out tmp/solid-oidc
```

The workspace does not link the package's own bin, so these call the built
`cli.js` directly; an installed copy runs the same with `pnpm exec journey-viewer`.

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

`run` takes the same options. It generates into a temporary folder, removed when
it stops, unless `--out` names one to keep, and serves it with Vite's preview
server like a static host: a missing file answers 404. It prints the address
(`http://localhost:4173/`, or the next free port).

Nothing is rendered ahead of time. The browser reads `journey/source.json`, then
the document, parses and checks it, and derives the graph in memory. Every URL is
relative, so the folder works on any static host and under any path. Opening
`index.html` from the file system does not work, because browsers do not let
module scripts and `fetch` read local files; use `run` for a local look.

- Screenshot paths resolve against the map's own folder, as in the browser. Local
  paths must stay inside that folder; URLs with a scheme (`https:`, `data:`) are
  left as they are and are not copied.
- Before anything is written, the command checks that the screenshot map maps
  Surface IDs to paths, that every local image is a file, and that the touchpoint
  presentation maps Touchpoint IDs to an optional `shortLabel` and `color`. A
  copy that still fails removes what it wrote, so a retry can use the same folder.
  The command refuses a folder that is not empty.
- "Open file…" still replaces the document with a local one, which stays in the
  tab's memory. A rejected file keeps the open journey.
- The prebuilt site without a `journey/` folder opens on the empty state and reads
  local files only, also on hosts that answer a missing file with the page.

## Components

```tsx
import { Application } from "@journey-viewer/app";
import "@journey-viewer/design-system/styles.css";
import "@journey-viewer/viewer/styles.css";
import "@journey-viewer/app/styles.css";

<Application
  source={{
    name: "Solid-OIDC example",
    document: "/examples/solid-oidc/solid-oidc.ujg.jsonld",
    screenshots: "/examples/solid-oidc/screenshots.json",
    touchpoints: "/examples/solid-oidc/touchpoints.json",
  }}
  brand={<a href="/">Home</a>}
  alternatives={<a href="/examples/">explore an example</a>}
/>;
```

- `source` is read once, on mount. Relative URLs resolve against the page;
  screenshot paths resolve against their map's URL. Without a source the
  application opens on its empty state.
- `brand` leads the header, followed by a divider; `alternatives` sits below the
  empty state's file button. Both are optional and style themselves.
- The application sets the light theme on its root and renders the header (with
  the page's `h1`) and the `main` landmark `#application`, so a page can offer a
  "Skip to viewer" link.

The viewer arrangement lives in one file,
`src/components/ApplicationViewer/ApplicationViewer.tsx`: the explorer bar with
the document's counts, the Tree | Flow switch, the touchpoint filter, search and
reset. The composition places Tree's Rows | Columns icons with tooltips in the bar,
followed by expand/collapse in Rows; Flow's
placement, zoom and key sit beside its journey path, with expand/collapse in the
explorer bar. Switching views preserves the tree layout, selection and expansion.
Change the arrangement there.

The viewer opens collapsed, like every viewer: the first root journey with its
states, every composite closed. Expand all, Collapse all and the chevrons open and
close the rest.

The header leads with the Journey Viewer icon as a home link (`BrandLink`, 22px,
followed by a divider), as `apps/web` places it. In a generated site it links to
the site's own folder (`./`); the icon is also the page's favicon and ships inside
`assets/`, so it adds no request outside the folder. `Application` takes it in its
`brand` slot: `<Application brand={<BrandLink href="./" />} />`.

The pieces are exported for compositions of their own: `ApplicationHeader`,
`ApplicationEmpty`, `BrandLink`, `useFilePicker`, `readSource`, and the check policy
`checkDocument`, `blocksOpening` and `findingPath`. The policy first reads the UJG
version from the document's contexts: a version the app cannot read (anything but the
Editor's Draft, mixed versions, or no UJG context) blocks opening with one
`app/ujg-version` finding, and the open document stays. For the Editor's Draft it
selects the document-shape, unique-ID and reference-target rules; shape errors and
duplicate IDs block opening, and unresolved references are warnings. A ready check
carries the `graph` the viewer renders, derived once per load. No findings is not a
claim of full UJG conformance.

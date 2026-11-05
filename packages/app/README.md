# Journey Viewer application

`@journey-viewer/app` is the Journey Viewer application: it reads a User Journey
Graph JSON-LD document, checks it with the application's policy, reports the
outcome in its header and shows the document in the viewer's Tree and Flow
views. Tree offers Rows and Columns layouts. It ships as React components and as a prebuilt static site with a
command that puts a document beside it.

Install the application and its React peers from npm:

```sh
pnpm add @journey-viewer/app react react-dom
pnpm exec journey-viewer --help
```

## Generate or run a document

```sh
# Write a static site for the document, ready to deploy.
journey-viewer generate checkout.jsonld \
  --screenshots screenshots.json \
  --touchpoints touchpoints.json \
  --out public/checkout

# Or write one self-contained file that opens directly from disk.
journey-viewer generate checkout.jsonld \
  --screenshots screenshots.json \
  --touchpoints touchpoints.json \
  --inline \
  --out portable/checkout

# Generate it and serve it locally with Vite until Ctrl+C.
journey-viewer run checkout.jsonld --screenshots screenshots.json
```

An installed copy exposes the command as `journey-viewer`; with pnpm, invoke it
as `pnpm exec journey-viewer`.

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
- "Upload UJG" still replaces the document with a local one, which stays in the
  tab's memory. A rejected file keeps the open journey.
- The prebuilt site without a `journey/` folder opens on the empty state and reads
  local files only, also on hosts that answer a missing file with the page.

## Upload and download

**Upload UJG** opens a single `.jsonld` or `.json` file locally, replacing the
current journey after it passes the application's checks. Files stay in the
browser tab's memory; the action does not send them to a server or import ZIPs.

The adjacent download icon, **Download UJG assets**, saves
`<document-stem>-ujg-assets.zip`. It contains the original document text as
`document.jsonld`, `screenshots.json`, `touchpoints.json`, and all mapped images
under `screens/`. The screenshot map uses relative paths into the archive;
shared images are included once. Missing presentation inputs become empty maps.
The extracted files can be passed to `journey-viewer generate` with its existing
`--screenshots` and `--touchpoints` options.

Screenshots are fetched when download is requested, including remote images
whose hosts permit browser access. If any image cannot be fetched, no ZIP is
downloaded: the header identifies the failed image and offers a retry through
the same button. Selecting another upload cancels preparation. Download is
disabled while no document is open, a replacement is being read, or an archive
is being prepared. Export progress and errors do not replace document findings.

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
  the page's `h1`), the `main` landmark `#application` and a compact project footer,
  so a page can offer a "Skip to viewer" link. The footer links to the MIT license,
  the Journey Viewer repository and the Open User Journey Initiative; it stays in
  normal document flow and does not cover the viewer.

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
`checkDocument`, `blocksOpening` and `findingPath`. `ApplicationHeader` accepts
optional `onDownloadAssets`, `isDownloading` and `downloadError` props; without
a download callback its download control is disabled. The existing `onOpenFile`
callback still opens the shared picker.

The policy first reads the UJG
version from the document's contexts: a version the app cannot read (anything but the
Editor's Draft, mixed versions, or no UJG context) blocks opening with one
`app/ujg-version` finding, and the open document stays. For the Editor's Draft it
selects the document-shape, unique-ID and reference-target rules; shape errors and
duplicate IDs block opening, and unresolved references are warnings. A ready check
carries the `graph` the viewer renders, derived once per load. No findings is not a
claim of full UJG conformance.

## Storybook

The package owns an internal React Storybook on port **6009**, following the
viewer catalog's conventions: typed CSF stories colocated with each component,
shared development fixtures under `.storybook/`, public design-system/viewer
imports, light/dark theme controls, and accessibility tooling.

```sh
# From the repository root:
pnpm storybook:app
pnpm build:storybook:app
pnpm test:app:storybook
```

The `App` catalog contains stories for `Application`, `ApplicationHeader`,
`ApplicationEmpty` and the internal `ApplicationViewer`. `BrandLink` is used in
compositions and has no standalone story. The header covers reading, findings,
read/syntax/version errors, export progress/failure and long document names.
The full application stories support real local upload and ZIP download using
the unchanged Solid-OIDC example and its 37 screenshots. Isolated header and
empty-state callbacks log events in Storybook's Actions panel.

`Application` owns its light theme; the theme toolbar applies to the isolated
components. Changing its `source` control remounts the application, matching its
read-on-mount contract. Storybook helpers, stories and dependencies stay outside
the package's production exports and prebuilt site.

Inside this package, the equivalent commands are `pnpm storybook`,
`pnpm build:storybook` and `pnpm test:storybook` (the last runs against a built
catalog). Set `APP_STORYBOOK_URL` to a running development catalog to reuse its
server during browser checks.

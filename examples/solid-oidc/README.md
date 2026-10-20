# Solid-OIDC example inputs

- `solid-oidc.ujg.jsonld` is the canonical graph. Its bytes remain unchanged from
  the source capture.
- `screenshots.json` is a plain JSON object mapping exact UJG Surface IDs to one
  screenshot path each. It contains all 37 captured PNGs in `screens/`.
- `touchpoints.json` independently maps exact touchpoint IDs to optional
  `shortLabel` and `color` strings. Colors reference the design system's DTCG
  category variables.
- `baseline.json` and `BASELINE.md` record migration provenance and checksums.
  They are verification evidence, not runtime inputs.

The host reads and parses each input separately with native `JSON.parse`. Resolve
relative screenshot paths against an explicit mapping-document or asset base,
independently of the UJG location. Viewer Storybook serves this directory at
`/solid-oidc/` and resolves paths against that URL in its development boundary.
The reusable viewer neither reads these files nor derives filenames from IDs.

Pass the resolved map to `JourneyViewer.screenshots`. Replacing it updates row
actions, previews, search availability and an already open lightbox while keeping
the same graph object and interaction state. Removing an entry shows an
unavailable image; restoring it recovers the preview. For new bytes at an existing
URL, supply a revised query URL or a new blob URL according to the host's cache
policy. The viewer adds no cache busting or file watcher. File-loading UI belongs
to the later application stage.

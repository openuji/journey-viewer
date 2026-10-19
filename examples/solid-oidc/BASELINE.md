# Solid-OIDC hierarchy baseline

Captured on 2026-10-19 from `journey-graph` commit
`6d9deaf0b57ba59fc22d232ca25bc999e1ce365e`. That repository remains unchanged.
Its original location is `../specs/solid-oidc/journey-graph` relative to the new
repository root.

## Data and provenance

`solid-oidc.ujg.jsonld` is the exact output of the original
`compileUjgYamlToJsonLd` function, with document IRI `urn:ujg:solid-oidc` and
two-space JSON formatting plus a final newline. This was a one-time migration
using the existing source exporter, not a compiler added to this repository.

`baseline.json` records the source commit and paths, SHA-256 values for the source
document/exporter/parser and exported bytes, root and initial-state IRIs, and the
original 37 PNG asset identities/checksums. Its screen records are migration
evidence, not a runtime model or presentation configuration. Screenshots are not
copied yet; stage 8 will copy them and provide explicit presentation mappings.

| Item | Count |
| --- | ---: |
| Journeys | 10 |
| States, including 9 composites | 47 |
| Transitions | 120 |
| Surfaces with screenshot assets | 37 |

The source also exports 20 journey entries, 24 journey exits, and 7 touchpoints.
Full node IRIs and source serialization order are retained. The export adds no
parent links, screenshot URLs, or normalized hierarchy objects. Serialization
order remains display data, not inferred traversal.

## Behavior to preserve in later stages

- The initial view is the tree/overview with all journeys expanded. Its initial
  selection is `urn:ujg:solid-oidc:app-sign-in-required` in
  `urn:ujg:solid-oidc:app-auth-journey`, through the `app-auth-entry` default entry.
- Tree selection reveals ancestors and, for composite selection, the child
  journey. Expand/collapse all operate on the hierarchy. Entry/exit selection opens
  the corresponding contracts. Columns/focus follows the selected nested scope.
- The SMS nested scope appears under app auth, IdP auth, and MFA challenge. A
  touchpoint filter distinguishes matching/nonmatching journeys; it does not
  rewrite graph topology.
- Hover takes precedence over selection for incoming/outgoing row highlighting.
  Repeated hover does not produce a new meaningful interaction state.
- The inspector shows selection identity, breadcrumbs, applicable touchpoint,
  incoming/outgoing transitions, boundary entry/exit annotations, call sites,
  parent continuation handlers, and available screenshot.
- Representative boundary contracts remain explicit: `app-starts-idp-auth` uses
  `toEntryRef` for `idp-login-entry`; `app-continues-after-idp-failed` uses
  `fromExitRef` for `idp-auth-failed`.
- Search includes journeys/states and screenshot availability. Empty/whitespace
  queries yield no results; results are capped at 18. Searching `SMS` includes the
  SMS message scope and its presented-message state.
- Screen preview, inspector screenshot, and lightbox refer to the same asset.
  Lightbox traversal follows the source display order, wraps over 37 screens, and
  updates selection. The first screen is `app-sign-in-required`; the last is
  `pod-support`. Opening a screen does not implicitly open its child journey.
- Switching documents or resetting restores initial interaction state. The new
  implementation must preserve these outcomes using immutable local snapshots,
  without carrying over the source registry/store architecture.

The source model/store/preview-placement suites passed all **29 tests across
3 files** at capture time. These notes describe observed source behavior; they do
not establish semantic constraints for every valid UJG document.

## Source references

All paths below are relative to the original repository, at the pinned commit:

- `apps/graph-studio/src/components/JourneyHierarchyMap`: implementation, CSS,
  stories, model/store tests, and preview-placement tests.
- `apps/graph-studio/src/components/SiteChrome`: original shared page layout.
- `apps/graph-studio/src/styles`: original theme tokens and globals.

The new repository's `pnpm test` checks the exported bytes, baseline counts, and
representative entry/exit contracts. It is a regression check for this captured
example, not an implementation of the future lint runner or UJG query package.

# Flow-chart spike — report

Date: 2026-10-27. Data: the unchanged Solid-OIDC sample (10 journeys, 47 states, 120
transitions, 20 entries, 24 exits, 37 screens) plus four existing viewer and ujg-jsonld test
fixtures for UJG cases the sample lacks. Reference: ebremer/lws-ujg `web/flow.js` at `280beec`.

## Recommendation

**Keep the flow chart as an optional third view beside Tree and Columns, built on this spike's
composition model: frames grow from their cards, contracts sit on borders, one connector per pair
of blocks, and one shared interaction state. Use the own layout engine; do not adopt elkjs.**
The decisive fix for the reference's line artifacts is the per-level composer, not the choice of
engine. The own engine wins on the things the user named (no ambiguous overlaps, contracts on
borders, the card staying the frame's corner, stable sibling order) and on cost (synchronous,
3–4× faster, no 1.6 MB dependency). It loses on raw crossing counts in the largest disclosures.

Scope the view honestly: it reads well for one journey with its composites closed and for one
open composite. With nested composites open (IdP plus MFA, or everything), it becomes a dense
wiring diagram that complements the Tree rather than replacing it.

## Before and after, on the same data

The reference viewer was served locally with the Solid-OIDC JSON-LD in place of its LWS data:
`evidence/reference-flow-collapsed-1440.png`, `reference-flow-errors-1440.png`,
`reference-flow-idp-open-1440.png`. It hides tag-matched error and recovery paths by default.
This spike always draws every transition, so at equal zoom it carries more lines.

| User's point | Reference on Solid-OIDC | Spike |
| --- | --- | --- |
| 1. Several lines between one pair of blocks | Five lines Sign-in required → IdP card; six Login → MFA | One connector per pair of terminals (`×N` at Spec detail); every transition is in exactly one bundle (unit tested, all 11 scopes) |
| 2. Disclosure loses overview and identity | Opening re-fits the view; the open frame has a small `▾` header unlike the card | The same card is the open frame's top-left corner, toggle in place; the card stays on screen within 0.5px on collapse, expand and nested expand; a context strip names enclosing open frames with their collapse action |
| 3. Line artifacts | Diagonal joins across hierarchy levels, lines through group headers | No diagonals, no lines through blocks, no off-port border crossings, no ambiguous overlaps in any scope; see residual steps below |
| 4. Entries/exits look like states | Green ▶ and violet ⇥ pills, sized like states | Statechart glyphs on frame borders: entry circle (filled = default) on the top border, exit circled-× on the bottom border, plain captions |

Captures: `flow-collapsed-1440.png`, `flow-idp-open-1440.png` (also `-dark`, `1099`, `375`),
`flow-mfa-open-anchored-1440.png`, `flow-context-strip-1440.png`,
`flow-everything-open-spec-1440.png`, `flow-everything-open-fit-1440.png`, and the primitive
studies `card-both-states.png`, `contracts-entries.png`, `contracts-exits.png`, `connectors.png`.

## Point 3: own engine or elkjs

Both engines receive identical input from the same composer: one journey level at a time, open
composites as fixed boxes with fixed ports, bundled connectors. Raw numbers are in
`evidence/metrics.json` (estimator text metrics, Node; median of 7 warm runs).

| Scope | Own: jogs / overlaps / crossings / ms | ELK, merged edges: jogs / overlaps / crossings / ms | ELK, unmerged: jogs / overlaps / crossings |
| --- | --- | --- | --- |
| All collapsed | 0 / 0 / 0 / 0.6 | 0 / 1 / 0 / 6.9 | 2 / 0 / 1 |
| IdP open | 0 / 0 / 49 / 11.1 | 2 / 76 / 5 / 28.3 | 2 / 0 / 49 |
| IdP + identity consent | 0 / 0 / 56 / 11.2 | 1 / 63 / 10 / 32.2 | 3 / 0 / 50 |
| IdP + resource consent | 1 / 0 / 86 / 12.0 | 0 / 56 / 15 / 34.1 | 4 / 0 / 62 |
| IdP + MFA | 1 / 0 / 124 / 14.9 | 1 / 95 / 32 / 43.2 | 7 / 0 / 87 |
| IdP + MFA + one channel (5 scopes) | 1 / 0 / 119–135 / ~15 | 1–3 / 79–104 / 26–36 / ~43 | 4–8 / 0 / 84–87 |
| All open | 0 / 0 / 157 / 16.0 | 2 / 32 / 82 / 67.1 | 9 / 0 / 93 |

Diagonals, lines through blocks and off-port border crossings are zero for both engines in every
scope: per-level composition removes the cross-hierarchy routing that produced the reference's
kinks. What differs:

- **Ambiguous overlaps.** ELK's few crossings come from `mergeEdges`, which runs unrelated
  connectors along shared segments (up to 104 overlaps), so a reader cannot tell which line goes
  where. Without merging, ELK's crossings match the own engine on IdP (49) and are lower in the
  large scopes (84–93 vs 119–157), with 2–9 jogs per scope.
- **Control.** ELK puts entries in a first layer below the card instead of on the border, so the
  parent's arrows end at the frame edge while the glyphs sit lower (`engines-idp-open-1440.png`).
  The own engine pins the card to the corner, keeps sibling order when a composite opens (tested),
  never draws ambiguous buses, and routes returns into a frame through one shared lane per side.
- **Cost.** The own engine is synchronous and deterministic, 0.6–16 ms per layout here versus
  7–67 ms; ELK adds 1.6 MB (`elk.bundled.js`). The own layout source is about 2.3k formatted lines.
- **Weakness.** Crossing minimisation is simpler than ELK's: about 1.3–1.7× ELK-unmerged
  crossings in the largest scopes.

**Residual steps.** In 7 of 11 scopes one connector keeps an 8–9px step where several chains to
IdP's left exits are packed against the frame's left padding (Node estimator). They are pinned in
`tests/layout.test.ts` so any change is noticed. In the browser, with real text metrics, the
captured stories show none (`evidence/browser.json`). Removing them for certain needs a globally
optimised horizontal placement (Brandes–Köpf or a small constraint solver), which this spike did
not build. "Jog" here means an interior segment under 16px: shorter steps turn into S-curves once
corners are rounded (6px), which is what read as kinks in the reference.

## UJG scope fit

- **Boundaries follow the Editor's Draft.** `toEntryRef` lands on its entry port. An arrival
  without one uses the single child's `defaultEntryRef` (16 OIDC transitions, hollow arrowhead at
  Spec detail) or else the composite's card; entries are never inferred from order.
  `fromExitRef` leaves from its exit port.
- **Recursion** stops with a marker on the card and no toggle (viewer `hierarchy` fixture).
- **Several child journeys** of one composite open as sibling frames with no edges between them
  (`screens` fixture); their ports lie on the composite's border.
- **Childless composites** have no toggle; **outgoing navigation** is a count marker on its state,
  never an edge (ujg-jsonld `minimal` fixture).
- **Shared state.** Tree, Columns and Flow use one `ViewerSnapshot`: a selection in the Tree is the
  selected Flow node, IdP stays open, and returning keeps it (browser check). Selecting a closed
  composite opens it, exactly as in the Tree; disclosure is never restricted.
- Canonical objects are kept by reference; no topology is invented. Not evaluated: multiple root
  journeys with cross-root reuse at scale, commands, multi-instance states, imports.

## Detail levels

Stakeholder detail shows the flow, screen access (all 37 screens open in the public lightbox)
and a compact step card without identifiers or tags. Spec detail adds `×N` chips, default-entry
marks, outgoing-navigation markers and the full public inspector. Switching changes presentation
only: node geometry is identical across the switch (browser check).

## Styling conformance (Impeccable)

PRODUCT.md and DESIGN.md ("The Quiet Map") were written from the design system before any UI
code; every colour comes from `--jv-*` tokens, light and dark. One spike-local value,
`--flow-connector` (the `subtle` token mixed 80% with `surface`), keeps meaningful lines at
3.25:1 against paper in light and 4.98:1 in dark (WCAG 1.4.11 asks 3:1); the design system's
`border-strong` (1.78:1 in light) and the reference's `#a3a9b6` (2.36:1) do not. Proposed token:
`color.connector`.

**Critique** (two isolated assessments; snapshot in `.impeccable/critique/`): 24/40, "Acceptable".
Specific to this product while collapsed: the card that becomes its frame's corner, border glyphs and
the context strip are not category defaults. Open frames turn into a line web. The detector found
nothing in `src`. The browser overlay flagged Inter as an overused font, which is the design
system's own face, and a flat type hierarchy, a false positive from hidden SVG tooltips.

**Polish**, from its P1/P2 findings:

- Unrelated connectors rest at 1px (same colour, so contrast holds) while the selection's lines
  carry the relation colours at 2px.
- Blocks render in reading order, so Tab follows the flow.
- Clicking a connector selects where it starts, so the inspector lists its transitions.
- `×N` and `↗N` marks use the 12px caption token; the chip sits on the line's longest run.
- A Key lists only the marks visible at the current detail.
- Exits became a ring with a centre: ⊗ read as failure on "IdP auth success".
- The card toggle became the tree's chevron at a 30px target.
- The closed card's stacked edge was removed; it read as a hard offset shadow.
- Stakeholder "Leads to" groups transitions by destination.

**Audit** after polish: 15/20, "Good". Detector clean, no colour literals, axe clean on seven
page/theme combinations, focus visible (5.9:1 light, 8.3:1 dark), all text at least 4.5:1.

| Dimension | Score | Key finding |
| --- | --- | --- |
| Accessibility | 3 | Connections are announced only through the inspector's lists; there is no arrow-key traversal along the flow |
| Performance | 3 | Layout 0.6–16 ms, re-run only on document or expansion change; ELK stays out of the canvas bundle |
| Theming | 4 | Tokens only; dark theme verified; one documented spike-local mix |
| Responsive | 2 | No page overflow at 375px, but the toolbar wraps to three rows; diagram reading on phones is not established |
| Implementation integrity | 3 | Coherent, product-specific grammar; the remaining density is the topology itself |

Open items: P2 arrow-key traversal and screen-reader exposure of connections, P2 a compact
toolbar under 768px, P3 a legibility floor or structural mode for Fit, P3 contract buttons are
22px tall (they pass WCAG 2.5.8 by spacing, not size).

## Limits

- The full disclosure fits only at 36% scale on a 1440px viewport; readable work happens at
  100% with scrolling and the context strip. Mobile diagram use is not claimed; Tree/Columns stay
  the mobile reading views.
- No user study: comprehension and speed benefits are not measured.
- The source grew to about 5.9k lines including stories and styles (plan estimate: 2.6k), mostly
  in the router's placement repairs.

## Next step, if taken forward

A separately scoped stage: move the primitives into the design system, the projection and
composer into the viewer behind an explicit `Flow` presentation, replace the placement repairs
with a proper horizontal-placement pass, and run an author/stakeholder review.

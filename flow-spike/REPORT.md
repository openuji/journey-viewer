# Flow-chart spike — report

Date: 2026-10-27. Data: the unchanged Solid-OIDC sample (10 journeys, 47 states, 120
transitions, 20 entries, 24 exits, 37 screens) plus four existing viewer and ujg-jsonld test
fixtures for UJG cases the sample lacks. Reference: ebremer/lws-ujg `web/flow.js` at `280beec`.

## Recommendation

**Keep the flow chart as an optional third view beside Tree and Columns, built on this spike's
composition model, and lay it out with the spike's own engine rather than elkjs:**

- An open composite's card becomes its frame's heading, so each open journey has one border, and
  contracts sit on borders. A journey path names where you are.
- Connectors share metro-style corridors at rest; activating a step draws its own routes.
- One interaction state is shared with Tree and Columns.

The decisive fix for the reference's line artifacts is the per-level composer, not the choice of
engine. In metro mode the own engine draws less ink than ELK once IdP or a consent journey is open
(23% less fully open) and 2–11% more in the MFA scopes, with a fraction of ELK's crossings and no
kinks. It also keeps contracts on borders and the card at the frame's corner, holds sibling order
when a composite opens, and stays synchronous and 3–5× faster with composites open, without a
1.6 MB dependency. ELK still draws fewer distinct line runs.

Five iterations shaped this:

1. **Strict routing:** every connector kept its own line, with no shared segments.
2. **Metro corridors, at your direction:** parallel vertical runs merge into one trunk, each
   channel between layers uses one horizontal bus, and hover, focus or selection reveals how a step
   connects. Once composites are open, this cut drawn ink by 35–41% and crossings by 88–96%, and it
   removed the remaining kinks.
3. **Route legibility, from your review of iteration 2:**
   - The rest network has no arrowheads; arrowheads appear only on the active step's routes, where
     each one arrives.
   - Arrivals (teal) and departures (violet) were drawn 1px to either side of a shared corridor
     (replaced in iteration 4).
   - An active entry or exit also lights the parent connectors at its port, so an exit shows who
     takes it.
4. **Line handling, from your review of iteration 3:**
   - Each state and composite has one contact point per side: the centre of its top and bottom
     edges. Returns no longer use inset ports, and snapping no longer nudges contact points, so
     every connector end at a block is at its centre (unit tested, all 11 scopes).
   - An active route is 2.4px on the corridor's centre line, so a lone line meets its glyph or block
     at the centre (an exit's departure, `flow-hover-exit-denied-1440.png`).
   - Only where an arrival and a departure share a stretch does it split into two halves within the
     same 2.4px. Their arrowheads there are half-arrowheads on their route's half
     (`flow-hover-access-denied-collapsed-1440.png`, `route-overlay.png`), and every line ends at its
     arrowhead's base so the head reads as a point. Routes meeting at one point from one direction
     share one arrowhead.
   - **Correction after your review:** the first version put arrivals right/down and departures
     left/up by screen direction. On a line that turns both ways, the halves swapped sides at each
     corner and crossed. Now each route keeps a constant side relative to its own travel, drawn as a
     true parallel. Each stretch between junctions decides which half the arrival takes, so the two
     directions are always on opposite halves. The stretches are then oriented to leave the fewest
     crossings. Checked on all 570 activations in the 11 scopes: no arrival and departure ever share
     a half, and none cross along a line. 32 crossings and 10 half switches remain, all at junctions
     where one direction branches off while the other continues. Two halves cannot always pass there,
     and a brute-force search over every choice of halves finds no fewer.
   - The rest network is unchanged. The active ink is a pure pass over the composed connectors
     (`src/layout/strokes.ts`) drawn by one overlay (`RouteOverlay`); `Connector` is the resting line
     only.
5. **One border and a journey path, from your review of iteration 4:**
   - An open composite's card (and a root journey's) is its frame's heading: title, caption and
     toggle in the same place, without a box. The frame's single neutral hairline is the
     composite's border; frame borders no longer carry a touchpoint tint. On a heading, selection
     and relations show as the state node's 3px stripe.
   - The active journey's frame and every frame inside it are paper; the frames around it sit on the
     ground. The ground is the darkest step allowed, because connectors measure 3.02:1 on it in
     light (`flow-context-path-1440.png`, `-dark`).
   - The context strip became the journey path, always above the canvas. It starts with the root
     journey; opening a composite extends it, and closing one hands the active journey to its
     parent. Choosing an earlier step closes what is open inside that journey and brings it to the
     top-left corner (24px, `flow-context-returned-1440.png`); the active journey's own step only
     scrolls. Keyboard focus follows to the heading, which is announced as the current journey.
   - One reducer (`src/model/disclosure.ts`) changes what is open and marks the node the user is
     at: the last one clicked, expanded or returned to. The path is read each render as the
     rendered frames that show that node (`frameShows`); the frames inside the last one are paper.
     Unit tested on the sample and the reuse, recursion and sibling fixtures; the viewer snapshot
     is unchanged. Closing inside a journey is a pure transition over `expandedJourneys`. Expansion follows journey identity, so
     other occurrences of those journeys close too, as with their own toggles. Geometry is
     unchanged: `metrics.json` differs only in timings.

## Before and after, on the same data

The reference viewer was served locally with the Solid-OIDC JSON-LD in place of its LWS data:
`evidence/reference-flow-collapsed-1440.png`, `reference-flow-errors-1440.png`,
`reference-flow-idp-open-1440.png`. It hides tag-matched error and recovery paths by default.
This spike always draws every transition.

| Your point | Reference on Solid-OIDC | Spike |
| --- | --- | --- |
| 1. Several lines between one pair of blocks | Five lines Sign-in required → IdP card; six Login → MFA | One connector per pair of terminals, and parallel connectors share corridors. Pointing at a step (or focusing or selecting it) draws its own routes in the relation colours; `×N` shows on those routes at Spec detail. Every transition is in exactly one bundle (unit tested, all 11 scopes). |
| 2. Disclosure loses overview and identity | Opening re-fits the view; the open frame has a small `▾` header unlike the card | The card's content heads the open frame in the same place, toggle included, with the frame's hairline as its one border. The card stays on screen within 0.5px on collapse, expand and nested expand. The journey path above the canvas names the open journeys down to the active one, which is paper while its context recedes; an earlier step returns there and closes what is open inside it. |
| 3. Line artifacts | Diagonal joins across hierarchy levels, lines through group headers | No diagonals, kinks, lines through blocks or off-port frame crossings in any scope, in Node and in the browser. |
| 4. Entries/exits look like states | Green ▶ and violet ⇥ pills, sized like states | Statechart glyphs on frame borders: an entry circle (filled = default) on the top border, an exit ring with a centre on the bottom border, plain captions. |

Captures:

- Flow view: `flow-collapsed-1440.png`, `flow-idp-open-1440.png` (also `-dark`, `1099`, `375`),
  `flow-idp-open-hover-1440.png` (activation), `flow-mfa-open-anchored-1440.png`,
  `flow-context-path-1440.png` (also `-dark`), `flow-context-returned-1440.png`,
  `flow-everything-open-spec-1440.png`,
  `flow-everything-open-fit-1440.png`.
- Activation of the review cases: `flow-hover-access-denied-collapsed-1440.png`,
  `flow-hover-access-denied-open-1440.png`, `flow-hover-account-recovery-1440.png`,
  `flow-hover-login-1440.png`, `flow-hover-exit-denied-1440.png`, `flow-hover-exit-1440.png`,
  `flow-hover-mfa-choice-1440.png`.
- Primitive studies: `card-both-states.png`, `contracts-entries.png`, `contracts-exits.png`,
  `connectors.png`, `route-overlay.png`, `key-spec.png`.

## Point 3: own engine or elkjs

Both engines get identical input from the same composer: one journey level at a time, with open
composites as fixed boxes with fixed ports, and bundled connectors. "Ink" is the drawn line length
with shared segments counted once; "runs" are distinct straight runs. Raw numbers are in
`evidence/metrics.json` (estimator text metrics, Node, median of 7 warm runs).

| Scope | Own, metro: ink / runs / crossings / kinks / ms | ELK, merged edges: ink / runs / crossings / kinks / ms | ELK, unmerged: ink / runs / crossings |
| --- | --- | --- | --- |
| All collapsed | 1,278 / 22 / 0 / 0 / 0.4 | 1,175 / 14 / 0 / 0 / 6.4 | 1,141 / 28 / 1 |
| IdP open | 9,349 / 78 / 3 / 0 / 9.9 | 10,436 / 63 / 5 / 0 / 28.7 | 20,151 / 150 / 49 |
| IdP + identity consent | 11,588 / 90 / 4 / 0 / 9.5 | 13,516 / 73 / 10 / 0 / 30.4 | 29,124 / 170 / 50 |
| IdP + resource consent | 14,860 / 102 / 3 / 0 / 9.5 | 18,790 / 83 / 15 / 0 / 33.1 | 34,977 / 181 / 62 |
| IdP + MFA | 25,032 / 132 / 5 / 0 / 14.3 | 23,012 / 110 / 32 / 1 / 45.8 | 52,421 / 278 / 87 |
| IdP + MFA + one channel (5 scopes) | 27,346–28,738 / 131–138 / 4–7 / 0 / ~13 | 25,839–28,069 / 114–123 / 26–36 / 1–3 / ~43 | ~61,000 / ~280 / 84–87 |
| All open | 43,630 / 198 / 5 / 0 / 13.4 | 56,880 / 186 / 82 / 2 / 67.1 | 82,003 / 332 / 93 |

Iteration 4's single contact points changed these numbers only slightly, all in the own engine's
favour: fully open, ink 43,701 → 43,630, runs 205 → 198, crossings 6 → 5; IdP open, crossings
6 → 3.

What the numbers show:

- **Line economy.** Corridors and one bus per channel give the own engine less ink than ELK with IdP
  or a consent journey open (10–21% less) and fully open (23% less). It draws 2–11% more in the six
  MFA scopes and 9% more fully collapsed, and 6–24% more distinct runs than ELK in opened scopes.
- **Crossings.** 3–7 in every opened scope against ELK's 5–82: lines that share a bus do not cross
  each other.
- **Kinks.** None in any scope. ELK merged has up to 3; ELK unmerged up to 9.
- **Control.** ELK puts entries in a first layer below the card instead of on the border, so the
  parent's arrows end at the frame edge while the glyphs sit lower
  (`engines-idp-open-1440.png`). The own engine pins the card to the corner and keeps sibling order
  when a composite opens (tested).
- **Cost.** The own engine is synchronous and deterministic, at 0.5–14 ms per layout against
  7–71 ms. Its layout source is about 2.0k formatted lines; ELK adds 1.6 MB (`elk.bundled.js`).

Since Stage 13 the own engine is a separate library, `@journey-viewer/flow-layout`
(`packages/flow-layout`). Its drawn sizes and spacing are options, and it is tested clean for corner
radii 2–20. Current numbers are in `evidence/metrics.json` and the Stage-13 evidence in `PLAN.md`;
the table above is from iteration 4.

"Kink" means an interior step under 16px that is not part of a longer line another connector also
draws. Shorter steps become S-curves once corners are rounded (6px), which is what read as kinks
in the reference.

## UJG scope fit

- **Boundaries follow the Editor's Draft.** `toEntryRef` lands on its entry port. An arrival
  without one uses the single child's `defaultEntryRef` (16 OIDC transitions, hollow arrowhead at
  Spec detail) or else the composite's card. Entries are never inferred from order. `fromExitRef`
  leaves from its exit port.
- **Recursion** stops with a marker on the card and no toggle (viewer `hierarchy` fixture).
- **Several child journeys** of one composite open as sibling frames with no edges between them
  (`screens` fixture); their ports lie on the composite's border.
- **Childless composites** have no toggle; **outgoing navigation** is a count marker on its state,
  never an edge (ujg-jsonld `minimal` fixture).
- **Shared state.** Tree, Columns and Flow use one `ViewerSnapshot`: a selection in the Tree is the
  selected Flow node, IdP stays open, and returning keeps it (browser check). Selecting a closed
  composite opens it, exactly as in the Tree; disclosure is never restricted.
- Canonical objects are kept by reference and no topology is invented. Not evaluated: multiple root
  journeys with cross-root reuse at scale, commands, multi-instance states, imports.

## Detail levels and activation

- **Stakeholder detail** shows the flow, screen access (all 37 screens open in the public
  lightbox) and a compact step card without identifiers or tags; "Leads to" is grouped by
  destination.
- **Spec detail** adds `×N` counts on the active step's routes, default-entry marks,
  outgoing-navigation markers and the full public inspector.
- **Switching detail** changes presentation only: node geometry is identical across the switch
  (browser check).
- **Activation** (hover or keyboard focus) is presentation state, never stored in the snapshot.
  Selection keeps its own look while another step is active. Evidence:
  `flow-hover-access-denied-collapsed-1440.png` and `-open-` (an arrival and a return on one line,
  as halves with half-arrowheads), `flow-hover-account-recovery-1440.png` and
  `flow-hover-login-1440.png` (one contact point per side), `flow-hover-exit-denied-1440.png` and
  `flow-hover-exit-1440.png` (arrivals into an exit and the parent continuation, centred on the
  glyph), `flow-hover-mfa-choice-1440.png` (departures and returns sharing a bus).

## Styling conformance (Impeccable)

PRODUCT.md and DESIGN.md ("The Quiet Map") were written from the design system before any UI
code, and every colour comes from `--jv-*` tokens in light and dark. One spike-local value,
`--flow-connector` (the `subtle` token mixed 80% with `surface`), keeps meaningful lines at 3.25:1
against paper in light and 4.98:1 in dark (WCAG 1.4.11 asks 3:1). The design system's
`border-strong` (1.78:1 in light) and the reference's `#a3a9b6` (2.36:1) fall short. Proposed
token: `color.connector`.

**Critique** (two isolated assessments, snapshot in `.impeccable/critique/`, taken before metro
mode): 24/40, "Acceptable".

- It found the design specific to this product while collapsed, and open frames a line web.
- The detector found nothing in `src`.
- The browser overlay flagged Inter as overused, which is the design system's own face, and a flat
  type hierarchy, which was a false positive from hidden SVG tooltips.

**Polish**, from its P1/P2 findings:

- Unrelated connectors rest at 1px in the same colour; the active routes are 2.4px in the relation
  colours (since iteration 4).
- Blocks render in reading order, so Tab follows the flow.
- Clicking a connector selects where it starts.
- `×N` and `↗N` use the 12px caption token.
- A Key lists only the marks visible at the current detail.
- Exits became a ring with a centre, because ⊗ read as failure on "IdP auth success".
- The card toggle is the tree's chevron at a 30px target.
- The closed card's stacked edge, which read as a hard offset shadow, was removed.

Metro corridors then addressed the critique's main finding, the line web.

**Audit** after polish: 15/20, "Good". Detector clean, no colour literals, axe clean on eight
page/theme combinations (re-checked after iteration 4, including the route overlay story), focus
visible (5.9:1 light, 8.3:1 dark), all text at least 4.5:1.

| Dimension | Score | Key finding |
| --- | --- | --- |
| Accessibility | 3 | Connections are announced only through the inspector's lists; no arrow-key traversal along the flow |
| Performance | 3 | Layout 0.5–14 ms, re-run only on document or expansion change; ELK stays out of the canvas bundle |
| Theming | 4 | Tokens only; dark theme verified; one documented spike-local mix |
| Responsive | 2 | No page overflow at 375px, but the toolbar wraps to three rows; diagram reading on phones is not established |
| Implementation integrity | 3 | Coherent, product-specific grammar |

Open items:

- P2: arrow-key traversal and screen-reader exposure of connections.
- P2: a compact toolbar under 768px.
- P3: a legibility floor or structural mode for Fit.
- P3: contract buttons are 22px tall, so they pass WCAG 2.5.8 by spacing, not size.

**Iteration 5** (two isolated assessments again, on the changed surface): 20/40, "Acceptable".
The detector found nothing; the overlay again flagged Inter only. Your decisions on its findings:

- P1, returning collapsed even from the active journey's own step (10 frames to 1 in the
  everything-open story): that step now only scrolls; earlier steps close what is open inside, as
  asked.
- P1, the active tone measures only 1.07:1 in light and 1.12:1 in dark: kept as tone only; the
  journey path names the active journey.
- P2, keyboard and screen reader: focus now follows a returned-to journey's heading, and the active
  journey's heading is described as the current journey.
- P2, opening a composite keeps its card in place, so a large frame can run off screen: kept (the
  0.5px gate).
- P2, the journey path at 375px wraps line by line with 22px targets: deferred.

Audit after polish: 18/20, "Excellent". Detector clean, no colour literals, axe clean on the same
eight combinations. Light-mode connector contrast on the ground is 3.02:1, just above the floor.

| Dimension | Score | Key finding |
| --- | --- | --- |
| Accessibility | 3 | The active journey is named by the path and announced on its heading; path targets are 22px |
| Performance | 4 | The path is a walk over the scene per render; layout still re-runs only on expansion |
| Theming | 4 | Tokens only; no new spike-local value (outside frames use the ground token) |
| Responsive | 3 | The path wraps on phones, below the 44px mobile target |
| Implementation integrity | 4 | One border per open journey, matching DESIGN.md |

## Limits

- **Shared corridors are ambiguous at rest by design**, and the rest network carries no arrowheads.
  Which line leads where, and in which direction, is read by activating a step; touch devices
  activate by tapping (selection), not hovering.
- **Halves are thin.** A shared stretch gives each direction 1.2px, one device pixel at 1×
  (measured in `route-overlay.png`); half-arrowheads reach 4.4px to one side. They read clearly at
  2× and above; at 1× the two-colour band is legible but small.
- **Junction crossings.** Where one direction branches off a shared stretch while the other
  continues, a 1.2px half may have to cross the other half. These crossings are minimised and
  occur in 30 of 570 activations (32 crossings), plus 10 places where a route switches halves.
- **Fit.** The full disclosure fits only at 36% scale on a 1440px viewport; readable work happens at
  100% with scrolling and the journey path. Mobile diagram use is not claimed; Tree and Columns
  stay the mobile reading views.
- **No user study.** Comprehension and speed benefits are not measured.
- **Size.** `src` is about 6.4k lines including stories and styles (plan estimate: 2.6k).

## Next step, if taken forward

A separately scoped stage would:

1. Move the primitives into the design system.
2. Move the projection and composer into the viewer behind an explicit `Flow` presentation.
3. Add keyboard traversal along routes.
4. Run an author and stakeholder review.
